'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, AlertCircle, Loader2, CheckCircle, MessageSquare, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

interface TimeLog {
    _id: string;
    checkIn: string;
    isActive: boolean;
}

interface Props {
    userId: string;
    userName: string;
    email: string;
    onStatusChange?: () => void;
}

export default function TimeLogPanel({ userId, userName, email, onStatusChange }: Props) {
    const [activeLog, setActiveLog] = useState<TimeLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [timer, setTimer] = useState<string>('00:00:00');
    const [description, setDescription] = useState('');
    const [showDescription, setShowDescription] = useState(false);
    const [todaySchedule, setTodaySchedule] = useState<{ startTime: string, endTime: string, isOffDay: boolean } | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchActiveSession = async () => {
        try {
            const res = await fetch(`/api/logs?userId=${userId}&isActive=true`);
            if (res.ok) {
                const data = await res.json();
                const active = data.logs.find((l: any) => l.isActive);
                setActiveLog(active || null);
            }

            // Also fetch today's schedule
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const schedRes = await fetch(`/api/schedule?userId=${userId}&start=${todayStr}&end=${todayStr}`);
            if (schedRes.ok) {
                const scheds = await schedRes.json();
                const todaySched = scheds.find((s: any) => s.dateString === todayStr);
                setTodaySchedule(todaySched || null);
            }
        } catch (e) {
            console.error('Failed to fetch data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchActiveSession();
    }, [userId]);

    useEffect(() => {
        if (activeLog) {
            updateTimer();
            intervalRef.current = setInterval(updateTimer, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimer('00:00:00');
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [activeLog]);

    const updateTimer = () => {
        if (!activeLog) return;
        const start = new Date(activeLog.checkIn).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);

        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        setTimer(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
    };

    const handleStart = async () => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userName, email })
            });
            if (res.ok) {
                await fetchActiveSession();
                if (onStatusChange) onStatusChange();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStop = async () => {
        if (!activeLog) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/check-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, description })
            });
            if (res.ok) {
                setActiveLog(null);
                setDescription('');
                setShowDescription(false);
                if (onStatusChange) onStatusChange();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogSchedule = async () => {
        if (!todaySchedule || todaySchedule.isOffDay) return;
        if (!confirm(`Vrei să înregistrezi orele din program (${todaySchedule.startTime} - ${todaySchedule.endTime}) ca fiind lucrate?`)) return;

        setActionLoading(true);
        try {
            // Create a finalized log directly
            const today = new Date();
            const [startH, startM] = todaySchedule.startTime.split(':').map(Number);
            const [endH, endM] = todaySchedule.endTime.split(':').map(Number);

            const start = new Date(today);
            start.setHours(startH, startM, 0, 0);

            const end = new Date(today);
            end.setHours(endH, endM, 0, 0);

            const res = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userName,
                    email,
                    checkIn: start.toISOString(),
                    checkOut: end.toISOString(),
                    description: 'Înregistrat automat din programul planificat',
                    isActive: false
                })
            });

            if (res.ok) {
                alert('Programul a fost înregistrat cu succes!');
                if (onStatusChange) onStatusChange();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="h-24 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
        </div>
    );

    return (
        <div className={`p-6 rounded-3xl shadow-sm border transition-all ${activeLog
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50'
            : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
            }`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${activeLog ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                        <Clock className={`w-8 h-8 ${activeLog ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            {activeLog ? 'Sesiune Activă' : 'Pontaj Oprit'}
                        </p>
                        <p className={`text-4xl font-mono font-bold ${activeLog ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-300 dark:text-zinc-700'}`}>
                            {timer}
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 w-full md:w-auto items-center gap-3">
                    {activeLog ? (
                        <div className="flex flex-1 flex-col gap-3">
                            <div className="relative flex-1">
                                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                                <textarea
                                    placeholder="Ce ai lucrat astăzi? (opțional)"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px] resize-none"
                                />
                            </div>
                            <button
                                onClick={handleStop}
                                disabled={actionLoading}
                                className="w-full md:w-48 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-rose-500/20 active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
                                Stop Pontaj
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row flex-1 gap-3">
                            <button
                                onClick={handleStart}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                                Start Pontaj
                            </button>

                            {todaySchedule && !todaySchedule.isOffDay && (
                                <button
                                    onClick={handleLogSchedule}
                                    disabled={actionLoading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                                    title={`Înregistrează rapid orele planificate: ${todaySchedule.startTime} - ${todaySchedule.endTime}`}
                                >
                                    <ClipboardCheck className="w-5 h-5" />
                                    Încarcă din Program
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {activeLog && (
                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-100/50 dark:bg-emerald-900/20 w-fit px-3 py-1.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Pontat la {format(new Date(activeLog.checkIn), 'HH:mm')}
                </div>
            )}
        </div>
    );
}
