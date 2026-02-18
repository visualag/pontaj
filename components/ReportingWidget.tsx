'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { BarChart3 } from 'lucide-react';

interface ReportItem {
    userId: string;
    userName: string;
    totalMinutes: number;
    totalHours: number;
    daysWorked: number;
}

export default function ReportingWidget() {
    const [report, setReport] = useState<ReportItem[]>([]);
    const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, [currentMonth]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports?month=${currentMonth}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Raport Lunar
                </h2>
                <input
                    type="month"
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                />
            </div>

            {loading ? (
                <div className="text-center py-4 text-zinc-400">Se calculeaza...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Nume</th>
                                <th className="px-4 py-3">Zile Lucrate</th>
                                <th className="px-4 py-3">Ore Totale</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Progress (tinta 160h)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {report.map(item => (
                                <tr key={item.userId}>
                                    <td className="px-4 py-3 font-medium">{item.userName}</td>
                                    <td className="px-4 py-3">{item.daysWorked}</td>
                                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.totalHours}h</td>
                                    <td className="px-4 py-3">
                                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 max-w-[150px] ml-auto">
                                            <div
                                                className="bg-indigo-500 h-2 rounded-full"
                                                style={{ width: `${Math.min(100, (item.totalHours / 160) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {report.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-4 text-zinc-400">Nu exista date pentru aceasta luna.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
