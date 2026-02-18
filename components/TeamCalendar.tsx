'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isSameDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Calendar as CalendarIcon, ArrowLeft, MousePointerClick } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DailyGanttModal from './DailyGanttModal';

interface Schedule {
    userId: string;
    userName: string;
    dateString: string;
    startTime: string;
    endTime: string;
    isOffDay: boolean;
}

import { useAuth } from './AuthProvider'; // Ensure this import exists
import GHLSyncButton from './GHLSyncButton';

// ... imports

export default function TeamCalendar() {
    const router = useRouter();
    const { user } = useAuth(); // Get user for locationId
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [users, setUsers] = useState<{ userId: string, userName: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const daysOfWeek = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    });

    useEffect(() => {
        if (user?.locationId) {
            fetchData();
        }
    }, [currentWeekStart, user?.locationId]);

    const fetchData = async () => {
        if (!user?.locationId) return;

        setLoading(true);
        try {
            const start = format(daysOfWeek[0], 'yyyy-MM-dd');
            const end = format(daysOfWeek[6], 'yyyy-MM-dd');

            // Parallel fetch: Users (filtered by location) and Schedules (filtered by location)
            const [usersRes, schedRes] = await Promise.all([
                fetch(`/api/users?locationId=${user.locationId}`),
                fetch(`/api/schedule?mode=all&start=${start}&end=${end}&locationId=${user.locationId}`)
            ]);

            if (usersRes.ok) {
                const uData = await usersRes.json();
                setUsers(uData);
            }
            if (schedRes.ok) {
                const sData = await schedRes.json();
                setSchedules(sData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Index schedules for fast lookup: userId -> dateString -> Schedule
    const scheduleMap: Record<string, Record<string, Schedule>> = {};
    schedules.forEach(s => {
        if (!scheduleMap[s.userId]) scheduleMap[s.userId] = {};
        scheduleMap[s.userId][s.dateString] = s;
    });

    const getSchedulesForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return users.map(u => {
            const definedSched = scheduleMap[u.userId]?.[dateStr];

            // Logic:
            // 1. If schedule defined in DB, obey it.
            // 2. If not defined:
            //    - Weekend (Sat/Sun) -> Default OFF
            //    - Weekday (Mon-Fri) -> Default ON (Working)

            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            let isOffDay = false;
            let startTime = '09:00'; // Defaults
            let endTime = '17:00';

            if (definedSched) {
                isOffDay = definedSched.isOffDay;
                startTime = definedSched.startTime;
                endTime = definedSched.endTime;
            } else {
                // No schedule, apply defaults
                isOffDay = isWeekend; // True if Sat/Sun, False if Mon-Fri
            }

            return {
                userId: u.userId,
                userName: u.userName,
                startTime: isOffDay ? '-' : startTime,
                endTime: isOffDay ? '-' : endTime,
                isOffDay
            };
        });
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
            <div className="max-w-[95%] mx-auto space-y-6">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-zinc-500" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                    Calendar Echipa
                                </h2>
                                <p className="text-sm text-zinc-500">Vizualizare de ansamblu</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Sync Button straight in the calendar view for Owners AND Admins */}
                            {(user?.isOwner || user?.role === 'admin') ? (
                                <GHLSyncButton />
                            ) : (
                                <span className="text-[10px] text-zinc-400 bg-zinc-100 p-1 rounded border">
                                    Role: {user?.role || 'none'} | Owner: {user?.isOwner ? 'Yes' : 'No'}
                                </span>
                            )}

                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))}
                                    className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all shadow-sm"
                                >
                                    &lt;
                                </button>
                                <span className="px-4 font-mono text-sm font-medium flex items-center">
                                    {format(currentWeekStart, 'd MMM', { locale: ro })} - {format(daysOfWeek[6], 'd MMM', { locale: ro })}
                                </span>
                                <button
                                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                                    className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all shadow-sm"
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                    <th className="p-4 text-left font-medium text-zinc-500 min-w-[200px] sticky left-0 bg-white dark:bg-zinc-900 z-10">Membru Echipa</th>
                                    {daysOfWeek.map(day => (
                                        <th key={day.toString()} className={`p-4 font-medium text-center min-w-[140px] ${isSameDay(day, new Date()) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <button
                                                onClick={() => setSelectedDate(day)}
                                                className="group flex flex-col items-center justify-center w-full hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg p-2 transition-colors"
                                                title="Vezi grafic suprapunere"
                                            >
                                                <div className="text-xs uppercase text-zinc-400 group-hover:text-indigo-600 transition-colors">{format(day, 'EEE', { locale: ro })}</div>
                                                <div className="text-lg text-zinc-800 dark:text-zinc-200 group-hover:scale-110 transition-transform">{format(day, 'd')}</div>
                                                <MousePointerClick className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-zinc-400">
                                            Nu exista utilizatori inregistrati.
                                        </td>
                                    </tr>
                                )}
                                {users.map(user => (
                                    <tr key={user.userId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-4 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                {user.userName}
                                            </div>
                                        </td>
                                        {daysOfWeek.map(day => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const sched = scheduleMap[user.userId]?.[dateStr];
                                            const isToday = isSameDay(day, new Date());

                                            return (
                                                <td key={dateStr} className={`p-2 text-center align-top h-20 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}>
                                                    {sched ? (
                                                        sched.isOffDay ? (
                                                            <div className="w-full h-full min-h-[48px] rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 flex items-center justify-center">
                                                                <span className="text-red-600 dark:text-red-400 text-xs font-medium">Liber</span>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full min-h-[48px] rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 p-2 flex flex-col justify-center items-center shadow-sm relative overflow-hidden group">
                                                                {/* Visual Progress Bar look */}
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-lg"></div>

                                                                <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{sched.startTime}</span>
                                                                <span className="text-xs text-emerald-600 dark:text-emerald-400">{sched.endTime}</span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full min-h-[48px] rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center opacity-50">
                                                            <span className="text-zinc-300 text-xs">-</span>
                                                        </div>
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

                {selectedDate && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-300">
                        <DailyGanttModal // Using the same component but I will rename/refactor it in a moment.
                            isOpen={true} // Always "open" if rendered
                            onClose={() => setSelectedDate(null)}
                            date={selectedDate}
                            schedules={getSchedulesForDate(selectedDate)}
                            isInline={true} // Adding a prop to handle inline styling
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
