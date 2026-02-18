import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TimeLog from '@/models/TimeLog';
import { checkAutoStop } from '@/lib/autoStop';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // Trigger lazy auto-stop check
        await checkAutoStop();

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const role = searchParams.get('role');
        const dateString = searchParams.get('date'); // Optional filter

        let query: any = {};

        // If not admin, restrict to userId. If admin, can see all or filter by specific userId.
        if (role !== 'admin') {
            if (!userId) {
                return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
            }
            query.userId = userId;
        } else {
            // Admin options
            if (userId) query.userId = userId;
        }

        if (dateString) {
            query.dateString = dateString;
        }

        // Default limit
        const logs = await TimeLog.find(query).sort({ createdAt: -1 }).limit(100);

        return NextResponse.json({ success: true, logs }, { status: 200 });
    } catch (error: any) {
        console.error('Fetch logs error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
