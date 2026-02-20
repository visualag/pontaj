'use client';

import { useState, useEffect } from 'react';
import { Key, RefreshCw, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface SetupState {
    checked: boolean;
    hasKey: boolean;
    hasAgencyKey: boolean;
}

export default function FirstRunSetup() {
    const { user, isAdmin, urlClaimsAdmin } = useAuth();
    const [setup, setSetup] = useState<SetupState>({ checked: false, hasKey: false, hasAgencyKey: false });
    const [isExpanded, setIsExpanded] = useState(false);
    const [locationApiKey, setLocationApiKey] = useState('');
    const [agencyApiKey, setAgencyApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; stats?: any } | null>(null);

    useEffect(() => {
        if (!user?.locationId) return;
        fetch(`/api/users/sync-ghl?locationId=${user.locationId}`)
            .then(r => r.json())
            .then(data => {
                setSetup({ checked: true, hasKey: data.hasKey, hasAgencyKey: data.hasAgencyKey });
                // Auto-expand if no keys saved yet
                if (!data.hasKey && !data.hasAgencyKey) setIsExpanded(true);
            })
            .catch(() => setSetup({ checked: true, hasKey: false, hasAgencyKey: false }));
    }, [user?.locationId]);

    const handleSync = async () => {
        if (!user?.locationId) return;
        if (!locationApiKey.trim() && !agencyApiKey.trim() && !setup.hasKey && !setup.hasAgencyKey) {
            setResult({ success: false, message: 'Introduceți cel puțin un API Key.' });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch('/api/users/sync-ghl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: locationApiKey,
                    agencyApiKey,
                    locationId: user.locationId,
                    updatedBy: user.userName
                })
            });

            const data = await res.json();

            if (res.ok) {
                setResult({
                    success: true,
                    message: `✅ ${data.stats?.total ?? 0} utilizatori importați (${data.stats?.added ?? 0} noi, ${data.stats?.updated ?? 0} actualizați).`,
                    stats: data.stats
                });
                setSetup(prev => ({ ...prev, hasKey: !!locationApiKey || prev.hasKey, hasAgencyKey: !!agencyApiKey || prev.hasAgencyKey }));
                setLocationApiKey('');
                setAgencyApiKey('');
                setTimeout(() => window.location.reload(), 2500);
            } else {
                setResult({ success: false, message: data.error || 'Eroare la sincronizare.' });
            }
        } catch {
            setResult({ success: false, message: 'Eroare de conexiune.' });
        } finally {
            setLoading(false);
        }
    };

    // Show this component to admins (DB role) OR to users GHL identifies as admin in URL (first-run)
    // Regular users never see this
    const canSeeSetup = isAdmin || urlClaimsAdmin;
    if (!canSeeSetup) return null;

    // Don't render until we've checked API key status
    if (!setup.checked) return null;
    // If both keys saved and panel was not explicitly opened, hide it (collapsed by default)
    if (setup.hasKey && setup.hasAgencyKey && !isExpanded) return null;

    const isMissingKeys = !setup.hasKey && !setup.hasAgencyKey;

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${isMissingKeys
            ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30'
            : 'border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20'
            }`}>
            {/* Header / Toggle */}
            <button
                onClick={() => setIsExpanded(e => !e)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isMissingKeys ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-indigo-100 dark:bg-indigo-900/40'}`}>
                        <Key className={`w-4 h-4 ${isMissingKeys ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    </div>
                    <div>
                        <p className={`font-semibold text-sm ${isMissingKeys ? 'text-amber-900 dark:text-amber-200' : 'text-indigo-900 dark:text-indigo-200'}`}>
                            {isMissingKeys ? '⚠️ Configurare necesară — Sincronizare GHL' : 'Gestionare Chei API GHL'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {isMissingKeys
                                ? 'Nicio cheie API salvată. Adăugați cheia pentru a importa utilizatorii.'
                                : `Chei salvate: ${[setup.hasKey && 'Location', setup.hasAgencyKey && 'Agency'].filter(Boolean).join(' + ')}`
                            }
                        </p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {/* Expandable Form */}
            {isExpanded && (
                <div className="px-6 pb-6 space-y-4 border-t border-inherit pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Location Key */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                                Location API Key
                                {setup.hasKey && <span className="ml-2 text-emerald-600 font-normal normal-case">✓ Salvată</span>}
                            </label>
                            <input
                                type="password"
                                value={locationApiKey}
                                onChange={e => setLocationApiKey(e.target.value)}
                                placeholder={setup.hasKey ? '●●●●●●●● (lasă gol pentru a păstra)' : 'Private Integration Token (Location)'}
                                className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder-zinc-400"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">GHL → Settings → API Keys → Location Level</p>
                        </div>

                        {/* Agency Key */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                                Agency API Key <span className="font-normal normal-case">(opțional)</span>
                                {setup.hasAgencyKey && <span className="ml-2 text-emerald-600 font-normal normal-case">✓ Salvată</span>}
                            </label>
                            <input
                                type="password"
                                value={agencyApiKey}
                                onChange={e => setAgencyApiKey(e.target.value)}
                                placeholder={setup.hasAgencyKey ? '●●●●●●●● (lasă gol pentru a păstra)' : 'Private Integration Token (Agency)'}
                                className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder-zinc-400"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1">GHL → Agency Settings → API Keys → Agency Level</p>
                        </div>
                    </div>

                    {result && (
                        <div className={`flex items-start gap-2.5 p-3 rounded-lg text-sm ${result.success
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}>
                            {result.success ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                            <span>{result.message}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-400">Cheile sunt criptate și stocate în MongoDB.</p>
                        <button
                            onClick={handleSync}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {loading ? 'Sincronizez...' : 'Salvează & Sincronizează'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
