'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isSameDay } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Calendar as CalendarIcon, ArrowLeft, RefreshCw, Key, Edit2, Save, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import GHLSyncButton from './GHLSyncButton';
import DailyGanttModal from './DailyGanttModal';

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
    const { user } = useAuth();
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [users, setUsers] = useState<{ userId: string, userName: string }[]>([]);
    const [loading, setLoading] = useState(true);
    // Default to today so Gantt is always visible
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Quick Edit state
    const [isEditingMe, setIsEditingMe] = useState(false);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [isOffDay, setIsOffDay] = useState(false);
    const [saving, setSaving] = useState(false);

    const daysOfWeek = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    });

    useEffect(() => {
        // Fetch if we have any ID or if we are an admin (can see all)
        if (user?.userId) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [currentWeekStart, user?.userId, user?.locationId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const start = format(daysOfWeek[0], 'yyyy-MM-dd');
            const end = format(daysOfWeek[6], 'yyyy-MM-dd');
            const locId = user?.locationId || '';

            const [usersRes, schedRes] = await Promise.all([
                fetch(`/api/users?locationId=${locId}`),
                fetch(`/api/schedule?mode=all&start=${start}&end=${end}&locationId=${locId}`)
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (schedRes.ok) setSchedules(await schedRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDate && user?.userId) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const mySched = schedules.find(s => s.userId === user.userId && s.dateString === dateStr);
            if (mySched) {
                setStartTime(mySched.startTime);
                setEndTime(mySched.endTime);
                setIsOffDay(mySched.isOffDay);
            } else {
                const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
                setStartTime('09:00');
                setEndTime('17:00');
                setIsOffDay(isWeekend);
            }
        }
    }, [selectedDate, schedules, user?.userId]);

    const handleQuickSave = async () => {
        if (!user?.userId || !selectedDate) return;
        setSaving(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    userName: user.userName,
                    role: user.role === 'admin' ? 'admin' : 'user',
                    dateString: dateStr,
                    startTime,
                    endTime,
                    isOffDay,
                    locationId: user.locationId
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setSchedules(prev => {
                    const filtered = prev.filter(s => !(s.userId === user.userId && s.dateString === dateStr));
                    return [...filtered, updated];
                });
                setIsEditingMe(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };
    const scheduleMap: Record<string, Record<string, Schedule>> = {};
    schedules.forEach(s => {
        if (!scheduleMap[s.userId]) scheduleMap[s.userId] = {};
        scheduleMap[s.userId][s.dateString] = s;
    });

    const getSchedulesForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return users.map(u => {
            const definedSched = scheduleMap[u.userId]?.[dateStr];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            let isOffDay = isWeekend;
            let startTime = '09:00';
            let endTime = '17:00';

            if (definedSched) {
                isOffDay = definedSched.isOffDay;
                startTime = definedSched.startTime;
                endTime = definedSched.endTime;
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

                {/* ── Header ── */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-zinc-500" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                    Calendar Echipă
                                </h2>
                                <p className="text-sm text-zinc-500">Vizualizare săptămânală + suprapunere</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {(user?.isOwner || user?.role === 'admin') && <GHLSyncButton />}
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))}
                                    className="px-3 py-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all text-sm font-medium"
                                >‹</button>
                                <span className="px-4 font-mono text-sm font-medium flex items-center">
                                    {format(currentWeekStart, 'd MMM', { locale: ro })} – {format(daysOfWeek[6], 'd MMM', { locale: ro })}
                                </span>
                                <button
                                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                                    className="px-3 py-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-all text-sm font-medium"
                                >›</button>
                            </div>
                        </div>
                    </div>

                    {/* ── Weekly Table ── */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                    <th className="p-4 text-left font-medium text-zinc-500 min-w-[180px] sticky left-0 bg-white dark:bg-zinc-900 z-10">
                                        Membru Echipă
                                    </th>
                                    {daysOfWeek.map(day => {
                                        const isSelected = isSameDay(day, selectedDate);
                                        const isToday = isSameDay(day, new Date());
                                        return (
                                            <th key={day.toString()} className={`p-2 font-medium text-center min-w-[120px] ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                <button
                                                    onClick={() => setSelectedDate(day)}
                                                    className={`flex flex-col items-center justify-center w-full rounded-xl p-2 transition-all ${isSelected
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                        }`}
                                                    title="Selectează ziua pentru a vedea bara de ore"
                                                >
                                                    <div className={`text-xs uppercase ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`}>
                                                        {format(day, 'EEE', { locale: ro })}
                                                    </div>
                                                    <div className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                                        {format(day, 'd')}
                                                    </div>
                                                    {isToday && !isSelected && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-0.5" />
                                                    )}
                                                </button>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {loading && (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-zinc-400">
                                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            Se încarcă...
                                        </td>
                                    </tr>
                                )}
                                {!loading && users.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                    <Key className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <p className="font-semibold text-zinc-700 dark:text-zinc-300">Niciun utilizator sincronizat</p>
                                                <p className="text-sm text-zinc-400">Reveniți la dashboard și sincronizați echipa GHL.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && users.map(u => (
                                    <tr key={u.userId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-4 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{u.userName}</div>
                                        </td>
                                        {daysOfWeek.map(day => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const sched = scheduleMap[u.userId]?.[dateStr];
                                            const isToday = isSameDay(day, new Date());
                                            const isSelected = isSameDay(day, selectedDate);

                                            return (
                                                <td
                                                    key={dateStr}
                                                    className={`p-2 text-center align-top h-16 cursor-pointer ${isToday ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''} ${isSelected ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                                    onClick={() => setSelectedDate(day)}
                                                >
                                                    {sched ? (
                                                        sched.isOffDay ? (
                                                            <div className="w-full h-full min-h-[40px] rounded-lg bg-red-100/60 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 flex items-center justify-center">
                                                                <span className="text-red-500 dark:text-red-400 text-xs font-medium">Liber</span>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full min-h-[40px] rounded-lg bg-emerald-100/60 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 p-1.5 flex flex-col justify-center items-center relative overflow-hidden">
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-lg" />
                                                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">{sched.startTime}</span>
                                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{sched.endTime}</span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center opacity-40">
                                                            <span className="text-zinc-300 text-xs">–</span>
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

                {/* ── Gantt Bar — PERMANENT, default today, changes on day click ── */}
                {users.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                        <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                                <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                                    Suprapunere ore — {format(selectedDate, 'EEEE, d MMMM', { locale: ro })}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {!isEditingMe ? (
                                    <button
                                        onClick={() => setIsEditingMe(true)}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        Modifică Programul Meu
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                disabled={isOffDay}
                                                className="bg-transparent border-none text-[10px] p-0 w-16 focus:ring-0 text-center font-bold"
                                            />
                                            <span className="text-[10px] opacity-30">–</span>
                                            <input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                disabled={isOffDay}
                                                className="bg-transparent border-none text-[10px] p-0 w-16 focus:ring-0 text-center font-bold"
                                            />
                                        </div>
                                        <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isOffDay}
                                                onChange={(e) => setIsOffDay(e.target.checked)}
                                                className="w-3 h-3 rounded"
                                            />
                                            Liber
                                        </label>
                                        <button
                                            onClick={handleQuickSave}
                                            disabled={saving}
                                            className="p-1 px-2 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvează'}
                                        </button>
                                        <button
                                            onClick={() => setIsEditingMe(false)}
                                            className="p-1 text-zinc-400 hover:text-zinc-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                <span className="text-[10px] text-zinc-400 border-l border-zinc-200 dark:border-zinc-800 pl-3 ml-1">
                                    Click zi în table pentru schimbare
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            <DailyGanttModal
                                isOpen={true}
                                onClose={() => { }}
                                date={selectedDate}
                                schedules={getSchedulesForDate(selectedDate)}
                                isInline={true}
                            />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
