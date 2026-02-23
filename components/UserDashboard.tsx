'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Users, Settings } from 'lucide-react';
import ScheduleCalendar from './ScheduleCalendar';
import FirstRunSetup from './FirstRunSetup';
import DailyGanttModal from './DailyGanttModal';
import TimeLogPanel from './TimeLogPanel';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Schedule {
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    isOffDay: boolean;
}

export default function UserDashboard() {
    const { user, isAdmin } = useAuth();
    const [showSetup, setShowSetup] = useState(false);
    const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Fetch today's team schedule for the gantt bars
    useEffect(() => {
        if (!user?.locationId) return;
        setScheduleLoading(true);

        Promise.all([
            fetch(`/api/users?locationId=${user.locationId}`),
            fetch(`/api/schedule?mode=all&start=${todayStr}&end=${todayStr}&locationId=${user.locationId}`)
        ])
            .then(async ([usersRes, schedRes]) => {
                if (!usersRes.ok || !schedRes.ok) return;
                const users = await usersRes.json();
                const schedules = await schedRes.json();

                const schedMap: Record<string, any> = {};
                schedules.forEach((s: any) => { schedMap[s.userId] = s; });

                const isWeekend = today.getDay() === 0 || today.getDay() === 6;
                const result = users.map((u: any) => {
                    const sched = schedMap[u.userId];
                    const isOffDay = sched ? sched.isOffDay : isWeekend;
                    return {
                        userId: u.userId,
                        userName: u.userName,
                        startTime: isOffDay ? '-' : (sched?.startTime || '09:00'),
                        endTime: isOffDay ? '-' : (sched?.endTime || '17:00'),
                        isOffDay
                    };
                });
                setTodaySchedules(result);
            })
            .catch(console.error)
            .finally(() => setScheduleLoading(false));
    }, [user?.locationId, todayStr]);

    if (!user) return (
        <div className="flex h-screen items-center justify-center text-red-500">
            Eroare: Utilizator neidentificat. Accesează din GHL.
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 gap-6">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Salut, {user?.userName}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-lg mt-2">
                        Gestionează programul tău de lucru
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="text-center md:text-right hidden md:block">
                        <div className="text-4xl font-mono font-medium text-zinc-800 dark:text-zinc-200">
                            {new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-zinc-400 text-sm uppercase tracking-wide mt-1">
                            {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Settings button — visible to all, lets admin configure */}
                        {isAdmin && (
                            <button
                                onClick={() => setShowSetup(v => !v)}
                                className={`p-3 rounded-xl border transition-all ${showSetup ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600'}`}
                                title="Configurare API Keys"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        )}

                        <a
                            href="/team"
                            className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transform hover:-translate-y-1"
                        >
                            <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="text-lg font-bold">Vezi Echipa</span>
                        </a>
                    </div>
                </div>
            </header>

            {/* Setup panel — shown when admin clicks settings icon */}
            {showSetup && isAdmin && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <FirstRunSetup />
                </div>
            )}

            {/* Time Tracking Section */}
            <TimeLogPanel
                userId={user.userId}
                userName={user.userName || ''}
                email={user.email || ''}
                onStatusChange={() => {
                    // Force refresh or update state if needed
                }}
            />

            {/* Schedule - current user */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <ScheduleCalendar
                    userId={user.userId}
                    userName={user.userName || ''}
                    isAdmin={isAdmin}
                    locationId={user.locationId}
                />
            </div>

            {/* Today's team gantt — visible when locationId is available */}
            {user?.locationId && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">
                                Suprapunere echipă — {format(today, 'EEEE, d MMMM', { locale: ro })}
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">Programul membrilor astăzi</p>
                        </div>
                        <a href="/team" className="text-xs font-bold text-indigo-600 hover:underline">Vezi Săptămâna →</a>
                    </div>
                    <div className="p-4">
                        {scheduleLoading ? (
                            <div className="flex items-center justify-center py-8 text-zinc-400 text-sm">
                                Se încarcă programul echipei...
                            </div>
                        ) : todaySchedules.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-zinc-400 text-sm">
                                Niciun utilizator sincronizat.
                            </div>
                        ) : (
                            <DailyGanttModal
                                isOpen={true}
                                onClose={() => { }}
                                date={today}
                                schedules={todaySchedules}
                                isInline={true}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
