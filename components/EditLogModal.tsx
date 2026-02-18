'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface TimeLog {
    _id: string;
    checkIn: string;
    checkOut?: string;
    description?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, data: any) => Promise<void>;
    log: TimeLog | null;
}

export default function EditLogModal({ isOpen, onClose, onSave, log }: Props) {
    const [checkInDate, setCheckInDate] = useState('');
    const [checkInTime, setCheckInTime] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [checkOutTime, setCheckOutTime] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (log) {
            const inDate = new Date(log.checkIn);
            setCheckInDate(format(inDate, 'yyyy-MM-dd'));
            setCheckInTime(format(inDate, 'HH:mm'));

            if (log.checkOut) {
                const outDate = new Date(log.checkOut);
                setCheckOutDate(format(outDate, 'yyyy-MM-dd'));
                setCheckOutTime(format(outDate, 'HH:mm'));
            } else {
                setCheckOutDate('');
                setCheckOutTime('');
            }

            setDescription(log.description || '');
        }
    }, [log]);

    const handleSave = async () => {
        if (!log) return;
        setSaving(true);

        const newCheckIn = new Date(`${checkInDate}T${checkInTime}`);
        let newCheckOut = null;

        if (checkOutDate && checkOutTime) {
            newCheckOut = new Date(`${checkOutDate}T${checkOutTime}`);
        }

        await onSave(log._id, {
            checkIn: newCheckIn,
            checkOut: newCheckOut,
            description
        });

        setSaving(false);
        onClose();
    };

    if (!isOpen || !log) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Editeaza Pontaj</h3>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full">
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Check In */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Data Start</label>
                            <input
                                type="date"
                                value={checkInDate}
                                onChange={e => setCheckInDate(e.target.value)}
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Ora Start</label>
                            <input
                                type="time"
                                value={checkInTime}
                                onChange={e => setCheckInTime(e.target.value)}
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                            />
                        </div>
                    </div>

                    {/* Check Out */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Data Stop</label>
                            <input
                                type="date"
                                value={checkOutDate}
                                onChange={e => setCheckOutDate(e.target.value)}
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-1">Ora Stop</label>
                            <input
                                type="time"
                                value={checkOutTime}
                                onChange={e => setCheckOutTime(e.target.value)}
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-zinc-400 italic">Lasa gol Data/Ora Stop daca sesiunea e inca activa.</p>

                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Descriere</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                            rows={3}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-zinc-600 font-medium text-sm hover:bg-zinc-100 rounded-lg"
                        >
                            Anuleaza
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salveaza Modificarile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
