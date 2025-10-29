'use client';

import { useEffect } from 'react';

import { useUserStore } from '@/hooks/useUserStore';

export default function SessionHydrator() {
    const userStore = useUserStore();

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/session', { cache: 'no-store' });
                const data = await res.json(); // { role, userId }

                if (!cancelled) userStore.hydrateFromSession({ role: data.role });
            } catch {
                if (!cancelled) userStore.hydrateFromSession({ role: null });
            }
        })();

        return () => { cancelled = true; };
    }, [userStore]);

    return null;
}
