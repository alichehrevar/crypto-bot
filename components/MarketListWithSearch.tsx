import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {Tab, Tabs} from "@heroui/react";

// --- TYPE DEFINITIONS ---
interface SymbolData {
    id: number;
    symbol: string;
    category: 'Spot' | 'USDT-M' | 'New Listing';
    broker: 'Binance' | 'OKX' | 'Bybit' | 'BingX';
    volume: number;
    lastPrice: number;
    dailyChange: number;
    isFavorite: boolean;
}

interface SortConfig {
    key: keyof SymbolData | null;
    direction: 'ascending' | 'descending';
}

interface SearchBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

interface MainTabsProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

interface FilterChipsProps {
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
}

interface SortableHeaderProps {
    children: React.ReactNode;
    sortKey: keyof SymbolData;
    sortConfig: SortConfig;
    onSort: (key: keyof SymbolData) => void;
    isSortActive: boolean;
}

interface SymbolRowProps {
    symbol: SymbolData;
    onToggleFavorite: (id: number) => void;
    activeMainTab: string;
    style: React.CSSProperties;
}

interface SkeletonRowProps {
    style: React.CSSProperties;
}

// --- SVG ICONS ---
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
);

const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg" {...props}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

// --- MOCK DATA ---
const generateInitialData = (): SymbolData[] => {
    const brokers: SymbolData['broker'][] = ['Binance', 'OKX', 'Bybit', 'BingX'];
    const categories: SymbolData['category'][] = ['Spot', 'USDT-M', 'New Listing'];
    const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'TRX', 'MATIC', 'LTC', 'BCH', 'SHIB', 'LEO'];
    let data: SymbolData[] = [];

    for (let i = 0; i < 200; i++) {
        const symbolBase = symbols[i % symbols.length];
        const category = categories[i % categories.length];
        const isSpot = category === 'Spot';

        data.push({
            id: i,
            symbol: `${symbolBase}/${isSpot ? 'USDT' : 'PERP'}`,
            category: category,
            broker: brokers[i % brokers.length],
            volume: Math.random() * 100000000,
            lastPrice: Math.random() * 70000,
            dailyChange: (Math.random() - 0.5) * 10,
            isFavorite: Math.random() > 0.8,
        });
    }

    return data;
};

// --- HELPER COMPONENTS ---
const BrokerLogo: React.FC<{ broker: string }> = ({ broker }) => {
    const logoSize = "w-4 h-4";

    switch (broker) {
        case 'Binance': return <svg className={logoSize} viewBox="0 0 96 96"><path d="M48 0L96 48L48 96L0 48L48 0ZM21 48L48 21L75 48L48 75L21 48Z" fill="#F0B90B" /><path d="M33 48L48 33L63 48L48 63L33 48Z" fill="#F0B90B" /></svg>;
        case 'OKX': return <svg className={logoSize} viewBox="0 0 24 24"><path className="text-green-500" d="M10.6,13.4H13.4V10.6H10.6V13.4ZM24,12A12,12,0,1,0,12,24,12,12,0,0,0,24,12ZM8.4,8.4H5.6V5.6H8.4v2.8ZM5.6,18.4H8.4V15.6H5.6v2.8Zm2.8-5.6H5.6V10.6H8.4v2.2Zm5.6,5.6H10.6V15.6h2.8v2.8Zm5.6-5.6H15.6v2.8h2.8V15.6h-2.8v-2.2Zm2.8-2.8H15.6V8.4h2.8V5.6h2.8v5.6Z" fill="currentColor" /></svg>;
        case 'BingX': return <svg className={logoSize} viewBox="0 0 24 24"><path className="text-white" d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm-1.1,14.39L6.3,11.8l1.4-1.4,3.2,3.2,4.9-4.9,1.4,1.4Z" fill="currentColor" /></svg>;
        case 'Bybit': return <div className={`${logoSize} rounded-full bg-gradient-to-br from-white to-green-400`} title="Bybit" />;
        default: return <div className={`${logoSize} rounded-full bg-zinc-600`} title="Unknown Broker" />;
    }
};

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery }) => (
    <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-1.5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white text-[14px]"
            placeholder="Search..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
    </div>
);

const TABS = ['Favorites', 'Spot', 'Prep USDT-M'];

const MainTabs: React.FC<MainTabsProps> = ({ activeTab, setActiveTab }) => {

    return (
        <Tabs
            aria-label="tabs-list"
            classNames={{
                tab: 'pb-4'
            }}
            selectedKey={activeTab}
            variant="underlined"
            onSelectionChange={(key) => setActiveTab(key as string)}
        >
            {TABS.map((tab) => (
                <Tab key={tab} title={tab} />
            ))}
        </Tabs>
    );
};

const FilterChips: React.FC<FilterChipsProps> = ({ activeFilter, setActiveFilter }) => {
    const filters = ['All', 'New Listing'];

    return (
        <div className="flex items-center space-x-2 p-4">
            {filters.map(filter => (
                <button key={filter} className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${activeFilter === filter ? 'bg-white text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                        onClick={() => setActiveFilter(filter)}>
                    {filter}
                </button>
            ))}
        </div>
    );
};

const SortableHeader: React.FC<SortableHeaderProps> = ({ children, sortKey, sortConfig, onSort, isSortActive }) => {
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

const SymbolRow = React.memo<SymbolRowProps>(({ symbol, onToggleFavorite, activeMainTab, style }) => {
    const formatVolume = (vol: number) => (vol >= 1_000_000 ? `${(vol / 1_000_000).toFixed(2)}M` : vol >= 1_000 ? `${(vol / 1_000).toFixed(2)}K` : vol.toFixed(2));
    const formatPrice = (price: number) => price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: price > 1 ? 2 : 6 });

    const priceColor = symbol.dailyChange >= 0 ? 'text-green-500' : 'text-red-500';
    const categoryTagMap: Record<string, string> = { 'Spot': 'Spot', 'USDT-M': 'USDT-M', 'New Listing': 'USDT-M' };

    return (
        <div className={`flex items-center px-4 border-b border-zinc-800`} style={style}>
            <button className="mr-3" onClick={() => onToggleFavorite(symbol.id)}>
                <StarIcon className={`${symbol.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'} hover:text-yellow-400`} />
            </button>
            <div className="flex-1 py-3">
                <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{symbol.symbol}</span>
                    <BrokerLogo broker={symbol.broker} />
                    {activeMainTab === 'Favorites' && <span className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 text-[10px] rounded">{categoryTagMap[symbol.category] || symbol.category}</span>}
                </div>
                <div className="text-xs text-zinc-400 mt-1">Vol {formatVolume(symbol.volume)}</div>
            </div>
            <div className="text-right">
                <div className="font-semibold text-sm text-white">{formatPrice(symbol.lastPrice)}</div>
                <div className={`text-xs mt-1 ${priceColor}`}>{symbol.dailyChange.toFixed(2)}%</div>
            </div>
        </div>
    );
});

// CORRECTED: Added a displayName to satisfy the ESLint rule.
SymbolRow.displayName = 'SymbolRow';

const SkeletonRow: React.FC<SkeletonRowProps> = ({ style }) => (
    <div className="flex items-center px-4 py-3 border-b border-zinc-800" style={style}>
        <div className="w-4 h-4 bg-zinc-700 rounded-full mr-3 animate-pulse" />
        <div className="flex-1">
            <div className="flex items-center space-x-2">
                <div className="w-20 h-4 bg-zinc-700 rounded animate-pulse" />
                <div className="w-4 h-4 bg-zinc-700 rounded-full animate-pulse" />
            </div>
            <div className="w-16 h-3 bg-zinc-700 rounded mt-2 animate-pulse" />
        </div>
        <div className="text-right">
            <div className="w-24 h-4 bg-zinc-700 rounded animate-pulse" />
            <div className="w-12 h-3 bg-zinc-700 rounded mt-2 ml-auto animate-pulse" />
        </div>
    </div>
);

// --- MAIN COMPONENT ---
export default function MarketListWithSearch() {
    // --- STATE MANAGEMENT ---
    const [symbols, setSymbols] = useState<SymbolData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
    const [activeMainTab, setActiveMainTab] = useState<string>('Spot');
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'volume', direction: 'descending' });
    const [isSortActive, setIsSortActive] = useState<boolean>(false);

    // --- REFS & VIRTUALIZATION STATE ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    const ROW_HEIGHT = 65;

    // --- DATA & STATE MANAGEMENT EFFECTS ---
    useEffect(() => {
        setTimeout(() => {
            setSymbols(generateInitialData());
            setLoading(false);
        }, 1500);
    }, []);

    useEffect(() => {
        if (loading) return;
        const interval = setInterval(() => {
            setSymbols(prevSymbols =>
                prevSymbols.map(s => {
                    const change = (Math.random() - 0.5) * 0.02;
                    const newPrice = s.lastPrice * (1 + change);

                    return { ...s, lastPrice: newPrice, dailyChange: s.dailyChange + change * 10 };
                })
            );
        }, 10000);

        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 200);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // --- SORTING LOGIC ---
    const handleSort = (key: keyof SymbolData) => {
        setIsSortActive(true);
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending',
        }));
    };

    const filteredAndSortedSymbols = useMemo(() => {
        let filtered = [...symbols];

        switch (activeMainTab) {
            case 'Favorites': filtered = filtered.filter(s => s.isFavorite); break;
            case 'Spot': filtered = filtered.filter(s => s.category === 'Spot'); break;
            case 'Prep USDT-M': filtered = filtered.filter(s => s.category === 'USDT-M' || s.category === 'New Listing'); break;
            default: break;
        }
        if (activeFilter !== 'All') {
            filtered = filtered.filter(s => s.category === activeFilter);
        }
        if (debouncedSearchQuery) {
            filtered = filtered.filter(s => s.symbol.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
        }
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

    // --- VIRTUALIZATION LOGIC ---
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
        const container = scrollContainerRef.current;

        if (container) {
            container.addEventListener('scroll', handleScroll);

            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
        setVisibleRange({ start: 0, end: 20 });
        setSortConfig({ key: 'volume', direction: 'descending' });
        setIsSortActive(false);
    }, [debouncedSearchQuery, activeMainTab, activeFilter]);


    const visibleItems = useMemo(() =>
            filteredAndSortedSymbols.slice(visibleRange.start, visibleRange.end),
        [filteredAndSortedSymbols, visibleRange]
    );

    const paddingTop = visibleRange.start * ROW_HEIGHT;

    // --- RENDER ---
    return (
        <>
            <div className="bg-dark-gray text-white w-full h-full rounded-lg shadow-2xl pt-4 flex flex-col">
                <div className="p-4 pt-1">
                    <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                </div>
                <MainTabs activeTab={activeMainTab} setActiveTab={setActiveMainTab} />
                <FilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                <div className="flex justify-between items-center px-4 pb-2 border-b border-zinc-800">
                    <div className="text-xs text-zinc-400">Symbol</div>
                    <div className="flex items-center space-x-4">
                        <SortableHeader isSortActive={isSortActive} sortConfig={sortConfig} sortKey="volume" onSort={handleSort}>Vol</SortableHeader>
                        <SortableHeader isSortActive={isSortActive} sortConfig={sortConfig} sortKey="lastPrice" onSort={handleSort}>Price</SortableHeader>
                        <SortableHeader isSortActive={isSortActive} sortConfig={sortConfig} sortKey="dailyChange" onSort={handleSort}>24h %</SortableHeader>
                    </div>
                </div>
                <div ref={scrollContainerRef} className="overflow-y-auto scrollbar-hide flex-grow">
                    {loading ? (
                        Array.from({length: 5}).map((_, i) =>
                            <SkeletonRow key={i} style={{height: `${ROW_HEIGHT}px`}}/>
                        )
                    ) : (
                        <div className="relative h-full">
                            <div style={{ position: 'absolute', top: `${paddingTop}px`, width: '100%' }}>
                                {visibleItems.length > 0 ? (
                                    visibleItems.map((symbol) => (
                                        <SymbolRow
                                            key={symbol.id}
                                            activeMainTab={activeMainTab}
                                            style={{ height: `${ROW_HEIGHT}px` }}
                                            symbol={symbol}
                                            onToggleFavorite={(id) => setSymbols(p => p.map(s => s.id === id ? {...s, isFavorite: !s.isFavorite} : s))}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-zinc-500">No symbols found.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
