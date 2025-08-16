'use client';

import React, { useEffect, useRef } from 'react'; // Import useState and useCallback
import {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    UTCTimestamp,
    ColorType // Import ColorType for theme
} from "lightweight-charts";

interface RealTimeCandlestickChartProps {
    symbol?: string;      // e.g. "BTCUSDT"
    interval?: string;    // e.g. "1m", "5m", "1h"
}

export default function RealTimeCandlestickChart({
                                                     symbol = 'BTCUSDT',
                                                     interval = '1m',
                                                 }: RealTimeCandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef     = useRef<IChartApi>();
    const seriesRef    = useRef<ISeriesApi<'Candlestick'>>();
    const hasInjected = useRef(false)


    // Define theme configurations
    const themes = {
        dark: {
            chart: {
                background: { type: ColorType.Solid, color: '#1A1A1A' }, // Use ColorType.Solid for background
                textColor:  'rgba(255,255,255,0.9)',
            },
            grid: {
                vertLines: { color: '#2A2A2A' },
                horzLines: { color: '#2A2A2A' },
            },
            timeScale: { borderColor: '#444' },
            rightPriceScale: { borderVisible: false },
        },
        light: {
            chart: {
                background: { type: ColorType.Solid, color: '#FFFFFF' },
                textColor:  'rgba(0,0,0,0.9)',
            },
            grid: {
                vertLines: { color: '#E0E0E0' },
                horzLines: { color: '#E0E0E0' },
            },
            timeScale: { borderColor: '#B0B0B0' },
            rightPriceScale: { borderVisible: false },
        },
    };

    useEffect(() => {
        if (!chartRef.current) return;
    }, []);

    useEffect(() => {
        let ws: WebSocket | null = null;

        async function init() {
            if (hasInjected.current) return; // Prevent re-initialization
            hasInjected.current = true;

            if (!containerRef.current) return;

            const { createChart, CandlestickSeries } = await import('lightweight-charts');

            const chart = createChart(containerRef.current, {
                width:  containerRef.current.clientWidth,
                height: containerRef.current.clientHeight || 300,
                // Apply initial theme based on currentTheme state
                layout: themes['dark'].chart,
                grid: themes['dark'].grid,
                timeScale: themes['dark'].timeScale,
                rightPriceScale: themes['dark'].rightPriceScale,
            });

            chartRef.current = chart;

            const series = chart.addSeries(CandlestickSeries, {
                upColor:        '#26a69a',
                downColor:      '#ef5350',
                borderUpColor:   '#26a69a',
                borderDownColor: '#ef5350',
                wickUpColor:     '#26a69a',
                wickDownColor:   '#ef5350',
            });

            seriesRef.current = series;

            // ... (rest of your existing data fetching and websocket logic) ...
            // 4) Fetch initial history
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`;
            const resp = await fetch(url);
            const raw  = await resp.json();
            const initialData: CandlestickData[] = raw.map((d: any[]) => ({
                time:   (Math.floor(d[0] / 1000)) as UTCTimestamp,
                open:   parseFloat(d[1]),
                high:   parseFloat(d[2]),
                low:    parseFloat(d[3]),
                close:  parseFloat(d[4]),
            }));

            series.setData(initialData);

            // 5) Open WebSocket for live updates
            ws = new WebSocket(
                `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
            );
            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                const k   = msg.k;
                const time = (k.t / 1000) as UTCTimestamp;
                const tick: CandlestickData = {
                    time,
                    open:  parseFloat(k.o),
                    high:  parseFloat(k.h),
                    low:   parseFloat(k.l),
                    close: parseFloat(k.c),
                };

                if (k.x) {
                    // candle closed → append
                    series.update(tick);
                } else {
                    // candle still forming → update last bar
                }
            };


            // 6) Resize handler
            const handleResize = () => {
                if (containerRef.current && chartRef.current) {
                    chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
                }
            };

            window.addEventListener('resize', handleResize);

            // Cleanup
            return () => {
                ws?.close();
                window.removeEventListener('resize', handleResize);
                chartRef.current?.remove();
            };
        }

        init();

        // Re-run init if symbol or interval changes
    }, [symbol, interval]);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({
                layout: themes['dark'].chart,
                grid: themes['dark'].grid,
                timeScale: themes['dark'].timeScale,
                rightPriceScale: themes['dark'].rightPriceScale,
            });
        }
    }, [themes]); // Add themes to dependency array as it's defined outside

    return (
        <div
            ref={containerRef}
            className="live-candlestick-chart w-full flex-grow h-full rounded-lg"
        />
    );
}
