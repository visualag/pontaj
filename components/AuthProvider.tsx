'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface UserData {
    userId: string;
    userName: string;
    email: string;
    role: string;
    locationId?: string;
    companyId?: string;
    isOwner?: boolean;
    urlRole?: string; // GHL-claimed role from URL — for first-run UI only, never for security
}

interface AuthContextType {
    user: UserData | null;
    loading: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    urlClaimsAdmin: boolean;
    urlLocationId: string | null; // Always the locationId from current URL — never overwritten by DB
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    isOwner: false,
    urlClaimsAdmin: false,
    urlLocationId: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const searchParams = useSearchParams();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [urlLocationId, setUrlLocationId] = useState<string | null>(null);

    useEffect(() => {
        const userId = searchParams.get('user_id') || searchParams.get('userId');
        const userName = searchParams.get('name') || searchParams.get('userName') || 'Unknown';
        const email = searchParams.get('email') || '';
        const locationId = searchParams.get('location_id') || searchParams.get('locationId');
        const companyId = searchParams.get('company_id') || searchParams.get('companyId');

        const urlRole =
            searchParams.get('role') ||
            searchParams.get('user_type') ||
            searchParams.get('type') ||
            'user';

        // Store URL locationId separately — never overwritten by DB sync
        const isPlaceholderLoc = !locationId || ['location', '{location.id}', '{{location.id}}'].includes(String(locationId).toLowerCase());
        if (!isPlaceholderLoc) {
            setUrlLocationId(locationId);
        }

        if (userId) {
            const optimisticUser = {
                userId, userName, email,
                role: 'user',
                locationId: locationId || undefined,
                companyId: companyId || undefined,
                urlRole
            };
            setUser(optimisticUser);
            setLoading(false);

            fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userName, email, locationId })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        setUser(prev => ({
                            ...prev!,
                            ...data.user,
                            // Preserve URL locationId if DB has no locationId stored for this user
                            locationId: data.user.locationId || prev?.locationId,
                            urlRole
                        }));
                    }
                })
                .catch(err => console.error('Failed to sync user with DB:', err));
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
        <AuthContext.Provider value={{ user, loading, isAdmin, isOwner, urlClaimsAdmin, urlLocationId }}>
            {children}
        </AuthContext.Provider>
    );
};
