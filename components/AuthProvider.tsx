'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface UserData {
    userId: string;
    userName: string;
    email: string;
    role: string; // 'user' | 'admin' — from DB (authoritative)
    locationId?: string;
    isOwner?: boolean;
    // The role GHL claims in URL — used only for first-boot UI decisions, NOT for security
    urlRole?: string;
}

interface AuthContextType {
    user: UserData | null;
    loading: boolean;
    isAdmin: boolean;       // authoritative: from DB
    isOwner: boolean;       // authoritative: from DB
    urlClaimsAdmin: boolean; // optimistic: from GHL URL params (for first-run UI only)
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

        // Capture GHL's claimed role — multiple possible param names
        const urlRole =
            searchParams.get('role') ||
            searchParams.get('user_type') ||
            searchParams.get('type') ||
            'user';

        if (userId) {
            // Set optimistic state immediately so UI renders fast
            setUser({ userId, userName, email, role: 'user', locationId: locationId || undefined, urlRole });

            // Sync with DB to get TRUE authoritative role
            fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userName, email, locationId })
                // NOTE: We intentionally never send 'role' here — DB is authoritative
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        // Merge DB role into state, keep urlRole for first-run UI
                        setUser(prev => ({
                            ...prev!,
                            ...data.user,
                            urlRole // preserve the URL-claimed role for first-run detection
                        }));
                    }
                })
                .catch(err => console.error('Failed to sync user', err))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [searchParams]);

    // DB-authoritative checks
    const isAdmin = user?.role === 'admin' || user?.isOwner === true;
    const isOwner = user?.isOwner === true;

    // GHL URL claims admin — used ONLY for showing first-run setup UI
    // Never use this for access control decisions
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
