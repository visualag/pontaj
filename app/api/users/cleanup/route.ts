import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const { locationId } = await request.json();

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
        }

        // Delete users with {{ in their name or email, or containing "test" (if appropriate)
        const result = await User.deleteMany({
            locationId,
            $or: [
                { userName: { $regex: /\{\{/ } },
                { userName: { $regex: /\}\}/ } },
                { email: { $regex: /\{\{/ } },
                { email: { $regex: /\}\}/ } }
            ]
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.deletedCount
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
