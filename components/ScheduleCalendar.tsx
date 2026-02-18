'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parse, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Calendar as CalendarIcon, Save, Loader2, Check } from 'lucide-react';

interface Schedule {
    dateString: string;
    startTime: string;
    endTime: string;
    isOffDay: boolean;
    _id?: string;
}

interface Props {
    userId: string;
    userName: string;
}

export default function ScheduleCalendar({ userId, userName }: Props) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Edit form state
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [isOffDay, setIsOffDay] = useState(false);

    useEffect(() => {
        fetchSchedules();
    }, [currentMonth]);

    const fetchSchedules = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
            const res = await fetch(`/api/schedule?userId=${userId}&start=${start}&end=${end}`);
            if (res.ok) {
                const data = await res.json();
                setSchedules(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const existing = schedules.find(s => s.dateString === dateStr);

        if (existing) {
            setStartTime(existing.startTime);
            setEndTime(existing.endTime);
            setIsOffDay(existing.isOffDay);
        } else {
            setStartTime('09:00');
            setEndTime('17:00');
            setIsOffDay(false);
        }
    };

    const handleSave = async () => {
        if (!selectedDate || !userId) return;
        setSaving(true);
        try {
            const dateString = format(selectedDate, 'yyyy-MM-dd');
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userName,
                    dateString,
                    startTime,
                    endTime,
                    isOffDay
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setSchedules(prev => {
                    const filtered = prev.filter(s => s.dateString !== dateString);
                    return [...filtered, updated];
                });
                // Optional: Close modal or show success
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getDaySchedule = (date: Date) => {
        return schedules.find(s => s.dateString === format(date, 'yyyy-MM-dd'));
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    Programul Meu
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(subDays(currentMonth, 30))} className="p-1 hover:bg-zinc-100 rounded">&lt;</button>
                    <span className="font-medium capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ro })}</span>
                    <button onClick={() => setCurrentMonth(addDays(currentMonth, 30))} className="p-1 hover:bg-zinc-100 rounded">&gt;</button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-6">
                {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'].map(day => (
                    <div key={day} className="text-center text-xs text-zinc-400 font-medium py-2">
                        {day}
                    </div>
                ))}

                {/* Placeholder for empty days at start of month would go here, simplified for now */}

                {daysInMonth.map(date => {
                    const sched = getDaySchedule(date);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());

                    return (
                        <button
                            key={date.toString()}
                            onClick={() => handleDateClick(date)}
                            className={`
                h-14 rounded-lg flex flex-col items-center justify-center text-xs border transition-all
                ${isSelected ? 'border-primary ring-2 ring-primary/20 z-10' : 'border-transparent'}
                ${isToday ? 'bg-zinc-50 dark:bg-zinc-800 font-bold' : ''}
                ${sched?.isOffDay ? 'bg-red-50 text-red-400' : ''}
                ${!sched && !isToday && !isSelected ? 'hover:bg-zinc-50' : ''}
              `}
                        >
                            <span className="mb-1">{format(date, 'd')}</span>
                            {sched && !sched.isOffDay && (
                                <span className="text-[10px] text-zinc-500">{sched.startTime}</span>
                            )}
                            {sched?.isOffDay && (
                                <span className="text-[10px] text-red-400">Liber</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Edit Section */}
            {selectedDate && (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-medium">
                            Program pentru {format(selectedDate, 'dd MMMM', { locale: ro })}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Inceput</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                disabled={isOffDay}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1">Sfarsit</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                disabled={isOffDay}
                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 pb-2">
                            <input
                                type="checkbox"
                                id="isOffDay"
                                checked={isOffDay}
                                onChange={(e) => setIsOffDay(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-300"
                            />
                            <label htmlFor="isOffDay" className="text-sm">Zi Libera</label>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="ml-auto bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salveaza
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
