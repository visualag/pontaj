'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Key, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function GHLSyncButton() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [hasSavedKey, setHasSavedKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen && user?.locationId) {
            // Check if we have a key saved
            fetch(`/api/users/sync-ghl?locationId=${user.locationId}`)
                .then(res => res.json())
                .then(data => setHasSavedKey(data.hasKey))
                .catch(console.error);
        }
    }, [isOpen, user?.locationId]);

    const handleSync = async () => {
        if (!apiKey && !hasSavedKey) return;

        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const res = await fetch('/api/users/sync-ghl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey, // Can be empty if we have saved key
                    locationId: user?.locationId,
                    updatedBy: user?.userName
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(`Sincronizare reușită! ${data.stats.total} utilizatori procesați.`);
                setTimeout(() => {
                    setIsOpen(false);
                    window.location.reload();
                }, 3000);
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
                            {hasSavedKey ? (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-sm flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Exista o cheie salvată pentru această locație. Poți lăsa câmpul gol.</span>
                                </div>
                            ) : (
                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm">
                                    Introdu <strong>Location API Key</strong> o singură dată. Acesta va fi salvat pentru viitoare sincronizări.
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    API Key {hasSavedKey && '(Opțional)'}
                                </label>
                                <input
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={hasSavedKey ? "Cheie existenta..." : "ex: pit-..."}
                                    className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-mono"
                                />
                            </div>

                            {status === 'success' && (
                                <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                                    <CheckCircle className="w-4 h-4" />
                                    {message}
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    {message}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
                                >
                                    Anuleaza
                                </button>
                                <button
                                    onClick={handleSync}
                                    disabled={loading || (!apiKey && !hasSavedKey)}
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
