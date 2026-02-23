'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isSameDay, startOfDay } from 'date-fns';
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
                setIsEditingMe(true);
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
                                                    onClick={() => {
                                                        setSelectedDate(day);
                                                        if (u.userId === user?.userId) {
                                                            setIsEditingMe(true);
                                                        }
                                                    }}
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

                {/* ── Gantt & Quick Edit — INTEGRATED ── */}
                {users.length > 0 && (
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                        Suprapunere ore — {format(selectedDate, 'EEEE, d MMMM', { locale: ro })}
                                    </span>
                                </div>
                                <span className="text-[10px] text-zinc-400 font-medium">Click pe o zi în tabel pentru a schimba data</span>
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

                        {/* Integrated Edit Form */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-6 flex flex-col">
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-indigo-500" />
                                Programul meu detaliat
                            </h3>
                            <p className="text-xs text-zinc-400 mb-6">Pentru {format(selectedDate, 'd MMMM', { locale: ro })}</p>

                            <div className="space-y-6 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pornire</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            disabled={isOffDay}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all p-3"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Oprire</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            disabled={isOffDay}
                                            className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all p-3"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600">
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${isOffDay ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={isOffDay}
                                            onChange={(e) => setIsOffDay(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isOffDay ? 'left-5' : 'left-1'}`} />
                                    </div>
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Zi Liberă / Concediu</span>
                                </label>
                            </div>

                            <button
                                onClick={handleQuickSave}
                                disabled={saving}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all mt-6"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Salvează Programul
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
