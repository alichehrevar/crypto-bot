// lib/adapters/bingx-adapter.ts

import { UTCTimestamp } from 'lightweight-charts';
import { v4 as uuidv4 } from 'uuid'; // Need to install uuid: npm i uuid @types/uuid

import { IExchangeAdapter, StandardizedCandle } from './ExchangeAdapter';

import {MarketListItem} from "@/types/MarketList";

export const BingXAdapter: IExchangeAdapter = {
    async fetchHistoricalData(market: MarketListItem, interval) {
        let url: string;
        const formattedSymbol = market.symbol.toUpperCase().replace(/[\/]?PERP/, 'USDT').replaceAll('/', '-');

        if (market.category === 'Perpetual') {
            // Use the Perpetual Swap (Futures) endpoint
            url = `https://open-api.bingx.com/openApi/swap/v2/quote/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1000`;
        } else {
            // Default to the Spot endpoint
            url = `https://open-api.bingx.com/openApi/spot/v3/market/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1000`;
        }
        const resp = await fetch(url);

        if (!resp.ok) {
            throw new Error('Failed to fetch BingX historical data');
        }
        const { data } = await resp.json();

        return data.map((d: any): StandardizedCandle => ({
            time: (d.time / 1000) as UTCTimestamp,
            open: +d.open,
            high: +d.high,
            low: +d.low,
            close: +d.close,
        }));
    },

    subscribeToKlineStream(market: MarketListItem, interval, onMessage) {
        const ws = new WebSocket('wss://ws-v5.bingx.com/ws');
        let pingInterval: NodeJS.Timeout;

        ws.onopen = () => {

            let dataType: string;
            const formattedSymbol = market.symbol.toUpperCase().replace(/[\/]?PERP/, 'USDT').replace('/', '-'); // Ensure dash format

            // 🎯 DYNAMIC DATA TYPE LOGIC 🎯
            if (market.category === 'Perpetual') {
                // Use the Perpetual Swap (Futures) subscription format
                dataType = `linear-swap.kline.${formattedSymbol}.${interval}`;
            } else {
                // Default to the Spot subscription format
                dataType = `${formattedSymbol}@kline_${interval}`;
            }

            const subMsg = {
                id: uuidv4(),
                reqType: 'sub',
                dataType: dataType,
            };

            ws.send(JSON.stringify(subMsg));
            // BingX requires a Ping every 20 seconds
            pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('Ping');
                }
            }, 20000);
        };

        ws.onmessage = (event) => {
            if (event.data === 'Pong') {
                return; // Ignore Pong response
            }
            const parsed = JSON.parse(event.data);

            // Check for actual kline data, which comes in an object with a 'c' (close) property.
            const candleData = parsed.data || parsed; // Data might be at the root or nested

            if (candleData && candleData.c) {
                const tickData = candleData;
                const candle: StandardizedCandle = {
                    time: (tickData.T / 1000) as UTCTimestamp,
                    open: +tickData.o,
                    high: +tickData.h,
                    low: +tickData.l,
                    close: +tickData.c,
                };

                onMessage(candle);
            }
        };

        return () => {
            clearInterval(pingInterval);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    },
};
