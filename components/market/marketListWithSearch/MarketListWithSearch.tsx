'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

// Hooks
import { useMarketList } from '@/hooks/marketListWithSearch/useMarketList';
// Components
import { SearchBar } from '@/components/market/marketListWithSearch/SearchBar';
import { MainTabs } from '@/components/market/marketListWithSearch/MainTabs';
import { FilterChips } from '@/components/market/marketListWithSearch/FilterChips';
import { MarketListHeader } from '@/components/market/marketListWithSearch/MarketListHeader';
import { SymbolRow } from '@/components/market/marketListWithSearch/SymbolRow';
import { SkeletonRow } from '@/components/loading/marketListWithSearch/SkeletonRow';
import {MarketListItem} from "@/types/MarketList";

const ROW_HEIGHT = 65; // Define as a constant

interface MarketListPageProps {
    onSymbolClickAction: (symbol: MarketListItem) => void;
}

export default function MarketListWithSearch({ onSymbolClickAction }: MarketListPageProps) {
    const {
        loading,
        filteredAndSortedSymbols,
        searchQuery,
        setSearchQuery,
        activeMainTab,
        setActiveMainTab,
        activeFilter,
        setActiveFilter,
        sortConfig,
        handleSort,
        isSortActive,
        handleToggleFavorite,
    } = useMarketList();

    // --- VIRTUALIZATION LOGIC ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

    const handleScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollTop, clientHeight } = scrollContainerRef.current;
            const start = Math.floor(scrollTop / ROW_HEIGHT);
            const end = Math.min(filteredAndSortedSymbols.length, start + Math.ceil(clientHeight / ROW_HEIGHT) + 5);

            if (start !== visibleRange.start || end !== visibleRange.end) {
                setVisibleRange({ start, end });
            }
        }
    }, [filteredAndSortedSymbols.length, visibleRange.start, visibleRange.end]);

    useEffect(() => {
        if (!loading) {
            const btcBitcoinSymbol = filteredAndSortedSymbols.find(symbol => symbol.id === 'bitcoin');

            if (btcBitcoinSymbol) {
                onSymbolClickAction(btcBitcoinSymbol);
            }
        }
    }, [loading])

    useEffect(() => {
        const container = scrollContainerRef.current;

        if (container) {
            container.addEventListener('scroll', handleScroll);

            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // Reset scroll on data change
    useEffect(() => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
        setVisibleRange({ start: 0, end: 20 });
    }, [filteredAndSortedSymbols]);

    const visibleItems = useMemo(() =>
            filteredAndSortedSymbols.slice(visibleRange.start, visibleRange.end),
        [filteredAndSortedSymbols, visibleRange]
    );
    const paddingTop = visibleRange.start * ROW_HEIGHT;
    const totalHeight = filteredAndSortedSymbols.length * ROW_HEIGHT;

    // --- RENDER ---
    return (
        <div className="bg-dark-gray text-white w-full h-full rounded-lg shadow-2xl pt-4 flex flex-col overflow-y-hidden">
            <div className="px-4 mb-4">
                <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            </div>
            <MainTabs activeTab={activeMainTab} setActiveTab={setActiveMainTab} />
            <FilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
            <MarketListHeader handleSort={handleSort} isSortActive={isSortActive} sortConfig={sortConfig} />

            <div ref={scrollContainerRef} className="overflow-y-auto scrollbar-hide flex-grow">
                <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: `${paddingTop}px`, width: '100%' }}>
                        {loading ? (
                            Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} style={{ height: `${ROW_HEIGHT}px` }} />)
                        ) : visibleItems.length > 0 ? (
                            visibleItems.map((symbol) => (
                                <SymbolRow
                                    key={symbol.id}
                                    activeMainTab={activeMainTab}
                                    style={{ height: `${ROW_HEIGHT}px` }}
                                    symbol={symbol}
                                    onSymbolClick={onSymbolClickAction}
                                    onToggleFavorite={handleToggleFavorite}
                                />
                            ))
                        ) : (
                            <div className="text-center py-10 text-zinc-500">No symbols found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
