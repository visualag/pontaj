import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { currentOwnerId, newOwnerId, locationId } = body;

        if (!currentOwnerId || !newOwnerId || !locationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Transaction-like logic (MongoDB Atlas supports transactions, but for simplicity we do sequential updates)
        // 1. Demote current owner to Admin
        await User.findOneAndUpdate(
            { userId: currentOwnerId, locationId },
            { isOwner: false, role: 'admin' }
        );

        // 2. Promote new owner
        const newOwner = await User.findOneAndUpdate(
            { userId: newOwnerId, locationId },
            { isOwner: true, role: 'admin' },
            { new: true }
        );

        return NextResponse.json({ success: true, newOwner });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 });
    }
}
