'use client';

import React, { useState, useEffect, useRef, useCallback, DragEvent, useMemo } from 'react';
// --- IMPORT HOOKS & TYPES ---
import Image from "next/image";

import { useMarketList } from '@/hooks/marketListWithSearch/useMarketList';
import { MarketListItem } from '@/types/MarketList';

// --- CONSTANTS ---
const MAX_WATCHLIST_ITEMS = 6;

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number | string) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return '$0.00';
    }

    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

// --- SVG ICONS ---
const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const CloseIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const SearchIcon = () => (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

// --- LOADING SKELETON ---
const WatchlistSkeleton: React.FC = () => (
    <div className="flex items-center justify-between gap-2 rounded-lg h-[44px]">
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-700 animate-pulse" />
            <div className="w-12 h-4 rounded bg-gray-700 animate-pulse" />
        </div>
        <div className="text-right">
            <div className="w-20 h-4 rounded bg-gray-700 animate-pulse mb-1" />
            <div className="w-12 h-3 rounded bg-gray-700 animate-pulse ml-auto" />
        </div>
    </div>
);


// --- INDIVIDUAL COMPONENTS ---

// WatchlistItem Component
interface WatchlistItemProps {
    crypto: MarketListItem;
    onDragStart: (e: DragEvent<HTMLDivElement>, id: string) => void;
    onDragEnter: (e: DragEvent<HTMLDivElement>, id: string) => void;
    onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
    isDragging: boolean;
}

const WatchlistItem: React.FC<WatchlistItemProps> = ({ crypto, onDragStart, onDragEnter, onDragEnd, isDragging }) => {
    // Dynamically generate icon URL from symbol
    const iconUrl = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${crypto.symbol.split('/')[0].toLowerCase()}.png`;

    return (
        <div
            draggable
            className={`flex items-center justify-between gap-2 rounded-lg cursor-grab transition-opacity ${isDragging ? 'opacity-50 bg-gray-700' : 'bg-transparent'}`}
            onDragEnd={onDragEnd}
            onDragEnter={(e) => onDragEnter(e, crypto.id)}
            onDragOver={(e) => e.preventDefault()}
            onDragStart={(e) => onDragStart(e, crypto.id)}
        >
            <div className="flex items-center gap-3 pointer-events-none w-6 h-6 relative space-x-8">
                <Image fill alt={crypto.symbol} className="w-6 h-6" src={iconUrl || '/images/icons/default.svg'} onError={(e) => {
                    e.currentTarget.src = '/images/icons/default.svg';
                }} />
                <span className="text-white font-medium">{crypto.symbol}</span>
            </div>
            <div className="text-right pointer-events-none">
                <div className="text-white">{formatCurrency(crypto.lastPrice)}</div>
                <div className={`text-xs ${crypto.dailyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {crypto.dailyChange >= 0 ? '+' : ''}{crypto.dailyChange?.toFixed(2)}%
                </div>
            </div>
        </div>
    );
};


// AddSymbolModal Component
interface AddSymbolModalProps {
    isOpen: boolean;
    onClose: () => void;
    watchlist: MarketListItem[]; // Current favorites
    allSymbols: MarketListItem[]; // All symbols (merged)
    handleToggleFavorite: (symbol: MarketListItem) => void;
    loading: boolean;
}

const AddSymbolModal: React.FC<AddSymbolModalProps> = ({ isOpen, onClose, watchlist, allSymbols, handleToggleFavorite, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [isActionMessage, setIsActionMessage] = useState(false);
    const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const modalPanelRef = useRef<HTMLButtonElement>(null);

    // Use a Set for efficient lookup
    const watchlistSymbolIds = useMemo(() => new Set(watchlist.map(c => c.id)), [watchlist]);

    // --- FIX: Added optional chaining (?.) to prevent error if symbol or name is null/undefined ---
    const filteredCryptos = useMemo(() => {
        if (!searchTerm) {
            return allSymbols;
        }
        const term = searchTerm.toLowerCase();

        return allSymbols.filter(c => {
            const symbolMatch = c.symbol?.toLowerCase().includes(term);
            const nameMatch = c.broker?.toLowerCase().includes(term);

            return symbolMatch || nameMatch;
        });
    }, [allSymbols, searchTerm]);

    const showMessage = useCallback((text: string, isAction: boolean) => {
        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }
        setMessage(text);
        setIsActionMessage(isAction);
        if (isAction) {
            messageTimeoutRef.current = setTimeout(() => {
                setMessage('');
                setIsActionMessage(false);
            }, 2000);
        }
    }, []);

    useEffect(() => {
        const count = watchlist.length;

        if (!isActionMessage) {
            if (count >= MAX_WATCHLIST_ITEMS) {
                showMessage('Watchlist is full', false);
            } else {
                showMessage(`${count} out of ${MAX_WATCHLIST_ITEMS} symbols, add up to ${MAX_WATCHLIST_ITEMS - count} more`, false);
            }
        }
    }, [watchlist.length, isActionMessage, showMessage]);

    const handleAdd = (crypto: MarketListItem) => {
        if (watchlist.length >= MAX_WATCHLIST_ITEMS) {
            showMessage('Watchlist is full. Cannot add more symbols.', true);

            return;
        }
        handleToggleFavorite(crypto);
        showMessage(`${crypto.symbol} added to watchlist`, true);
    };

    const handleRemove = (crypto: MarketListItem) => {
        handleToggleFavorite(crypto);
        showMessage(`${crypto.symbol} removed from watchlist`, true);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <button
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                ref={modalPanelRef}
                className="w-full max-w-md rounded-2xl p-6 border border-gray-700 bg-[#1A1918] transition-all duration-300 ease-out"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Add to Watchlist</h3>
                    <button className="p-1 rounded-full hover:bg-gray-700 transition-colors" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>

                <div className="relative mb-4">
                    <SearchIcon />
                    <input
                        className="w-full bg-transparent border-2 border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                        placeholder="Search symbol (e.g., DOT)"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="text-center text-sm h-5 mb-4 transition-all duration-300">
                    <span className={`${isActionMessage ? 'text-white' : 'text-gray-400'}`}>{message}</span>
                </div>

                <div className="max-h-60 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333333 transparent' }}>
                    {loading ? (
                        <div className="text-center py-4 text-gray-400">Loading symbols...</div>
                    ) : filteredCryptos.length > 0 ? (
                        filteredCryptos.map(crypto => {
                            const isInWatchlist = watchlistSymbolIds.has(crypto.id);
                            const iconUrl = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${crypto.symbol.split('/')[0].toLowerCase()}.png`;

                            return (
                                <div key={crypto.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-3 w-8 h-8 relative space-x-10">
                                        <Image fill alt={crypto.symbol} className="w-8 h-8" src={iconUrl || '/images/icons/default.svg'} onError={(e) => {
                                            e.currentTarget.src = '/images/icons/default.svg';
                                        }} />
                                        <div>
                                            <div className="font-bold text-white text-start">{crypto.symbol}</div>
                                            <div className="text-sm text-gray-400 text-start">{crypto.symbol}</div>
                                        </div>
                                    </div>
                                    {isInWatchlist ? (
                                        <button className="text-xs font-bold text-center w-20 py-1 px-3 rounded-md transition-colors text-gray-400 bg-gray-700 hover:bg-gray-600" onClick={() => handleRemove(crypto)}>
                                            Remove
                                        </button>
                                    ) : (
                                        <button className="text-xs font-bold text-center w-20 py-1 px-3 rounded-md transition-colors text-black bg-white hover:bg-gray-200" onClick={() => handleAdd(crypto)}>
                                            Add
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-4 text-gray-400">No results found.</div>
                    )}
                </div>
            </button>
        </button>
    );
};


// --- Main Watchlist Component ---
const Watchlist: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- HOOK INTEGRATION ---
    // NOTE: This assumes `useMarketList` is modified to return the raw `symbols` array.
    const {
        loading,
        symbols: allSymbols, // This is the raw, unfiltered list from the hook
        handleToggleFavorite,
    } = useMarketList();

    // This state holds the re-orderable list for D&D
    const [displayedWatchlist, setDisplayedWatchlist] = useState<MarketListItem[]>([]);

    // This memo creates the merged/sorted list for the modal
    const allSymbolsForModal = useMemo(() => {
        const uniqueSymbols = new Map<string, MarketListItem>();

        // Create a unique list of symbols
        // This prioritizes a favorited entry if multiple exist
        for (const item of allSymbols) {
            const existing = uniqueSymbols.get(item.symbol);

            if (!existing || (!existing.isFavorite && item.isFavorite)) {
                uniqueSymbols.set(item.symbol, item);
            }
        }

        const allUniqueItems = Array.from(uniqueSymbols.values());

        // Per requirement: "favorites should be first"
        allUniqueItems.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;

            // Optional: sort alphabetically as a fallback
            return a.symbol.localeCompare(b.symbol);
        });

        return allUniqueItems;
    }, [allSymbols]);

    // Update the displayed watchlist when the source data (favorites) changes
    useEffect(() => {
        const allFavoriteItems = allSymbols.filter(s => s.isFavorite);

        // De-duplicate based on symbol. This ensures we only show one "BTC", "ETH", etc.
        const uniqueFavoritesMap = new Map<string, MarketListItem>();

        for (const item of allFavoriteItems) {
            if (!uniqueFavoritesMap.has(item.symbol)) {
                uniqueFavoritesMap.set(item.symbol, item);
            }
        }

        const uniqueFavoriteItems = Array.from(uniqueFavoritesMap.values())
            .slice(0, MAX_WATCHLIST_ITEMS);

        // Only update if the list is different, to preserve D&D reordering
        const currentIds = displayedWatchlist.map(item => item.id).join(',');
        const newIds = uniqueFavoriteItems.map(item => item.id).join(',');

        if (currentIds !== newIds) {
            setDisplayedWatchlist(uniqueFavoriteItems);
        }
        // Add displayedWatchlist to dependency array to prevent stale comparisons
    }, [allSymbols, displayedWatchlist]);


    // --- Drag and Drop State and Handlers (Unchanged) ---
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
        setDraggedId(id);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
        }
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (draggedId === null || draggedId === targetId) return;

        const draggedIndex = displayedWatchlist.findIndex(c => c.id === draggedId);
        const targetIndex = displayedWatchlist.findIndex(c => c.id === targetId);

        const newWatchlist = [...displayedWatchlist];
        const [removed] = newWatchlist.splice(draggedIndex, 1);

        newWatchlist.splice(targetIndex, 0, removed);

        setDisplayedWatchlist(newWatchlist);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        // Here you could optionally save the new order to an API
    };

    return (
        <div className="flex items-center justify-center h-full font-sans antialiased text-white">
            <div className="w-full p-6 ua-card h-full">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-lg text-white">My Watchlist</h4>
                    <button className="text-gray-400 hover:text-white transition-colors" title="Add Symbol" onClick={() => setIsModalOpen(true)}>
                        <PlusIcon />
                    </button>
                </div>
                <div
                    className="flex flex-col gap-2"
                    onDragOver={(e) => e.preventDefault()} // Necessary to allow drop
                >
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => <WatchlistSkeleton key={i} />)
                    ) : displayedWatchlist.length > 0 ? (
                        displayedWatchlist.map(crypto => (
                            <WatchlistItem
                                key={crypto.id}
                                crypto={crypto}
                                isDragging={draggedId === crypto.id}
                                onDragEnd={handleDragEnd}
                                onDragEnter={handleDragEnter}
                                onDragStart={handleDragStart}
                            />
                        ))
                    ) : (
                        <div className="text-center py-5 min-h-[220px] flex items-center justify-center text-zinc-500 text-sm">Your watchlist is empty.</div>
                    )}
                </div>
            </div>

            <AddSymbolModal
                allSymbols={allSymbolsForModal}
                handleToggleFavorite={handleToggleFavorite}
                isOpen={isModalOpen}
                loading={loading}
                watchlist={displayedWatchlist}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default Watchlist;
