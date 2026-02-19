import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import LocationSettings from '@/models/LocationSettings';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const locationId = searchParams.get('locationId');

        if (!locationId) return NextResponse.json({ hasKey: false });

        const settings = await LocationSettings.findOne({ locationId });
        return NextResponse.json({ hasKey: !!settings?.apiKey });
    } catch (error) {
        return NextResponse.json({ hasKey: false });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        let { apiKey, locationId } = await request.json();

        if (!locationId) {
            return NextResponse.json({ error: 'Missing Location ID' }, { status: 400 });
        }

        // 1. If API Key provided, save/update it.
        if (apiKey) {
            await LocationSettings.findOneAndUpdate(
                { locationId },
                { apiKey: apiKey, updatedAt: new Date() },
                { upsert: true, new: true }
            );
        } else {
            // 2. If no API Key, try to load from DB
            const settings = await LocationSettings.findOne({ locationId });
            if (settings?.apiKey) {
                apiKey = settings.apiKey;
            } else {
                return NextResponse.json({ error: 'Missing API Key (None provided or saved)' }, { status: 400 });
            }
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

            // If 401, maybe key is invalid -> could remove it?
            // if (response.status === 401) ...

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

            // Check if user exists
            const existingUser = await User.findOne({ userId });

            if (!existingUser) {
                // New user
                await User.create({
                    userId,
                    userName,
                    email,
                    locationId, // Forces correct locationId
                    role: ghlUser.type === 'agency' || ghlUser.roles?.admin ? 'admin' : 'user', // Basic init
                    isOwner: false, // Never auto-assign owner via sync
                    lastSeen: new Date() // Mark as seen so they show up
                });
                stats.added++;
            } else {
                // Update basic info AND ensure locationId is set
                existingUser.userName = userName;
                existingUser.email = email;
                existingUser.locationId = locationId; // Force update location to match current sync
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

