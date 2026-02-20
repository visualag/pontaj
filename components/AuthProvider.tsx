'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface UserData {
    userId: string;
    userName: string;
    email: string;
    role: string;
    locationId?: string;
    isOwner?: boolean;
    urlRole?: string; // GHL-claimed role from URL — for first-run UI only, never for security
}

interface AuthContextType {
    user: UserData | null;
    loading: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    urlClaimsAdmin: boolean; // GHL URL claims admin — only for first-run setup UI
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    isOwner: false,
    urlClaimsAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const searchParams = useSearchParams();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userId = searchParams.get('user_id') || searchParams.get('userId');
        const userName = searchParams.get('name') || searchParams.get('userName') || 'Unknown';
        const email = searchParams.get('email') || '';
        const locationId = searchParams.get('location_id') || searchParams.get('locationId');

        // Capture GHL's claimed role — multiple possible param names GHL might send
        const urlRole =
            searchParams.get('role') ||
            searchParams.get('user_type') ||
            searchParams.get('type') ||
            'user';

        if (userId) {
            // Set optimistic state immediately — page renders FAST, no waiting for DB
            const optimisticUser = { userId, userName, email, role: 'user', locationId: locationId || undefined, urlRole };
            setUser(optimisticUser);
            setLoading(false); // ← IMMEDIATELY show the page, don't wait for DB

            // Then silently upgrade role from DB in background (no loading spinner)
            fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userName, email, locationId })
                // NOTE: Never send 'role' — DB is authoritative, URL role is never trusted for security
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        // Silently upgrade role from DB without showing loading
                        setUser(prev => ({
                            ...prev!,
                            ...data.user,
                            urlRole // preserve URL-claimed role for first-run UI detection
                        }));
                    }
                })
                .catch(err => console.error('Failed to sync user with DB:', err));
            // No .finally(setLoading) — loading was already set to false above
        } else {
            setLoading(false);
        }
    }, [searchParams]);

    // DB-authoritative checks (updated after background sync)
    const isAdmin = user?.role === 'admin' || user?.isOwner === true;
    const isOwner = user?.isOwner === true;

    // GHL URL claims admin — ONLY used for first-run setup widget visibility
    // Never use this for actual access control decisions
    const urlClaimsAdmin =
        user?.urlRole === 'admin' ||
        user?.urlRole === 'agency' ||
        user?.urlRole === 'Agency';

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, isOwner, urlClaimsAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};
