import React from 'react';

import { BrokerLogo } from './BrokerLogo';

import { MarketListItem } from '@/types/MarketList';
import { StarIcon } from '@/utils/icons'

interface Props {
    symbol: MarketListItem;
    onToggleFavorite: (symbol: MarketListItem) => void;
    onSymbolClick?: (symbol: MarketListItem) => void;
    activeMainTab: string;
    style: React.CSSProperties;
}

const formatVolume = (vol: number) => (vol >= 1_000_000 ? `${(vol / 1_000_000).toFixed(2)}M` : vol >= 1_000 ? `${(vol / 1_000).toFixed(2)}K` : vol.toFixed(2));
const formatPrice = (price: number) => price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: price > 1 ? 2 : 6 });

export const SymbolRow = React.memo<Props>(({ symbol, onToggleFavorite, onSymbolClick, activeMainTab, style }) => {
    const priceColor = symbol.dailyChange >= 0 ? 'text-green-500' : 'text-red-500';
    const categoryTagMap: Record<string, string> = { 'Spot': 'Spot', 'USDT-M': 'USDT-M', 'New Listing': 'USDT-M' };

    return (
        <div className="flex items-center px-4 border-b border-zinc-800" style={style}>
            <button className="mr-3" onClick={() => onToggleFavorite(symbol)}>
                <StarIcon className={`${symbol.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'} hover:text-yellow-400`} />
            </button>
            <button className="flex items-center justify-between w-full" onClick={() => onSymbolClick && onSymbolClick(symbol)}>
                <div className="flex flex-col items-start py-3">
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
            </button>
        </div>
    );
});

SymbolRow.displayName = 'SymbolRow';
