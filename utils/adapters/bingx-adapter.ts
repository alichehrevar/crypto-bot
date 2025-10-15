// lib/adapters/bingx-adapter.ts

import { UTCTimestamp } from 'lightweight-charts';
import { v4 as uuidv4 } from 'uuid'; // Need to install uuid: npm i uuid @types/uuid

import { IExchangeAdapter, StandardizedCandle } from './ExchangeAdapter';

import {MarketListItem} from "@/types/MarketList";
import {getData} from "@/actions/get";

export const BingXAdapter: IExchangeAdapter = {
    async fetchHistoricalData(market: MarketListItem, interval: string): Promise<StandardizedCandle[]> {

        const responseData = await getData(`/candles/proxy?exchange=${market.broker}&symbol=${market.symbol}&interval=${interval}&category=${market.category}`);

        // The raw data array might be nested under a 'data' key
        const rawCandles = responseData.data || responseData;

        if (!Array.isArray(rawCandles)) {
            console.error("Unexpected data format from proxy:", responseData);

            return [];
        }

        // Map the raw data to the standardized format our chart expects
        return rawCandles.map((d: any): StandardizedCandle => {
            // Universal mapping for Binance and OKX array format
            if (Array.isArray(d)) {
                return {
                    time: (parseInt(d[4]) / 1000) as UTCTimestamp,
                    open: +d[3],
                    high: +d[1],
                    low: +d[2],
                    close: +d[0],
                };
            }

            // Mapping for BingX object format
            return {
                time: (d.time / 1000) as UTCTimestamp,
                open: +d.open,
                high: +d.high,
                low: +d.low,
                close: +d.close,
            };
        });
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
                dataType = `${formattedSymbol}@kline_${interval}`;
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
