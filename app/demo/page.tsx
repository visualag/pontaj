'use client';

import { useState, useEffect } from 'react';
import { Play, Square, History, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function DemoPage() {
    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    const [dbLatency, setDbLatency] = useState<number>(0);
    const [logs, setLogs] = useState<any[]>([]);

    // Simulation state
    const [activeSession, setActiveSession] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        const start = Date.now();
        try {
            // Create a specific health check endpoint or just try to fetch logs with a fake ID to test DB
            const res = await fetch('/api/logs?userId=DEMO_TEST');
            const end = Date.now();
            setDbLatency(end - start);

            if (res.ok) {
                setDbStatus('connected');
            } else {
                setDbStatus('error');
            }
        } catch (e) {
            setDbStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 p-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Status Header */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <h1 className="text-2xl font-bold mb-4">Diagnostic & Demo Mode</h1>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Database Connection:</span>
                            {dbStatus === 'checking' && <span className="text-yellow-600 animate-pulse">Checking...</span>}
                            {dbStatus === 'connected' && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Connected ({dbLatency}ms)</span>}
                            {dbStatus === 'error' && <span className="text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Failed</span>}
                        </div>
                        {dbStatus === 'error' && (
                            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                Daca conexiunea esueaza, asigura-te ca in MongoDB Atlas ai adaugat IP-ul <code>0.0.0.0/0</code> la Network Access.
                            </p>
                        )}
                    </div>
                </div>

                {/* Mock UI Demo */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 opacity-75">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-bl-lg">
                        PREVIEW ONLY
                    </div>

                    <h2 className="text-xl font-semibold mb-6">User Interface Preview</h2>
                    <p className="mb-4 text-zinc-500">Aceasta este interfata pe care o vede angajatul cand intra din GHL.</p>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex flex-col items-center justify-center space-y-4">
                            <div className={`p-4 rounded-full ${activeSession ? 'bg-green-100' : 'bg-blue-100'}`}>
                                <Clock className="w-8 h-8 text-blue-600" />
                            </div>
                            <button
                                onClick={() => setActiveSession(!activeSession)}
                                className={`w-full py-3 px-6 rounded-xl font-medium text-white transition-colors ${activeSession ? 'bg-rose-600' : 'bg-blue-600'}`}
                            >
                                {activeSession ? 'Stop Pontaj' : 'Start Pontaj'}
                            </button>
                        </div>

                        <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                            <h3 className="font-medium mb-3 flex items-center gap-2">
                                <History className="w-4 h-4" /> Istoric
                            </h3>
                            <div className="space-y-2 text-sm text-zinc-500">
                                <div className="flex justify-between p-2 bg-white dark:bg-zinc-700/50 rounded">
                                    <span>Azi</span>
                                    <span>8h 30m</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white dark:bg-zinc-700/50 rounded">
                                    <span>Ieri</span>
                                    <span>8h 15m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
