import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { userId, userName, email, role } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { userName, email, role, lastSeen: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const users = await User.find().sort({ userName: 1 });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}
