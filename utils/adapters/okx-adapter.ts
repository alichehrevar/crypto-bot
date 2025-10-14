// lib/adapters/okx-adapter.ts

import { UTCTimestamp } from 'lightweight-charts';

import { IExchangeAdapter, StandardizedCandle } from './ExchangeAdapter';

import {MarketListItem} from "@/types/MarketList";

// OKX uses different interval identifiers
const intervalMap: { [key: string]: string } = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',
    '4h': '4H',
    '1d': '1D',
};

export const OkxAdapter: IExchangeAdapter = {
    async fetchHistoricalData(market: MarketListItem, interval: string | number) {
        // OKX uses symbol format like BTC-USDT
        const formattedInterval = intervalMap[interval] || '1m';
        const url = `https://www.okx.com/api/v5/market/candles?instId=${market.symbol.replaceAll('/','-')}&bar=${formattedInterval}&limit=300`;
        const resp = await fetch(url);

        if (!resp.ok) {
            throw new Error('Failed to fetch OKX historical data');
        }
        const { data } = await resp.json();

        return data.map((d: any[]): StandardizedCandle => ({
            time: (parseInt(d[0]) / 1000) as UTCTimestamp,
            open: +d[1],
            high: +d[2],
            low: +d[3],
            close: +d[4],
        })).reverse(); // OKX returns newest first, so we reverse it
    },

    subscribeToKlineStream(market: MarketListItem, interval: string, onMessage) {
        const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

        ws.onopen = () => {
            const subMsg = {
                op: 'subscribe',
                args: [{ channel: `candle${interval}`, instId: market.symbol.replaceAll('/','-') }],
            };

            ws.send(JSON.stringify(subMsg));
        };

        ws.onmessage = (event) => {
            const parsed = JSON.parse(event.data);

            if (parsed.data && parsed.data.length > 0) {
                const candleData = parsed.data[0];
                const candle: StandardizedCandle = {
                    time: (parseInt(candleData[0]) / 1000) as UTCTimestamp,
                    open: +candleData[1],
                    high: +candleData[2],
                    low: +candleData[3],
                    close: +candleData[4],
                };

                onMessage(candle);
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                // Send unsubscribe message for cleanup
                const unsubMsg = {
                    op: 'unsubscribe',
                    args: [{ channel: `candle${interval}`, instId: market.symbol.replaceAll('/','-') }],
                };

                ws.send(JSON.stringify(unsubMsg));
                ws.close();
            }
        };
    },
};
