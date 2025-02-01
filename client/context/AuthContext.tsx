'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/types';
import { getApiClient } from '@/lib/api';

type AuthContextType = {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const api = getApiClient();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

                if (token) {
                    const { data } = await api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUser(data.user);
                }
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });

        if (typeof window !== 'undefined') {
            localStorage.setItem('jwt', data.token);
        }

        setUser(data.user);
    };

    const logout = async () => {
        await api.post('/auth/logout');

        if (typeof window !== 'undefined') {
            localStorage.removeItem('jwt');
        }

        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
