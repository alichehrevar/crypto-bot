// lib/exchange-adapter.ts

import { CandlestickData } from 'lightweight-charts';

import { BinanceAdapter } from './binance-adapter';
import { OkxAdapter } from './okx-adapter';
// import { BingXAdapter } from './bingx-adapter';

import { MarketListItem } from '@/types/MarketList';

export function getExchangeAdapter(broker: MarketListItem['broker']): IExchangeAdapter {
    switch (broker) {
        case 'OKX':
            return OkxAdapter;
        // case 'BingX':
        //     return BingXAdapter;
        case 'Binance':
        default:
            return BinanceAdapter;
    }
}

// The standardized candle format our chart will use
export type StandardizedCandle = CandlestickData;

// The interface (or "contract") for any exchange adapter
export interface IExchangeAdapter {
    /**
     * Fetches historical kline/candlestick data.
     */
    fetchHistoricalData(market: MarketListItem, interval: string): Promise<StandardizedCandle[]>;

    /**
     * Subscribes to the live kline stream via WebSocket.
     * @returns A cleanup function that closes the WebSocket connection.
     */
    subscribeToKlineStream(
        market: MarketListItem,
        interval: string,
        onMessage: (candle: StandardizedCandle) => void
    ): () => void;
}
