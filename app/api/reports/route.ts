import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TimeLog from '@/models/TimeLog';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // YYYY-MM

        if (!month) {
            return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 });
        }

        const startOfMonth = `${month}-01`;
        // Simple way to get end of month by going to next month then back
        const [year, monthNum] = month.split('-').map(Number);
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endOfMonth = `${month}-${lastDay}`;

        const logs = await TimeLog.find({
            dateString: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Aggregation Logic
        const stats: Record<string, { userName: string, totalMinutes: number, daysWorked: Set<string> }> = {};

        logs.forEach(log => {
            if (!stats[log.userId]) {
                stats[log.userId] = {
                    userName: log.userName || 'Unknown',
                    totalMinutes: 0,
                    daysWorked: new Set()
                };
            }
            if (log.duration) {
                stats[log.userId].totalMinutes += log.duration;
            }
            stats[log.userId].daysWorked.add(log.dateString);
        });

        const report = Object.entries(stats).map(([userId, data]) => ({
            userId,
            userName: data.userName,
            totalMinutes: data.totalMinutes,
            totalHours: Math.round((data.totalMinutes / 60) * 10) / 10, // Round to 1 decimal
            daysWorked: data.daysWorked.size
        }));

        return NextResponse.json(report);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
