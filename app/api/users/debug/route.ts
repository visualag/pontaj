import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
    try {
        await dbConnect();
        const users = await User.find({}).sort({ locationId: 1, userName: 1 }).lean();

        // Group by locationId to see distribution
        const byLocation: Record<string, any[]> = {};
        for (const u of users) {
            const loc = String(u.locationId || 'NO_LOCATION');
            if (!byLocation[loc]) byLocation[loc] = [];
            byLocation[loc].push({
                userId: u.userId,
                userName: u.userName,
                email: u.email,
                role: u.role,
                locationId: u.locationId,
                lastSeen: u.lastSeen
            });
        }

        return NextResponse.json({
            totalUsers: users.length,
            locationIds: Object.keys(byLocation),
            byLocation
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
