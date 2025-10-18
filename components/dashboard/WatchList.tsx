'use client';

import React, { useState, useEffect, useRef, useCallback, DragEvent } from 'react';
import Image from "next/image";
import {addToast} from "@heroui/react";

import {DataItem, WatchListApiResponse} from "@/types/WatchList";
import {getData} from "@/actions/get";

const MAX_WATCHLIST_ITEMS = 6;

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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


// WatchlistItem Component
interface WatchlistItemProps {
    crypto: DataItem;
    onDragStart: (e: DragEvent<HTMLDivElement>, symbol: string) => void;
    onDragEnter: (e: DragEvent<HTMLDivElement>, symbol: string) => void;
    onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
    isDragging: boolean;
}

const WatchlistItem: React.FC<WatchlistItemProps> = ({ crypto, onDragStart, onDragEnter, onDragEnd, isDragging }) => (
    <div
        draggable
        className={`flex items-center justify-between gap-2 rounded-lg cursor-grab transition-opacity ${isDragging ? 'opacity-50 bg-gray-700' : 'bg-transparent'}`}
        onDragEnd={onDragEnd}
        onDragEnter={(e) => onDragEnter(e, crypto.symbol)}
        onDragOver={(e) => e.preventDefault()}
        onDragStart={(e) => onDragStart(e, crypto.symbol)}
    >
        <div className="flex items-center gap-3 pointer-events-none space-x-8 w-6 h-6 relative">
            <Image fill alt={crypto.symbol} className="w-6 h-6" src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${crypto.symbol.split('/')[0].toLowerCase()}.png`} />
            <span className="text-white font-medium">{crypto.symbol}</span>
        </div>
        <div className="text-right pointer-events-none">
            <div className="text-white">{formatCurrency(crypto.marketData.price)}</div>
            <div className={`text-xs ${crypto.marketData.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {crypto.marketData.change24h >= 0 ? '+' : ''}{crypto.marketData.change24h.toFixed(2)}%
            </div>
        </div>
    </div>
);


// AddSymbolModal Component
interface AddSymbolModalProps {
    isOpen: boolean;
    onClose: () => void;
    watchlist: DataItem[];
    addToWatchlist: (symbol: string) => void;
    removeFromWatchlist: (symbol: string) => void;
}

const AddSymbolModal: React.FC<AddSymbolModalProps> = ({ isOpen, onClose, watchlist, addToWatchlist, removeFromWatchlist }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [message, setMessage] = useState('');
    const [isActionMessage, setIsActionMessage] = useState(false);
    const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const modalPanelRef = useRef<HTMLButtonElement>(null);

    const watchlistSymbols = watchlist.map(c => c.symbol);

    const filteredCryptos = searchTerm
        ? watchlist.filter(c =>
            c.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.marketData.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : watchlist;

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

    const handleAdd = (symbol: string) => {
        if (watchlist.length >= MAX_WATCHLIST_ITEMS) {
            showMessage('Watchlist is full. Cannot add more symbols.', true);

            return;
        }
        addToWatchlist(symbol);
        showMessage(`${symbol} added to watchlist`, true);
    };

    const handleRemove = (symbol: string) => {
        removeFromWatchlist(symbol);
        showMessage(`${symbol} removed from watchlist`, true);
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
                    {filteredCryptos.length > 0 ? (
                        filteredCryptos.map(crypto => {
                            const isInWatchlist = watchlistSymbols.includes(crypto.symbol);

                            return (
                                <div key={crypto.symbol} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-3 w-8 h-8 relative">
                                        <Image fill alt={crypto.symbol} className="w-6 h-6" src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${crypto.symbol.split('/')[0].toLowerCase()}.png`} />
                                        <div>
                                            <div className="font-bold text-white text-start">{crypto.symbol}</div>
                                            <div className="text-sm text-gray-400">{crypto.symbol}</div>
                                        </div>
                                    </div>
                                    {isInWatchlist ? (
                                        <button className="text-xs font-bold text-center w-20 py-1 px-3 rounded-md transition-colors text-gray-400 bg-gray-700 hover:bg-gray-600" onClick={() => handleRemove(crypto.symbol)}>
                                            Remove
                                        </button>
                                    ) : (
                                        <button className="text-xs font-bold text-center w-20 py-1 px-3 rounded-md transition-colors text-black bg-white hover:bg-gray-200" onClick={() => handleAdd(crypto.symbol)}>
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
    const [watchlist, setWatchlist] = useState<DataItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // --- Drag and Drop State and Handlers ---
    const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);

    useEffect(() => {
        async function fetchWatchList() {
            return await getData('/user/favorites/list')
        }

        fetchWatchList()
            .then((response: WatchListApiResponse) => {
                if (response.success) {
                    setWatchlist(response.data)
                } else {
                    addToast({
                        title: response.message,
                        color: 'warning'
                    })
                }
            })
            .catch(() => {
                addToast({
                    title: 'Failed to load watchlist',
                    color: 'danger'
                })
            })
            .finally(() => setIsLoading(false))
    }, []);

    const handleDragStart = (e: DragEvent<HTMLDivElement>, symbol: string) => {
        setDraggedSymbol(symbol);
        // This makes the drag image more transparent
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
        }
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>, targetSymbol: string) => {
        e.preventDefault();
        if (draggedSymbol === null || draggedSymbol === targetSymbol) return;

        const draggedIndex = watchlist.findIndex(c => c.symbol === draggedSymbol);
        const targetIndex = watchlist.findIndex(c => c.symbol === targetSymbol);

        const newWatchlist = [...watchlist];
        const [removed] = newWatchlist.splice(draggedIndex, 1);

        newWatchlist.splice(targetIndex, 0, removed);

        setWatchlist(newWatchlist);
    };

    const handleDragEnd = () => {
        setDraggedSymbol(null);
    };

    const addToWatchlist = (symbol: string) => {
        if (watchlist.length < MAX_WATCHLIST_ITEMS && !watchlist.some(c => c.symbol === symbol)) {
            const cryptoToAdd = watchlist.find(c => c.symbol === symbol);

            if (cryptoToAdd) {
                setWatchlist(prev => [...prev, cryptoToAdd]);
            }
        }
    };

    const removeFromWatchlist = (symbol: string) => {
        setWatchlist(prev => prev.filter(c => c.symbol !== symbol));
    };

    return (
        <div className="flex items-center justify-center font-sans antialiased h-full text-white">
            <div className="w-full p-6 ua-card h-full">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-lg text-white">My Watchlist</h4>
                    <button className="text-gray-400 hover:text-white transition-colors" title="Add Symbol" onClick={() => setIsModalOpen(true)}>
                        <PlusIcon />
                    </button>
                </div>
                {isLoading
                    ? <div className="flex items-center justify-center min-h-[230px]">loading ...</div>
                    : <div
                        className="flex flex-col gap-2"
                        onDragOver={(e) => e.preventDefault()} // Necessary to allow drop
                    >
                        {watchlist.map(crypto => (
                            <WatchlistItem
                                key={crypto.symbol}
                                crypto={crypto}
                                isDragging={draggedSymbol === crypto.symbol}
                                onDragEnd={handleDragEnd}
                                onDragEnter={handleDragEnter}
                                onDragStart={handleDragStart}
                            />
                        ))}
                    </div>
                }
            </div>

            <AddSymbolModal
                addToWatchlist={addToWatchlist}
                isOpen={isModalOpen}
                removeFromWatchlist={removeFromWatchlist}
                watchlist={watchlist}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default Watchlist;
