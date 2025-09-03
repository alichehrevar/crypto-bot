import React from 'react';

import { SortConfig, MarketListItem } from '@/types/MarketList';

interface Props {
    children: React.ReactNode;
    sortKey: keyof MarketListItem;
    sortConfig: SortConfig;
    onSort: (key: keyof MarketListItem) => void;
    isSortActive: boolean;
}

export const SortableHeader: React.FC<Props> = ({ children, sortKey, sortConfig, onSort, isSortActive }) => {
    const isVisuallySorted = isSortActive && sortConfig.key === sortKey;
    const direction = sortConfig.key === sortKey ? sortConfig.direction : 'none';

    return (
        <button className="flex items-center text-xs text-zinc-400 group" onClick={() => onSort(sortKey)}>
            <span className="group-hover:text-white transition-colors">{children}</span>
            <div className="ml-1.5 flex flex-col">
                <svg className={`transition-colors ${isVisuallySorted && direction === 'ascending' ? 'text-white' : 'text-zinc-500'}`} height="4" viewBox="0 0 8 4" width="8"><path d="M4 0L8 4H0L4 0Z" fill="currentColor" /></svg>
                <svg className={`mt-0.5 transition-colors ${isVisuallySorted && direction === 'descending' ? 'text-white' : 'text-zinc-500'}`} height="4" viewBox="0 0 8 4" width="8"><path d="M4 4L0 0H8L4 4Z" fill="currentColor" /></svg>
            </div>
        </button>
    );
};
