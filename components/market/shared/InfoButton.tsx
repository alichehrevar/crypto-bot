// ───────────────────────────────────────────────────────────────────────────────
// components/market/shared/InfoButton.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function InfoButton({ title, content }: { title: string; content: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement | null>(null);

    const handleClickOutside = useCallback((ev: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(ev.target as Node)) {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside, true);

        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [handleClickOutside]);

    return (
        <div ref={popupRef} className="infoButtonContainer">
            <button aria-label={`Information about ${title}`} className="infoButton" onClick={() => setIsOpen(v => !v)}>
                i
            </button>
            {isOpen && (
                <div className="infoPopup" role="dialog">
                    <h4>{title}</h4>
                    <p>{content}</p>
                </div>
            )}
        </div>
    );
}
