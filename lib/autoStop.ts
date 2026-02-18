import dbConnect from './mongodb';
import TimeLog from '@/models/TimeLog';
import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export async function checkAutoStop() {
    await dbConnect();

    // Get current time in Romania
    const timeZone = 'Europe/Bucharest';
    const now = new Date();
    const romaniaTime = toZonedTime(now, timeZone);
    const todayString = format(romaniaTime, 'yyyy-MM-dd');

    // Find active logs that have a dateString NOT equal to today
    // meaning they started on a previous day and are still running
    const staleLogs = await TimeLog.find({
        isActive: true,
        dateString: { $ne: todayString }
    });

    if (staleLogs.length === 0) return;

    console.log(`Found ${staleLogs.length} stale logs to auto-stop.`);

    for (const log of staleLogs) {
        // Calculate 23:59:59 of the log's date
        // We assume log.dateString is YYYY-MM-DD
        const logDate = new Date(`${log.dateString}T23:59:59`);

        // Calculate duration in minutes from checkIn to 23:59:59
        const durationMs = logDate.getTime() - new Date(log.checkIn).getTime();
        const durationMinutes = Math.floor(durationMs / 1000 / 60);

        log.checkOut = logDate;
        log.duration = durationMinutes > 0 ? durationMinutes : 0;
        log.isActive = false;
        log.autoStopped = true;
        log.warningMessage = 'Sesiune uitată deschisă. Oprit automat la 23:59.';

        await log.save();
    }
}
