'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Play, Square, History, Clock, AlertTriangle } from 'lucide-react';
import ScheduleCalendar from './ScheduleCalendar';

interface TimeLog {
    _id: string;
    checkIn: string;
    checkOut?: string;
    duration?: number;
    description?: string;
    dateString: string;
    isActive: boolean;
    autoStopped?: boolean;
}

export default function UserDashboard() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [activeSession, setActiveSession] = useState<TimeLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState('');

    const fetchLogs = async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/logs?userId=${user.userId}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
                const active = data.logs.find((l: TimeLog) => l.isActive);
                setActiveSession(active || null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [user]);

    const handleCheckIn = async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    userName: user.userName,
                    email: user.email,
                }),
            });
            const data = await res.json();
            if (data.success) {
                fetchLogs();
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCheckOut = async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/check-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    description,
                }),
            });
            const data = await res.json();
            if (data.success) {
                fetchLogs();
                setDescription('');
            } else {
                alert(data.error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center">Se incarca...</div>;
    if (!user) return <div className="flex h-screen items-center justify-center text-red-500">Eroare: Utilizator neidentificat. Asigura-te ca accesezi din GHL.</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <header className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Salut, {user?.userName}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Pontaj Zilnic</p>
                </div>
                <div className="text-right">
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-3xl font-mono font-medium text-zinc-800 dark:text-zinc-200">
                            {new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-zinc-400 text-xs uppercase tracking-wide">
                                {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <a href="/team" className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                                <span>👥</span> Echipa
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Action Zone */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center items-center space-y-4">
                    <div className={`p-4 rounded-full ${activeSession ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                        <Clock className={`w-8 h-8 ${activeSession ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-lg font-semibold dark:text-zinc-200">
                            {activeSession ? 'Sesiune Activa' : 'Nu esti pontat'}
                        </h2>
                        {activeSession && (
                            <p className="text-green-600 dark:text-green-400 text-sm font-medium mt-1">
                                Started at {new Date(activeSession.checkIn).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>

                    {!activeSession ? (
                        <button
                            onClick={handleCheckIn}
                            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Start Pontaj
                        </button>
                    ) : (
                        <div className="w-full space-y-3">
                            <input
                                type="text"
                                placeholder="Ce ai lucrat? (Optional)"
                                className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            <button
                                onClick={handleCheckOut}
                                className="w-full py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                            >
                                <Square className="w-4 h-4 fill-current" />
                                Stop Pontaj
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats / Info */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-4">
                        <History className="w-5 h-5 text-zinc-400" />
                        <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">Istoric Recent</h3>
                    </div>

                    <div className="space-y-4 max-h-[200px] overflow-auto pr-2 custom-scrollbar">
                        {logs.length === 0 && <p className="text-zinc-400 text-sm">Niciun istoric recent.</p>}
                        {logs.filter(l => !l.isActive).slice(0, 5).map(log => (
                            <div key={log._id} className="flex justify-between items-center text-sm p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
                                <div>
                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {new Date(log.checkIn).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                                    </div>
                                    <div className="text-zinc-400 text-xs">
                                        {new Date(log.checkIn).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} -
                                        {log.checkOut ? new Date(log.checkOut).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '???'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-medium text-blue-600 dark:text-blue-400 flex items-center justify-end gap-2">
                                        {log.autoStopped && (
                                            <div title="Sesiune oprita automat la miezul noptii">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            </div>
                                        )}
                                        {log.duration} min
                                    </div>
                                    {log.description && (
                                        <div className="text-xs text-zinc-400 max-w-[120px] truncate" title={log.description}>
                                            {log.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Schedule Section */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 md:col-span-2">
                    <ScheduleCalendar userId={user.userId} userName={user.userName || ''} />
                </div>
            </div>
        </div>
    );
}
