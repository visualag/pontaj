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

    const fetchData = async () => {
        if (!user?.userId) return;
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
        fetchData();
    }, [currentWeekStart, user?.userId, user?.locationId]);

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

        // Block past-date editing for EVERYONE
        const today = startOfDay(new Date());
        const targetDate = startOfDay(selectedDate);
        if (targetDate < today) {
            alert('Nu poți modifica programul pentru zilele trecute.');
            return;
        }

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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex flex-col gap-8">
            <div className="max-w-[95%] mx-auto w-full space-y-8 pb-20">

                {/* ── Header ── */}
                <header className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-1000" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <button onClick={() => router.push('/')} className="p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 rounded-2xl transition-all border border-zinc-200 dark:border-zinc-700">
                                <ArrowLeft className="w-5 h-5 text-zinc-500" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent italic tracking-tight uppercase">
                                    Calendar Echipă
                                </h1>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">Gestiune Program & Suprapuneri</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <GHLSyncButton onSyncComplete={fetchData} />
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-inner">
                                <button
                                    onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))}
                                    className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-sm font-black shadow-sm"
                                >‹</button>
                                <span className="px-6 font-black text-xs uppercase tracking-widest flex items-center text-zinc-600 dark:text-zinc-300">
                                    {format(currentWeekStart, 'd MMM', { locale: ro })} – {format(daysOfWeek[6], 'd MMM', { locale: ro })}
                                </span>
                                <button
                                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                                    className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-sm font-black shadow-sm"
                                >›</button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Weekly Table ── */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/50 dark:bg-zinc-800/20 text-left border-b border-zinc-100 dark:border-zinc-800 italic">
                                    <th className="p-7 font-black uppercase tracking-widest text-[10px] text-zinc-400 min-w-[220px] sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10 border-r border-zinc-100 dark:border-zinc-800">
                                        Membru Echipă
                                    </th>
                                    {daysOfWeek.map(day => {
                                        const isSelected = isSameDay(day, selectedDate);
                                        const isToday = isSameDay(day, new Date());
                                        return (
                                            <th key={day.toString()} className={`p-4 font-black text-center min-w-[140px] ${isToday ? 'bg-indigo-500/5 dark:bg-indigo-500/10' : ''}`}>
                                                <button
                                                    onClick={() => setSelectedDate(day)}
                                                    className={`flex flex-col items-center justify-center w-full rounded-2xl p-4 transition-all ${isSelected
                                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 transform scale-105 z-10'
                                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-white/50 dark:bg-zinc-900/50'
                                                        }`}
                                                >
                                                    <div className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`}>
                                                        {format(day, 'EEE', { locale: ro })}
                                                    </div>
                                                    <div className={`text-xl font-black ${isSelected ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                                        {format(day, 'd')}
                                                    </div>
                                                    {isToday && !isSelected && (
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shadow-glow" />
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
                                        <td colSpan={8} className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                                                <p className="font-black uppercase tracking-widest text-xs text-zinc-400 italic">Analizăm datele...</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && users.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-6 max-w-sm mx-auto opacity-50">
                                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                                                    <Key className="w-10 h-10 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Niciun membru sincronizat</h3>
                                                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Sincronizați echipa folosind butonul GHL</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && users.map(u => (
                                    <tr key={u.userId} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                        <td className="p-7 sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-zinc-100 dark:border-zinc-800 shadow-[5px_0_10px_rgba(0,0,0,0.01)] transition-colors group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/50">
                                            <div className="font-black text-zinc-900 dark:text-white text-sm tracking-tight group-hover:translate-x-1 transition-transform">{u.userName}</div>
                                        </td>
                                        {daysOfWeek.map(day => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const sched = scheduleMap[u.userId]?.[dateStr];
                                            const isToday = isSameDay(day, new Date());
                                            const isSelected = isSameDay(day, selectedDate);
                                            const isMySchedule = u.userId === user?.userId;

                                            return (
                                                <td
                                                    key={dateStr}
                                                    className={`p-4 text-center align-middle h-28 transition-all duration-300 ${isToday ? 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05]' : ''} ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                                                    onClick={() => {
                                                        setSelectedDate(day);
                                                        if (isMySchedule) setIsEditingMe(true);
                                                    }}
                                                >
                                                    <div className="cursor-pointer">
                                                        {sched ? (
                                                            sched.isOffDay ? (
                                                                <div className="w-full h-full min-h-[60px] rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                                    <span className="text-rose-500 font-black uppercase tracking-tighter text-[10px]">Liber</span>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full h-full min-h-[60px] rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-2.5 flex flex-col justify-center items-center relative overflow-hidden group-hover:scale-105 transition-transform shadow-sm">
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl" />
                                                                    <span className="text-sm font-black text-emerald-900 dark:text-emerald-100 tracking-tight leading-none mb-1">{sched.startTime}</span>
                                                                    <div className="w-full h-[1px] bg-emerald-200/50 dark:bg-emerald-800/50 my-1" />
                                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">{sched.endTime}</span>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className="w-full h-full min-h-[60px] rounded-2xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex items-center justify-center opacity-30 group-hover:opacity-100 transition-all duration-500">
                                                                <span className="text-zinc-400 text-[10px] font-black italic tracking-widest uppercase">gol</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Gantt & Quick Edit section ── */}
                {users.length > 0 && (
                    <div className="grid lg:grid-cols-3 gap-10 items-start">
                        {/* High-visibility Gantt Chart */}
                        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[3rem] shadow-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden group/gantt">
                            <header className="px-10 py-7 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-800/40">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-500/30 group-hover/gantt:rotate-2 transition-transform">
                                        <CalendarIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic italic">Vizualizare Suprapuneri</h2>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mt-0.5">{format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ro })}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 italic">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                    Suprapuneri identificate
                                </div>
                            </header>
                            <div className="p-10">
                                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-inner overflow-hidden min-h-[400px]">
                                    <DailyGanttModal
                                        isOpen={true}
                                        onClose={() => { }}
                                        date={selectedDate}
                                        schedules={getSchedulesForDate(selectedDate)}
                                        isInline={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Quick Edit — Personal control */}
                        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] shadow-xl border border-zinc-100 dark:border-zinc-800 p-10 flex flex-col relative overflow-hidden h-full min-h-[500px]">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="relative z-10 flex flex-col h-full">
                                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 italic tracking-tight uppercase">
                                    <Edit2 className="w-6 h-6 text-indigo-500 inline mr-2" />
                                    Programul Meu
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-10 pb-4 border-b border-zinc-50 dark:border-zinc-800 italic">
                                    Editează ziua de {format(selectedDate, 'd MMMM', { locale: ro })}
                                </p>

                                <div className="space-y-10 flex-1">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Check-in</label>
                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                disabled={isOffDay}
                                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl text-xl font-black focus:ring-4 focus:ring-indigo-500/10 transition-all p-6 shadow-sm text-center disabled:opacity-20"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Check-out</label>
                                            <input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                disabled={isOffDay}
                                                className="w-full bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 rounded-2xl text-xl font-black focus:ring-4 focus:ring-indigo-500/10 transition-all p-6 shadow-sm text-center disabled:opacity-20"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setIsOffDay(!isOffDay)}
                                        className={`w-full p-8 rounded-[2rem] cursor-pointer transition-all border-2 flex items-center justify-between group transform hover:-translate-y-1 ${isOffDay
                                            ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30 text-rose-600 shadow-rose-200/20 shadow-lg'
                                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-transparent text-zinc-500 hover:border-indigo-100 dark:hover:bg-indigo-900/20'}`}
                                    >
                                        <span className="text-xs font-black uppercase tracking-widest italic">Zi Liberă / Concediu</span>
                                        <div className={`w-14 h-8 rounded-full relative transition-all duration-500 shadow-inner ${isOffDay ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                                            <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all shadow-md ${isOffDay ? 'left-8' : 'left-1.5'}`} />
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={handleQuickSave}
                                    disabled={saving}
                                    className="w-full bg-indigo-600 hover:bg-black dark:hover:bg-white dark:hover:text-black text-white py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 shadow-[0_25px_50px_rgba(79,70,229,0.3)] hover:shadow-xl disabled:opacity-50 transition-all transform hover:-translate-y-2 active:translate-y-0 mt-auto"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-6 h-6" />}
                                    Salvează Programul
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
