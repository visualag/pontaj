'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Key, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface GHLSyncButtonProps {
    onSyncComplete?: () => void;
}

export default function GHLSyncButton({ onSyncComplete }: GHLSyncButtonProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [agencyApiKey, setAgencyApiKey] = useState('');
    const [hasSavedKey, setHasSavedKey] = useState(false);
    const [hasSavedAgencyKey, setHasSavedAgencyKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen && user?.locationId) {
            // Check if we have a key saved
            fetch(`/api/users/sync-ghl?locationId=${user.locationId}`)
                .then(res => res.json())
                .then(data => {
                    setHasSavedKey(data.hasKey);
                    setHasSavedAgencyKey(data.hasAgencyKey);
                })
                .catch(console.error);
        }
    }, [isOpen, user?.locationId]);

    const handleSync = async () => {
        if (!apiKey && !hasSavedKey && !agencyApiKey && !hasSavedAgencyKey) return;

        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const res = await fetch('/api/users/sync-ghl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey, // Can be empty if we have saved key
                    agencyApiKey,
                    locationId: user?.locationId,
                    updatedBy: user?.userName
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(`Sincronizare reușită! ${data.stats.total} utilizatori procesați.`);

                // Call callback if provided
                if (onSyncComplete) onSyncComplete();

                setTimeout(() => {
                    setIsOpen(false);
                    // window.location.reload(); // Removed to avoid hard refresh if we have a callback
                }, 2000);
            } else {
                setStatus('error');
                setMessage(data.error || 'A apărut o eroare.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Eroare de conexiune.');
        } finally {
            setLoading(false);
        }
    };

    // Allow Owner OR Admin to sync.
    if (!user?.isOwner && user?.role !== 'admin') return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
                <RefreshCw className="w-4 h-4" />
                Sincronizeaza GHL
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md border border-zinc-100 dark:border-zinc-800 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Key className="w-5 h-5 text-indigo-600" />
                                Sincronizare Utilizatori GHL
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Location Key Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">1. Staff Locație</h4>
                                {hasSavedKey ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-sm flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Cheie salvată.</span>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="Location API Key (GHL V1)"
                                        className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-mono mb-2"
                                    />
                                )}
                            </div>

                            {/* Agency Key Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">2. Echipa Agenție (Opțional)</h4>
                                <p className="text-xs text-zinc-500 mb-2">Introduceți cheia de agenție pentru a importa administratorii.</p>
                                {hasSavedAgencyKey ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-sm flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Cheie Agenție salvată.</span>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={agencyApiKey}
                                        onChange={(e) => setAgencyApiKey(e.target.value)}
                                        placeholder="Agency API Key (GHL V1)"
                                        className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-mono"
                                    />
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
                                >
                                    Anuleaza
                                </button>
                                <button
                                    onClick={handleSync}
                                    disabled={loading || ((!apiKey && !hasSavedKey) && (!agencyApiKey && !hasSavedAgencyKey))}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Sincronizeaza
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
