'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface UserData {
    userId: string;
    userName: string;
    email: string;
    role: string; // 'user' | 'admin'
}

interface AuthContextType {
    user: UserData | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const searchParams = useSearchParams();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Try to get from URL first
        const userId = searchParams.get('user_id') || searchParams.get('userId');
        const userName = searchParams.get('name') || searchParams.get('userName') || 'Unknown';
        const email = searchParams.get('email') || '';
        const role = searchParams.get('role') || 'user';

        if (userId) {
            const userData = { userId, userName, email, role };
            setUser(userData);

            // Upsert user to database for Team view visibility
            fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            }).catch(err => console.error('Failed to sync user', err));

            // Optional: Persist to sessionStorage if you want to survive refreshes without params,
            // but GHL usually keeps simple iframes or opens new tabs with params.
            // sessionStorage.setItem('ghl_user', JSON.stringify(userData));
        } else {
            // Check storage? Or just fail?
            // For now, if no params, we might be in a direct visit or reload.
            // const stored = sessionStorage.getItem('ghl_user');
            // if (stored) setUser(JSON.parse(stored));
        }
        setLoading(false);
    }, [searchParams]);

    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};
