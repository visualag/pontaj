import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { userId, userName, email, locationId } = body;
        // NOTE: We intentionally do NOT take `role` from GHL URL params here.
        // Role is managed exclusively in our DB (via GHL Sync or manual assignment).
        // This prevents anyone from escalating their own role by manipulating URL params.

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
        }

        // Check if user exists in DB (was previously synced from GHL)
        const existingUser = await User.findOne({ userId });

        if (existingUser) {
            // User exists — update presence fields only, KEEP their existing role/isOwner
            existingUser.userName = userName || existingUser.userName;
            existingUser.email = email || existingUser.email;
            if (locationId) existingUser.locationId = locationId;
            existingUser.lastSeen = new Date();
            await existingUser.save();

            return NextResponse.json({
                success: true,
                user: {
                    userId: existingUser.userId,
                    userName: existingUser.userName,
                    email: existingUser.email,
                    role: existingUser.role,
                    isOwner: existingUser.isOwner,
                    locationId: existingUser.locationId
                }
            });
        } else {
            // New user — not yet synced from GHL. Create with role 'user' (safe default).
            // They will get proper role after admin runs GHL Sync.
            const newUser = await User.create({
                userId,
                userName: userName || 'Unknown',
                email: email || '',
                locationId: locationId || undefined,
                role: 'user',
                isOwner: false,
                lastSeen: new Date()
            });

            return NextResponse.json({
                success: true,
                user: {
                    userId: newUser.userId,
                    userName: newUser.userName,
                    email: newUser.email,
                    role: newUser.role,
                    isOwner: newUser.isOwner,
                    locationId: newUser.locationId
                }
            });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to sync user' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const locationId = searchParams.get('locationId');

        const query: any = {};
        const isPlaceholder = !locationId ||
            ['location', '{location.id}', '{{location.id}}', '{{ location.id }}', 'undefined', 'null', 'none', ''].includes(String(locationId).toLowerCase().trim());

        if (locationId && !isPlaceholder) {
            query.locationId = locationId.trim();
        }

        const users = await User.find(query).sort({ userName: 1 });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
