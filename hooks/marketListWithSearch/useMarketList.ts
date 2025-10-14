import { useState, useEffect, useMemo, useCallback } from 'react';
import { addToast } from "@heroui/react";

import { useDebounce } from './useDebounce';

import { MarketListItem, MarketListResponse, SortConfig } from '@/types/MarketList';
import { getData } from "@/actions/get";
import { sendRequest } from "@/actions/post";

export function useMarketList() {
    // Raw Data State
    const [symbols, setSymbols] = useState<MarketListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // UI Control State
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeMainTab, setActiveMainTab] = useState<string>('Spot');
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'volume', direction: 'descending' });
    const [isSortActive, setIsSortActive] = useState<boolean>(false);

    // Debounce search query to avoid re-filtering on every keystroke
    const debouncedSearchQuery = useDebounce(searchQuery, 200);

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchMarketData = async () => {
            setLoading(true);
            try {
                const response: MarketListResponse = await getData('/market/market-list');

                if (response.success) setSymbols(response.data);
                else addToast({ title: response.message || 'Failed to load market list', color: 'danger' });
            } catch (error: any) {
                addToast({ title: error.message || 'An error occurred', color: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        fetchMarketData();
    }, []);

    // --- EVENT HANDLERS ---
    const handleToggleFavorite = useCallback(async (symbolToToggle: MarketListItem) => {
        const originalSymbols = [...symbols];

        // Optimistic update
        setSymbols(prev => prev.map(s => s.id === symbolToToggle.id ? { ...s, isFavorite: !s.isFavorite } : s));

        try {
            const payload = { symbol: symbolToToggle.symbol, broker: symbolToToggle.broker, category: symbolToToggle.category };
            const response = await sendRequest(payload, '/user/favorites/toggle');

            if (!response.success) {
                addToast({ title: response.message || 'Failed to update favorite', color: 'danger' });
                setSymbols(originalSymbols); // Revert on failure
            } else {
                addToast({ title: response.message, color: 'success' });
            }
        } catch (error: any) {
            addToast({ title: error.message || 'An error occurred', color: 'danger' });
            setSymbols(originalSymbols); // Revert on error
        }
    }, [symbols]);

    const handleSort = (key: keyof MarketListItem) => {
        setIsSortActive(true);
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending' }));
    };

    // --- FILTERING & SORTING ---
    const filteredAndSortedSymbols = useMemo(() => {
        let filtered = [...symbols];

        // Tab filtering
        switch (activeMainTab) {
            case 'Favorites': filtered = filtered.filter(s => s.isFavorite); break;
            case 'Spot': filtered = filtered.filter(s => s.category === 'Spot'); break;
            case 'Prep USDT-M': filtered = filtered.filter(s => ['Perpetual', 'New Listing'].includes(s.category)); break;
        }
        // Chip filtering
        if (activeFilter !== 'All') filtered = filtered.filter(s => s.category === activeFilter);
        // Search filtering
        if (debouncedSearchQuery) filtered = filtered.filter(s => s.symbol.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
        // Sorting
        if (sortConfig.key) {
            const sortKey = sortConfig.key;

            filtered.sort((a, b) => {
                const aValue = a[sortKey];
                const bValue = b[sortKey];

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;

                return 0;
            });
        }

        return filtered;
    }, [symbols, debouncedSearchQuery, activeMainTab, activeFilter, sortConfig]);

    // --- RESET SORT ON TAB/FILTER CHANGE ---
    useEffect(() => {
        setSortConfig({ key: 'volume', direction: 'descending' });
        setIsSortActive(false);
    }, [debouncedSearchQuery, activeMainTab, activeFilter]);


    return {
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
    };
}
