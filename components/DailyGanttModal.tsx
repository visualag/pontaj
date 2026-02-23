'use client';

import { X, Clock, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Schedule {
    userId: string;
    userName: string;
    startTime: string; // "HH:mm"
    endTime: string;   // "HH:mm"
    isOffDay: boolean;
    hasSchedule?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    schedules: Schedule[];
    isInline?: boolean;
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

        if (viewEnd <= viewStart) return { left: '0%', width: '0%', opacity: 0 };

        const leftPercent = ((viewStart - START_HOUR) / TOTAL_HOURS) * 100;
        const widthPercent = ((viewEnd - viewStart) / TOTAL_HOURS) * 100;

        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`
        };
    };

    // Sort: working first, then unscheduled (grey), then off-day (red)
    const sortedSchedules = [...schedules].sort((a, b) => {
        const rank = (s: Schedule) => {
            if (s.hasSchedule && !s.isOffDay) return 0;  // working
            if (!s.hasSchedule) return 1;                // no schedule
            return 2;                                     // off day
        };
        return rank(a) - rank(b) || a.userName.localeCompare(b.userName);
    });

    const Content = (
        <div className={`flex flex-col h-full bg-white dark:bg-zinc-900 ${isInline ? '' : 'rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] border border-zinc-100 dark:border-zinc-800'} overflow-hidden`}>
            <header className="flex justify-between items-center px-10 py-8 border-b border-zinc-50 dark:border-zinc-800">
                <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-3 uppercase italic tracking-tighter">
                        <Clock className="w-7 h-7 text-indigo-500" />
                        Analiză Suprapuneri
                    </h2>
                    <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1">
                        {format(date, 'EEEE, d MMMM yyyy', { locale: ro })}
                    </p>
                </div>
                {!isInline && (
                    <button onClick={onClose} className="p-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 rounded-2xl transition-all">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                )}
            </header>

            <div className={`flex-1 overflow-x-auto p-8 ${isInline ? '' : 'overflow-y-auto'}`}>
                <div className="min-w-[800px] flex flex-col gap-6">
                    {/* Time Ruler */}
                    <div className="flex ml-[180px] border-b border-zinc-100 dark:border-zinc-800 pb-4">
                        {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
                            <div key={i} className="flex-1 border-l border-zinc-50 dark:border-zinc-800 h-4 relative">
                                <span className="absolute -top-7 left-0 -translate-x-1/2 text-[9px] font-black text-zinc-400 font-mono tracking-tighter">
                                    {(i + START_HOUR).toString().padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Users Rows */}
                    <div className="space-y-4">
                        {sortedSchedules.map((sched, idx) => (
                            <div key={idx} className="flex items-center group/row">
                                {/* User Info */}
                                <div className="w-[180px] pr-6 shrink-0 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-700 group-hover/row:border-indigo-200 transition-all">
                                        <UserIcon className="w-4 h-4 text-zinc-400 group-hover/row:text-indigo-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-xs text-zinc-900 dark:text-zinc-100 truncate tracking-tight" title={sched.userName}>
                                            {sched.userName}
                                        </div>
                                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {sched.isOffDay ? 'Inactiv' : 'Activ'}
                                        </div>
                                    </div>
                                </div>

                                {/* Gantt Bar Area */}
                                <div className="flex-1 h-12 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl relative overflow-hidden border border-zinc-100 dark:border-zinc-900 shadow-inner group-hover/row:shadow-md transition-all">
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 flex pointer-events-none opacity-20">
                                        {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                                            <div key={i} className="flex-1 border-r border-zinc-200 dark:border-zinc-800"></div>
                                        ))}
                                    </div>

                                    {/* 3 states: working, off day, no schedule */}
                                    {sched.hasSchedule && !sched.isOffDay ? (
                                        // Working — indigo gradient bar
                                        <div
                                            className="absolute top-2 bottom-2 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 group-hover/row:scale-y-110 transition-all cursor-help flex items-center justify-center overflow-hidden"
                                            style={getBarStyles(sched.startTime, sched.endTime)}
                                            title={`${sched.userName}: ${sched.startTime} - ${sched.endTime}`}
                                        >
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                            <span className="text-[10px] text-white font-black tracking-tighter hidden sm:block">
                                                {sched.startTime} &ndash; {sched.endTime}
                                            </span>
                                        </div>
                                    ) : sched.isOffDay ? (
                                        // Off day — red tint
                                        <div className="absolute inset-1 rounded-xl bg-rose-100 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Zi Liberă</span>
                                        </div>
                                    ) : (
                                        // No schedule — grey
                                        <div className="absolute inset-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center opacity-60">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nesetat</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    if (isInline) {
        return Content;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
            {Content}
        </div>
    );
}
