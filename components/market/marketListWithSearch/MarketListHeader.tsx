import React from 'react';

import { SortableHeader } from './SortableHeader';

import { SortConfig, MarketListItem } from '@/types/MarketList';

interface Props {
    sortConfig: SortConfig;
    handleSort: (key: keyof MarketListItem) => void;
    isSortActive: boolean;
}

export const MarketListHeader: React.FC<Props> = ({ sortConfig, handleSort, isSortActive }) => (
    <div className="flex justify-between items-center px-4 pb-2 border-b border-zinc-800">
        <div className="text-xs text-zinc-400">Symbol</div>
        <div className="flex items-center space-x-4">
            <SortableHeader isSortActive={isSortActive} sortConfig={sortConfig} sortKey="volume" onSort={handleSort}>Vol</SortableHeader>
            <SortableHeader isSortActive={isSortActive} sortConfig={sortConfig} sortKey="lastPrice" onSort={handleSort}>Price</SortableHeader>
            <SortableHeader isSortActive={isSortActive} sortConfig={sortConfig} sortKey="dailyChange" onSort={handleSort}>24h %</SortableHeader>
        </div>
    </div>
);
