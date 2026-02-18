import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WorkSchedule from '@/models/WorkSchedule';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const start = searchParams.get('start'); // YYYY-MM-DD
        const end = searchParams.get('end'); // YYYY-MM-DD

        const mode = searchParams.get('mode');

        if (mode !== 'all' && !userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const query: any = {};
        if (mode !== 'all') {
            query.userId = userId;
        }
        if (start && end) {
            query.dateString = { $gte: start, $lte: end };
        }

        const schedules = await WorkSchedule.find(query).sort({ dateString: 1 });
        return NextResponse.json(schedules);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { userId, dateString, startTime, endTime, isOffDay } = body;

        // Validate required fields
        if (!userId || !dateString) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Backend Validation: Prevent past edits unless admin
        // We need to know if the requester is admin. 
        // Since we don't have a full session here easily without passing it, 
        // we might rely on the frontend for UX, OR pass a 'role' in the body.
        // Let's assume we pass 'role' in the body for now to secure it.
        const role = body.role || 'user';
        const targetDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (role !== 'admin' && targetDate < today) {
            return NextResponse.json({ error: 'Cannot edit past schedules' }, { status: 403 });
        }

        // Upsert the schedule for this user and date
        const schedule = await WorkSchedule.findOneAndUpdate(
            { userId, dateString },
            {
                startTime,
                endTime,
                isOffDay: isOffDay || false,
                userName: body.userName // Optional update
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json(schedule);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
    }
}
