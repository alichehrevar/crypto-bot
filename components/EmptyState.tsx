'use client';
import { useEffect, useState } from 'react';

import { EmptyBoxIcon } from './Icons';

export const EmptyState = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`empty-state ${isVisible ? 'visible' : ''} flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg border-border`}>
            <EmptyBoxIcon />
            <p className="mt-4 text-lg text-text-secondary">No active bots</p>
            <p className="mt-1 text-sm text-text-secondary">Click &#39;Deploy New&#39; to get started.</p>
        </div>
    );
};
