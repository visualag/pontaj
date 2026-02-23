'use client';

import { useAuth } from "@/components/AuthProvider";
import UserDashboard from "@/components/UserDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import FirstRunSetup from "@/components/FirstRunSetup";

export default function Home() {
  const { user, loading, isAdmin, urlClaimsAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto"></div>
          <p className="text-zinc-400 text-sm">Se initializeaza...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4 text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          GHL Pontaj App
        </h1>
        <div className="max-w-md bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-300 mb-6">
            Aceasta aplicatie este destinata utilizarii direct din GoHighLevel CRM.
            Te rugam sa o accesezi prin meniul Custom Link.
          </p>
          <p className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg font-mono">
            Error: Missing user_id parameter
          </p>
        </div>
      </div>
    );
  }

  // Admin confirmat în DB SAU confirmat doar de GHL URL (optimist)
  // Randăm dashboard-ul imediat pentru a evita flickering-ul și dispariția calendarului
  if (isAdmin || urlClaimsAdmin) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 pt-10">
        <AdminDashboard />
      </main>
    );
  }

  // Regular user
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 pt-10">
      <UserDashboard />
    </main>
  );
}
