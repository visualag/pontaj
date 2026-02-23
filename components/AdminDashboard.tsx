'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Trash2, Edit2, Download, Search, Shield, Settings, Calendar, BarChart3, X, Loader2 } from 'lucide-react';
import EditLogModal from './EditLogModal';
import ReportingWidget from './ReportingWidget';
import TeamManagement from './TeamManagement';
import FirstRunSetup from './FirstRunSetup';
import DailyGanttModal from './DailyGanttModal';
import TimeLogPanel from './TimeLogPanel';
import ScheduleCalendar from './ScheduleCalendar';
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
    const { user, isAdmin, isOwner, urlClaimsAdmin, loading: authLoading } = useAuth();
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [ganttDate, setGanttDate] = useState<Date>(new Date());
    const [ganttSchedules, setGanttSchedules] = useState<Schedule[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [showGantt, setShowGantt] = useState(true);

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const fetchData = async () => {
        if (!user?.userId) return;
        setLoading(true);
        try {
            const logsRes = await fetch(`/api/logs?role=admin&userId=${user?.userId}`);
            const logsData = await logsRes.json();
            if (logsData.success) setLogs(logsData.logs);

            const locId = user?.locationId || '';
            const usersRes = await fetch(`/api/users?locationId=${locId}`);
            if (usersRes.ok) {
                const users = await usersRes.json();
                setMemberCount(users.length);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchGanttForDate = async (date: Date) => {
        if (!user?.userId) return;
        setScheduleLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const locId = user?.locationId || '';
            const [usersRes, schedRes] = await Promise.all([
                fetch(`/api/users?locationId=${locId}`),
                fetch(`/api/schedule?mode=all&start=${dateStr}&end=${dateStr}&locationId=${locId}`)
            ]);
            if (!usersRes.ok || !schedRes.ok) return;
            const users = await usersRes.json();
            const schedules = await schedRes.json();
            const schedMap: Record<string, any> = {};
            schedules.forEach((s: any) => { schedMap[s.userId] = s; });

            const result = users.map((u: any) => {
                const sched = schedMap[u.userId];
                const hasSchedule = !!sched;
                const isOffDay = sched ? sched.isOffDay : false;
                return {
                    userId: u.userId,
                    userName: u.userName,
                    startTime: hasSchedule && !isOffDay ? sched.startTime : '-',
                    endTime: hasSchedule && !isOffDay ? sched.endTime : '-',
                    isOffDay,
                    hasSchedule
                };
            });
            setGanttSchedules(result);
            setMemberCount(users.length);
        } catch (e) {
            console.error(e);
        } finally {
            setScheduleLoading(false);
        }
    };

    useEffect(() => {
        if (user?.userId) {
            fetchData();
            fetchGanttForDate(today);
        }
    }, [user?.userId, user?.locationId]);

    const handleDelete = async (id: string) => {
        if (!confirm('Sigur vrei să ștergi acest pontaj?')) return;
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
            if (res.ok) fetchData();
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
        link.setAttribute('download', `pontaj_export_${todayStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredLogs = logs.filter(log =>
        (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (authLoading && logs.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="max-w-[95%] mx-auto pb-20 mt-6 space-y-8 animate-in fade-in duration-700">
            {/* Header section */}
            <header className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-1000" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent italic tracking-tight">
                                Admin Center
                            </h1>
                            <div className="flex items-center gap-4 mt-1 font-bold text-sm tracking-tight">
                                <span className="flex items-center gap-1.5 text-indigo-500">
                                    <Shield className="w-4 h-4" />
                                    {memberCount} Membri
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                <span className="text-zinc-400">
                                    {format(today, 'EEEE, d MMMM', { locale: ro })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Caută membru..."
                                className="pl-10 pr-4 py-2.5 w-48 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2.5 rounded-xl border transition-all ${showSettings ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600'}`}
                        >
                            <Settings className={`w-5 h-5 ${showSettings ? 'animate-spin-slow' : ''}`} />
                        </button>

                        <button
                            onClick={handleExport}
                            className="p-2.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 transition-all border border-zinc-200 dark:border-zinc-700 shadow-sm"
                            title="Export CSV"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {!isAdmin && urlClaimsAdmin && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-zinc-900/40 dark:to-zinc-900 border border-indigo-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex flex-col lg:flex-row items-center gap-10">
                        <div className="flex-1 text-center lg:text-left">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-3">Configurare Sincronizare</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-lg leading-relaxed">
                                Bine ai venit, <strong>{user?.userName}</strong>! Pentru ca dashboard-ul să funcționeze corect, te rugăm să sincronizezi echipa curentă din GHL. Acest pas este necesar o singură dată pentru configurarea rolului de administrator.
                            </p>
                            <div className="mt-8">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                    Acțiune necesară
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:max-w-md bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-indigo-100 dark:border-indigo-800">
                            <FirstRunSetup />
                        </div>
                    </div>
                </div>
            )}

            {showSettings && isAdmin && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                    <FirstRunSetup />
                    <TeamManagement />
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left side: Personal controls */}
                <div className="space-y-8">
                    <TimeLogPanel
                        userId={user?.userId || ''}
                        userName={user?.userName || ''}
                        email={user?.email || ''}
                        onStatusChange={fetchData}
                    />

                    <ScheduleCalendar
                        userId={user?.userId || ''}
                        userName={user?.userName || ''}
                        isAdmin={isAdmin}
                        locationId={user?.locationId || ''}
                        onDateSelect={(date) => {
                            setGanttDate(date);
                            fetchGanttForDate(date);
                        }}
                    />
                </div>

                {/* Right side: Team Activity */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Gantt View Widget */}
                    {showGantt && (
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Prezenţă Office</h3>
                                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                                            {format(ganttDate, 'EEEE, d MMMM', { locale: ro })}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowGantt(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                {scheduleLoading ? (
                                    <div className="h-64 flex items-center justify-center text-zinc-300"><Loader2 className="animate-spin w-8 h-8" /></div>
                                ) : (
                                    <DailyGanttModal
                                        isOpen={true}
                                        onClose={() => setShowGantt(false)}
                                        date={ganttDate}
                                        schedules={ganttSchedules}
                                        isInline={true}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {!showGantt && (
                        <button
                            onClick={() => { setShowGantt(true); fetchGanttForDate(ganttDate); }}
                            className="group w-full py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-zinc-400 hover:text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all font-black uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-900 shadow-sm"
                        >
                            <Calendar className="w-8 h-8 transition-transform group-hover:scale-110" />
                            Afișează programul suprapus al echipei
                        </button>
                    )}

                    {isAdmin && (
                        <>
                            <ReportingWidget />

                            {/* Activity Feed - Admin only */}
                            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
                                        <BarChart3 className="w-6 h-6 text-indigo-500" />
                                        Jurnal Pontaj
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-left text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 italic">
                                                <th className="p-7 font-bold uppercase tracking-widest text-[10px]">Utilizator</th>
                                                <th className="p-7 font-bold uppercase tracking-widest text-[10px]">Interval</th>
                                                <th className="p-7 font-bold uppercase tracking-widest text-[10px]">Durată</th>
                                                <th className="p-7 font-bold uppercase tracking-widest text-[10px]">În Lucru</th>
                                                <th className="p-7 text-right font-bold uppercase tracking-widest text-[10px]">Edit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {filteredLogs.map(log => (
                                                <tr key={log._id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    <td className="p-7">
                                                        <div className="font-black text-zinc-900 dark:text-white mb-0.5">{log.userName}</div>
                                                        <div className="text-xs text-zinc-400 font-medium italic">{log.email}</div>
                                                        <div className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 mt-1 uppercase tracking-wider">{log.dateString}</div>
                                                    </td>
                                                    <td className="p-7">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {log.checkOut ? (
                                                                <span className="text-[10px] text-zinc-400 font-bold">{new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            ) : (
                                                                <span className="text-[10px] text-emerald-500 font-black animate-pulse uppercase tracking-widest">În sesiune</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-7">
                                                        <div className="font-black text-indigo-600 dark:text-indigo-400 italic">
                                                            {log.duration ? `${log.duration} min` : '-'}
                                                        </div>
                                                    </td>
                                                    <td className="p-7">
                                                        {log.isActive ? (
                                                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                                                        )}
                                                    </td>
                                                    <td className="p-7 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                                                            <button onClick={() => setEditingLog(log)} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 rounded-2xl transition-all border border-transparent hover:border-indigo-100">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDelete(log._id)} className="p-3 hover:bg-rose-50 dark:hover:bg-rose-900/40 text-rose-600 rounded-2xl transition-all border border-transparent hover:border-rose-100">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredLogs.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-20 text-center text-zinc-400 italic font-medium">Niciun rezultat găsit</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>

            {editingLog && (
                <EditLogModal
                    isOpen={!!editingLog}
                    onClose={() => setEditingLog(null)}
                    log={editingLog}
                    onSave={(id: string, data: any) => handleUpdate(id, data)}
                />
            )}
        </div>
    );
}
