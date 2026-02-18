'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isSameDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Schedule {
    userId: string;
    userName: string;
    dateString: string;
    startTime: string;
    endTime: string;
    isOffDay: boolean;
}

export default function TeamCalendar() {
    const router = useRouter();
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    const daysOfWeek = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    });

    useEffect(() => {
        fetchSchedules();
    }, [currentWeekStart]);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const start = format(daysOfWeek[0], 'yyyy-MM-dd');
            const end = format(daysOfWeek[6], 'yyyy-MM-dd');
            // Fetch all schedules for this range
            const res = await fetch(`/api/schedule?mode=all&start=${start}&end=${end}`);
            if (res.ok) {
                const data = await res.json();
                setSchedules(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Group schedules by user
    const schedulesByUser: Record<string, { name: string, days: Record<string, Schedule> }> = {};

    schedules.forEach(s => {
        if (!schedulesByUser[s.userId]) {
            schedulesByUser[s.userId] = {
                name: s.userName || 'Unknown',
                days: {}
            };
        }
        schedulesByUser[s.userId].days[s.dateString] = s;
    });

    const userIds = Object.keys(schedulesByUser);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex items-center justify-between bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-zinc-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Calendar Echipa
                            </h1>
                            <p className="text-sm text-zinc-500">Vizualizare de ansamblu</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button
                            onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))}
                            className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all shadow-sm"
                        >
                            &lt;
                        </button>
                        <span className="px-4 font-mono text-sm font-medium">
                            {format(currentWeekStart, 'd MMM', { locale: ro })} - {format(daysOfWeek[6], 'd MMM', { locale: ro })}
                        </span>
                        <button
                            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                            className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all shadow-sm"
                        >
                            &gt;
                        </button>
                    </div>
                </header>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                <th className="p-4 text-left font-medium text-zinc-500 min-w-[200px]">Membru Echipa</th>
                                {daysOfWeek.map(day => (
                                    <th key={day.toString()} className={`p-4 font-medium text-center min-w-[120px] ${isSameDay(day, new Date()) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                        <div className="text-xs uppercase text-zinc-400">{format(day, 'EEE', { locale: ro })}</div>
                                        <div className="text-lg text-zinc-800 dark:text-zinc-200">{format(day, 'd')}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {userIds.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-zinc-400">
                                        Hopa! Nu exista inca niciun program setat pentru saptamana asta.
                                    </td>
                                </tr>
                            )}
                            {userIds.map(uid => (
                                <tr key={uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {schedulesByUser[uid].name}
                                        </div>
                                    </td>
                                    {daysOfWeek.map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const sched = schedulesByUser[uid].days[dateStr];
                                        const isToday = isSameDay(day, new Date());

                                        return (
                                            <td key={dateStr} className={`p-4 text-center ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
                                                {sched ? (
                                                    sched.isOffDay ? (
                                                        <span className="inline-block px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
                                                            Liber
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{sched.startTime}</span>
                                                            <span className="text-xs text-zinc-400">{sched.endTime}</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-zinc-300">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
