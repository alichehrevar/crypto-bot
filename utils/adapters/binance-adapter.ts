// lib/adapters/binance-adapter.ts

import { UTCTimestamp } from 'lightweight-charts';

import { IExchangeAdapter, StandardizedCandle } from './ExchangeAdapter';

import {MarketListItem} from "@/types/MarketList";

export const BinanceAdapter: IExchangeAdapter = {

    async fetchHistoricalData(market: MarketListItem, interval) {
        const formattedSymbol = market.symbol.toUpperCase().replace(/[\/]?PERP/, 'USDT').replace('/', '');
        let baseUrl: string;

        // 🎯 CHOOSE THE CORRECT BASE URL 🎯
        if (market.category === 'Perpetual') {
            baseUrl = 'https://fapi.binance.com/fapi/v1/klines'; // Futures API
        } else {
            baseUrl = 'https://api.binance.com/api/v3/klines'; // Spot API
        }

        const url = `${baseUrl}?symbol=${formattedSymbol}&interval=${interval}&limit=1000`;
        const resp = await fetch(url);

        if (!resp.ok) {
            throw new Error('Failed to fetch Binance historical data');
        }
        const raw = await resp.json();

        return raw.map((d: any[]): StandardizedCandle => ({
            time: Math.floor(d[0] / 1000) as UTCTimestamp,
            open: +d[1],
            high: +d[2],
            low: +d[3],
            close: +d[4],
        }));
    },

    subscribeToKlineStream(market: MarketListItem, interval: any, onMessage: (arg0: StandardizedCandle) => void) {
        const formattedSymbol = market.symbol.toUpperCase().replace(/[\/]?PERP/, 'USDT').replace('/', '').toLowerCase();
        let baseUrl: string;

        // 🎯 CHOOSE THE CORRECT WEBSOCKET URL 🎯
        if (market.category === 'Perpetual') {
            baseUrl = 'wss://fstream.binance.com/ws'; // Futures WebSocket
        } else {
            baseUrl = 'wss://stream.binance.com:9443/ws'; // Spot WebSocket
        }

        const ws = new WebSocket(`${baseUrl}/${formattedSymbol}@kline_${interval}`);

        ws.onmessage = (event) => {
            const { k: tickData } = JSON.parse(event.data);
            const candle: StandardizedCandle = {
                time: (tickData.t / 1000) as UTCTimestamp,
                open: +tickData.o,
                high: +tickData.h,
                low: +tickData.l,
                close: +tickData.c,
            };

            onMessage(candle);
        };

        // Return a function to close the connection
        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    },
};
