import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const { apiKey, locationId } = await request.json();

        if (!apiKey || !locationId) {
            return NextResponse.json({ error: 'Missing API Key or Location ID' }, { status: 400 });
        }

        // Try GHL V1 API first (Standard Location API Key)
        console.log('Attempting GHL Sync with V1 for location:', locationId);

        const response = await fetch('https://rest.gohighlevel.com/v1/users/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GHL API Error:', response.status, errorText);
            return NextResponse.json({
                error: `GHL API failed: ${response.statusText}`,
                details: errorText
            }, { status: response.status });
        }

        const data = await response.json();
        // V1 usually returns { users: [...] } or just the array.
        // Let's handle both.
        const ghlUsers = data.users || (Array.isArray(data) ? data : []);

        if (!Array.isArray(ghlUsers)) {
            return NextResponse.json({ error: 'Unexpected GHL API response format' }, { status: 502 });
        }

        const stats = {
            total: ghlUsers.length,
            added: 0,
            updated: 0
        };

        for (const ghlUser of ghlUsers) {
            // Map GHL user to App user
            const userId = ghlUser.id;
            const userName = ghlUser.name || `${ghlUser.firstName} ${ghlUser.lastName}`;
            const email = ghlUser.email;

            // Determine role. GHL roles might be "admin" or "user".
            // We only want to set 'admin' if they are an admin in GHL, 
            // BUT we must be careful not to demote the Owner if they exist.
            // Safe bet: Default to 'user', let them be promoted manually in app, 
            // UNLESS they are new.
            // Actually, let's trust GHL role if provided? 
            // GHL user object has 'roles' object or 'type'. 
            // Simplify: Just sync identity. Leave role management to the app mostly, 
            // unless it's a new user.

            // Check if user exists
            const existingUser = await User.findOne({ userId });

            if (!existingUser) {
                // New user
                await User.create({
                    userId,
                    userName,
                    email,
                    locationId,
                    role: ghlUser.type === 'agency' || ghlUser.roles?.admin ? 'admin' : 'user', // Basic init
                    isOwner: false, // Never auto-assign owner via sync
                    lastSeen: new Date() // Mark as seen so they show up
                });
                stats.added++;
            } else {
                // Update basic info, do NOT touch roles/ownership
                existingUser.userName = userName;
                existingUser.email = email;
                // existingUser.locationId = locationId; // Ensure location is set?
                await existingUser.save();
                stats.updated++;
            }
        }

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
