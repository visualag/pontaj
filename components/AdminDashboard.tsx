'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Trash2, Edit2, Download, Search, Shield, Settings, Users, Calendar, BarChart3 } from 'lucide-react';
import EditLogModal from './EditLogModal';
import ReportingWidget from './ReportingWidget';
import TeamManagement from './TeamManagement';
import FirstRunSetup from './FirstRunSetup';
import GHLSyncButton from './GHLSyncButton';
import DailyGanttModal from './DailyGanttModal';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Schedule {
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    isOffDay: boolean;
}

interface TimeLog {
    _id: string;
    userId: string;
    userName?: string;
    email?: string;
    checkIn: string;
    checkOut?: string;
    duration?: number;
    description?: string;
    isActive: boolean;
    dateString: string;
}

export default function AdminDashboard() {
    const { user, isOwner } = useAuth();
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
    const [showTeamManagement, setShowTeamManagement] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const fetchData = async () => {
        setLoading(true);
        setScheduleLoading(true);
        try {
            // Fetch logs
            const logsRes = await fetch(`/api/logs?role=admin&userId=${user?.userId}`);
            const logsData = await logsRes.json();
            if (logsData.success) {
                setLogs(logsData.logs);
            }

            // Fetch users (for member count and Gantt)
            const locId = user?.locationId || '';
            const usersRes = await fetch(`/api/users?locationId=${locId}`);
            if (usersRes.ok) {
                const users = await usersRes.json();
                setMemberCount(users.length);

                // Fetch today's schedule for Gantt
                const schedRes = await fetch(`/api/schedule?mode=all&start=${todayStr}&end=${todayStr}&locationId=${locId}`);
                if (schedRes.ok) {
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
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setScheduleLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.locationId, todayStr]);

    const handleDelete = async (id: string) => {
        if (!confirm('Sigur vrei sa stergi acest pontaj?')) return;
        try {
            await fetch(`/api/logs/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdate = async (id: string, data: any) => {
        try {
            const res = await fetch(`/api/logs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                fetchData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleExport = () => {
        if (logs.length === 0) return;

        const headers = ['User', 'Email', 'Data', 'Check In', 'Check Out', 'Durata (min)', 'Descriere', 'Status'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                `"${log.userName || ''}"`,
                `"${log.email || ''}"`,
                `"${log.dateString}"`,
                `"${new Date(log.checkIn).toLocaleTimeString()}"`,
                `"${log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : ''}"`,
                `"${log.duration || 0}"`,
                `"${(log.description || '').replace(/"/g, '""')}"`,
                `"${log.isActive ? 'Activ' : 'Complet'}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `pontaj_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredLogs = logs.filter(log =>
        (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading && logs.length === 0) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
                            <Users className="w-4 h-4" />
                            <span>{memberCount} Membri Sincronizați</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-zinc-300" />
                        <div className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                            {format(today, 'EEEE, d MMMM', { locale: ro })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <div className="relative mr-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Cauta user..."
                            className="pl-10 pr-4 py-2 w-48 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <a
                        href="/team"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                    >
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        Calendar
                    </a>

                    {isOwner && (
                        <button
                            onClick={() => setShowTeamManagement(!showTeamManagement)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${showTeamManagement ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'}`}
                        >
                            <Shield className="w-4 h-4" />
                            Echipa
                        </button>
                    )}

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2.5 rounded-xl border transition-all ${showSettings ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600'}`}
                        title="Setări API & Sincronizare"
                    >
                        <Settings className={`w-5 h-5 ${showSettings ? 'animate-spin-slow text-white' : ''}`} />
                    </button>

                    <button
                        onClick={handleExport}
                        className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:opacity-90 transition-all shadow-sm"
                        title="Export CSV"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Setup panel — hidden behind cogwheel */}
            {showSettings && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <FirstRunSetup />
                </div>
            )}

            {showTeamManagement && (
                <div className="animate-in fade-in slide-in-from-top-4">
                    <TeamManagement />
                </div>
            )}

            {/* Today's Gantt — RESTORED */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            Suprapunere echipă astăzi
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Programul vizual al tuturor membrilor</p>
                    </div>
                    <a href="/team" className="text-xs font-bold text-indigo-600 hover:underline">Vezi Săptămâna întreagă →</a>
                </div>
                <div className="p-4">
                    {scheduleLoading ? (
                        <div className="flex items-center justify-center py-8 text-zinc-400 text-sm">Se încarcă...</div>
                    ) : todaySchedules.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-zinc-400 text-sm italic">Niciun membru sincronizat.</div>
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

            <ReportingWidget />

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">User</th>
                                <th className="px-6 py-4 font-medium">Data</th>
                                <th className="px-6 py-4 font-medium">Interval</th>
                                <th className="px-6 py-4 font-medium">Durata</th>
                                <th className="px-6 py-4 font-medium">Descriere</th>
                                <th className="px-6 py-4 font-medium text-right">Actiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredLogs.map(log => (
                                <tr key={log._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{log.userName || 'Unknown'}</div>
                                        <div className="text-xs text-zinc-400">{log.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                        {new Date(log.checkIn).toLocaleDateString('ro-RO')}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                                        {new Date(log.checkIn).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })} -
                                        {log.checkOut ? new Date(log.checkOut).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.isActive ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                Activ
                                            </span>
                                        ) : (
                                            <span className="font-mono text-zinc-600 dark:text-zinc-400">{log.duration} min</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={log.description}>
                                        {log.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingLog(log as any)}
                                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(log._id)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <EditLogModal
                isOpen={!!editingLog}
                onClose={() => setEditingLog(null)}
                log={editingLog}
                onSave={handleUpdate}
            />
        </div>
    );
}
