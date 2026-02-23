'use client';

import { useState } from 'react';
import { Key, RefreshCw, CheckCircle, AlertCircle, Loader2, ArrowRight, Shield, Users, Building2 } from 'lucide-react';

export default function SetupPage() {
    const [locationId, setLocationId] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [locationApiKey, setLocationApiKey] = useState('');
    const [agencyApiKey, setAgencyApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; stats?: any } | null>(null);

    const isPlaceholderId = ['location', '{location.id}', '{{location.id}}'].includes(locationId.toLowerCase());
    const effectiveLocationId = isPlaceholderId ? '' : locationId.trim();
    const currentCompanyId = companyId.trim();

    const handleSync = async () => {
        if (!effectiveLocationId && !currentCompanyId) {
            setResult({ success: false, message: 'Introduceți un Location ID sau un Company ID.' });
            return;
        }
        if (!locationApiKey.trim() && !agencyApiKey.trim()) {
            setResult({ success: false, message: 'Completați cel puțin un câmp de API Key.' });
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
                    locationId: effectiveLocationId || undefined,
                    companyId: currentCompanyId || undefined,
                    updatedBy: 'setup-wizard'
                })
            });

            const data = await res.json();

            if (res.ok) {
                setResult({
                    success: true,
                    message: `Sincronizare reușită! ${data.stats?.total ?? 0} utilizatori importați.`,
                    stats: data.stats
                });
            } else {
                setResult({ success: false, message: data.error || 'Eroare la sincronizare.' });
            }
        } catch (e) {
            setResult({ success: false, message: 'Eroare de conexiune.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-xl">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">GHL Pontaj Setup</h1>
                    <p className="text-zinc-400 text-sm">Configurare inițială — importați echipa din GoHighLevel</p>
                </div>

                {/* Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">

                    {/* Step 1 — IDs */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                                Location ID (Sub-account)
                            </label>
                            <input
                                type="text"
                                value={locationId}
                                onChange={e => setLocationId(e.target.value)}
                                placeholder="ex: lXXXX..."
                                className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-400" />
                                Company ID (Agenție)
                            </label>
                            <input
                                type="text"
                                value={companyId}
                                onChange={e => setCompanyId(e.target.value)}
                                placeholder="ex: ZxMj..."
                                className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
                            />
                        </div>
                    </div>

                    {/* Step 2 — Location API Key */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                            <span className="inline-flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                                Location API Key <span className="text-zinc-500 font-normal">(staff locație)</span>
                            </span>
                        </label>
                        <input
                            type="text"
                            value={locationApiKey}
                            onChange={e => setLocationApiKey(e.target.value)}
                            placeholder="Private Integration Token — Location"
                            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition"
                        />
                        <p className="text-xs text-zinc-500 mt-1.5">GHL → Sub-account Settings → <strong>Integrations</strong> → scroll jos la <strong>Private Integrations</strong></p>
                    </div>

                    {/* Step 3 — Agency API Key */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                            <span className="inline-flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                                Agency API Key <span className="text-zinc-500 font-normal">(admini agenție, opțional)</span>
                            </span>
                        </label>
                        <input
                            type="text"
                            value={agencyApiKey}
                            onChange={e => setAgencyApiKey(e.target.value)}
                            placeholder="Private Integration Token — Agency"
                            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition"
                        />
                        <p className="text-xs text-zinc-500 mt-1.5">GHL → Agency Settings → <strong>Integrations</strong> → scroll jos la <strong>Private Integrations</strong></p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-indigo-950/50 border border-indigo-800/50 rounded-xl p-4 flex gap-3">
                        <Key className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-300 leading-relaxed">
                            Folosiți <strong>Private Integration Tokens</strong> (GHL API V2). Cheile vechi (V1) pot să nu returneze toți utilizatorii agenției în mod fiabil.
                        </p>
                    </div>

                    {/* Result Message */}
                    {result && (
                        <div className={`flex items-start gap-3 p-4 rounded-xl border ${result.success
                            ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300'
                            : 'bg-red-950/50 border-red-800/50 text-red-300'
                            }`}>
                            {result.success
                                ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            }
                            <div>
                                <p className="text-sm font-medium">{result.message}</p>
                                {result.stats && (
                                    <div className="mt-2 text-xs opacity-80 space-y-0.5">
                                        <p>Adăugați: {result.stats.added} · Actualizați: {result.stats.updated}</p>
                                        {result.stats.agencyUsers > 0 && <p>Admini agenție: {result.stats.agencyUsers}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sync Button */}
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Sincronizez...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Sincronizează Utilizatori GHL
                                <ArrowRight className="w-4 h-4 ml-auto" />
                            </>
                        )}
                    </button>

                    {result?.success && (
                        <p className="text-center text-sm text-zinc-400">
                            ✅ Gata! Acum puteți accesa aplicația din GHL cu parametrii URL corecți.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 mt-6 text-xs text-zinc-600">
                    <Users className="w-3.5 h-3.5" />
                    <span>GHL Pontaj App · Configurare Admin</span>
                </div>
            </div>
        </div>
    );
}
