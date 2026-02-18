'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Trash2, Edit2, Download, Search } from 'lucide-react';
import EditLogModal from './EditLogModal';
import ReportingWidget from './ReportingWidget';

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
    const { user } = useAuth();
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingLog, setEditingLog] = useState<TimeLog | null>(null);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`/api/logs?role=admin&userId=${user?.userId}`); // Pass admin creds/role implicitly or explicitly
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Sigur vrei sa stergi acest pontaj?')) return;
        try {
            await fetch(`/api/logs/${id}`, { method: 'DELETE' });
            fetchLogs();
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
                fetchLogs();
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

    if (loading) return <div>Checking backend...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Cauta user..."
                            className="pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </header>

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
        </div >
    );
}
