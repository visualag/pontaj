'use client';

import { X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Schedule {
    userId: string;
    userName: string;
    startTime: string; // "HH:mm"
    endTime: string;   // "HH:mm"
    isOffDay: boolean;
}

// ... imports

interface Props {
    isOpen: boolean; // Kept for backward compat if needed, but mainly we use isInline
    onClose: () => void;
    date: Date;
    schedules: Schedule[];
    isInline?: boolean; // New prop
}

export default function DailyGanttView({ isOpen, onClose, date, schedules, isInline = false }: Props) {
    if (!isOpen) return null;

    // Configuration
    const START_HOUR = 6; // 06:00
    const END_HOUR = 22;  // 22:00
    const TOTAL_HOURS = END_HOUR - START_HOUR;

    // Helper to calculate position and width
    const getBarStyles = (start: string, end: string) => {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);

        const startDec = startH + startM / 60;
        const endDec = endH + endM / 60;

        // Clamp values to view range
        const viewStart = Math.max(startDec, START_HOUR);
        const viewEnd = Math.min(endDec, END_HOUR);

        if (viewEnd <= viewStart) return { left: '0%', width: '0%' }; // Out of bounds

        const leftPercent = ((viewStart - START_HOUR) / TOTAL_HOURS) * 100;
        const widthPercent = ((viewEnd - viewStart) / TOTAL_HOURS) * 100;

        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`
        };
    };

    // Sort schedules: Working first, then Off
    const sortedSchedules = [...schedules].sort((a, b) => {
        if (a.isOffDay && !b.isOffDay) return 1;
        if (!a.isOffDay && b.isOffDay) return -1;
        return a.startTime.localeCompare(b.startTime);
    });

    const Content = (
        <div className={`flex flex-col h-full ${isInline ? '' : 'bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] border border-zinc-100 dark:border-zinc-800'}`}>
            <header className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Program Detaliat
                    </h2>
                    <p className="text-zinc-500 text-sm">
                        {format(date, 'EEEE, d MMMM yyyy', { locale: ro })}
                    </p>
                </div>
                {!isInline && (
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                )}
                {isInline && (
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600">
                        <span className="text-sm font-medium mr-2">Inchide</span>
                        <X className="w-4 h-4 inline" />
                    </button>
                )}
            </header>

            <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${isInline ? 'max-h-[600px]' : ''}`}>
                {/* Time Ruler */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-700 pb-2 ml-[150px]">
                    {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
                        <div key={i} className="flex-1 text-xs text-zinc-400 text-center border-l border-zinc-100 dark:border-zinc-800 h-2 relative">
                            <span className="absolute -top-4 -left-2">{i + START_HOUR}:00</span>
                        </div>
                    ))}
                </div>

                {/* Users Rows */}
                <div className="space-y-4">
                    {sortedSchedules.map((sched, idx) => (
                        <div key={idx} className="flex items-center group">
                            {/* User Info */}
                            <div className="w-[150px] pr-4 shrink-0">
                                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate" title={sched.userName}>
                                    {sched.userName}
                                </div>
                                <div className="text-xs text-zinc-400">
                                    {sched.isOffDay ? 'Liber' : `${sched.startTime} - ${sched.endTime}`}
                                </div>
                            </div>

                            {/* Gantt Bar Area */}
                            <div className="flex-1 h-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg relative overflow-hidden border border-zinc-100 dark:border-zinc-800">
                                {/* Grid Lines */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                                        <div key={i} className="flex-1 border-r border-zinc-100 dark:border-zinc-800 opacity-50"></div>
                                    ))}
                                </div>

                                {!sched.isOffDay ? (
                                    <div
                                        className="absolute top-1 bottom-1 bg-indigo-500/90 rounded-md shadow-sm group-hover:bg-indigo-500 transition-colors cursor-help"
                                        style={getBarStyles(sched.startTime, sched.endTime)}
                                        title={`${sched.userName}: ${sched.startTime} - ${sched.endTime}`}
                                    >
                                        {/* Label inside bar if wide enough */}
                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            {sched.startTime} - {sched.endTime}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs text-zinc-300 italic">Liber</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (isInline) {
        return Content;
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {Content}
        </div>
    );
}
