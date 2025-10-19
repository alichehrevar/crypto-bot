'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    ColorType,
} from 'lightweight-charts';
import {addToast, Spinner} from '@heroui/react';

import {MarketListItem} from "@/types/MarketList";
import { getExchangeAdapter } from "@/utils/adapters/ExchangeAdapter";

interface RealTimeCandlestickChartProps {
    symbol?: MarketListItem | null;
    interval?: '1m' | '5m' | '15m' | '30m';
    timeZone?: 'UTC' | 'local' | string;
    locale?: string;
}

interface Ohlc {
    open: number;
    high: number;
    low: number;
    close: number;
    color: string;
}

const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';

const THEME = {
    dark: {
        chart: { background: { type: ColorType.Solid, color: '#1A1A1A' }, textColor: 'rgba(255,255,255,0.9)' },
        grid: { vertLines: { color: '#2A2A2A' }, horzLines: { color: '#2A2A2A' } },
        timeScale: { borderColor: '#444' },
        rightPriceScale: { borderVisible: false },
    },
} as const;

export default function RealTimeCandlestickChart({
                                                     symbol = null,
                                                     interval = '1m',
                                                     timeZone = 'UTC',
                                                     locale,
                                                 }: RealTimeCandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi>();
    const seriesRef = useRef<ISeriesApi<'Candlestick'>>();
    const wsRef = useRef<WebSocket | null>(null);

    const [currentInterval, setCurrentInterval] = useState<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'>(interval);
    const [isReady, setIsReady] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [ohlc, setOhlc] = useState<Ohlc | null>(null);

    const wantsSeconds = useMemo(
        () => ['1s', '3s', '5s', '10s', '15s', '30s'].includes(currentInterval),
        [currentInterval]
    );

    const formatTsShort = useMemo(() => (tsSec: number) =>
        new Intl.DateTimeFormat(locale, {
            timeZone: timeZone === 'local' ? undefined : timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: wantsSeconds ? '2-digit' : undefined,
            hour12: false,
        }).format(new Date(tsSec * 1000)), [locale, timeZone, wantsSeconds]);

    const formatTsFull = useMemo(() => (tsSec: number) =>
        new Intl.DateTimeFormat(locale, {
            timeZone: timeZone === 'local' ? undefined : timeZone,
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: wantsSeconds ? '2-digit' : undefined,
            hour12: false,
        }).format(new Date(tsSec * 1000)), [locale, timeZone, wantsSeconds]);

    /* 1) Create chart + series ONCE. StrictMode-safe with real cleanup. */
    useEffect(() => {
        let handleResize: (() => void) | null = null;
        let chart: IChartApi | undefined;
        let series: ISeriesApi<'Candlestick'> | undefined;

        const handleCrosshairMove = (param: any) => {
            if (!param.seriesData || !series) {
                setOhlc(null);

                return;
            }
            const data = param.seriesData.get(series) as CandlestickData;

            if (data) {
                const candleColor = data.close >= data.open ? UP_COLOR : DOWN_COLOR;

                setOhlc({ open: data.open, high: data.high, low: data.low, close: data.close, color: candleColor });
            } else {
                setOhlc(null);
            }
        };

        (async () => {
            if (!containerRef.current) return;
            const { createChart, CandlestickSeries } = await import('lightweight-charts');

            chart = createChart(containerRef.current, {
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight || 300,
                layout: THEME.dark.chart,
                grid: THEME.dark.grid,
                rightPriceScale: THEME.dark.rightPriceScale,
                timeScale: {
                    borderColor: THEME.dark.timeScale.borderColor,
                    timeVisible: true,
                },
            });

            series = chart.addSeries(CandlestickSeries, {
                upColor: UP_COLOR,
                downColor: DOWN_COLOR,
                borderUpColor: UP_COLOR,
                borderDownColor: DOWN_COLOR,
                wickUpColor: UP_COLOR,
                wickDownColor: DOWN_COLOR,
            });

            chart.subscribeCrosshairMove(handleCrosshairMove);

            chartRef.current = chart;
            seriesRef.current = series;

            handleResize = () => {
                if (!containerRef.current || !chartRef.current) return;
                chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight || 300 });
            };
            window.addEventListener('resize', handleResize);

            setIsReady(true);
        })();

        return () => {
            if (chart) chart.unsubscribeCrosshairMove(handleCrosshairMove);
            if (handleResize) window.removeEventListener('resize', handleResize);
            if (chart) chart.remove();
            chartRef.current = undefined;
            seriesRef.current = undefined;
        };
        // ✨ FIX: Dependency array is now empty. This effect runs only ONCE.
    }, []);

    /* 2) Keep formats in sync if tz/locale/seconds toggle changes */
    useEffect(() => {
        if (!isReady || !chartRef.current) return;

        chartRef.current.applyOptions({
            timeScale: {
                secondsVisible: wantsSeconds,
                tickMarkFormatter: (time: any) => formatTsShort(typeof time === 'number' ? time : Date.UTC(time.year, time.month - 1, time.day) / 1000),
            },
            localization: {
                locale,
                timeFormatter: (time: any) => formatTsFull(typeof time === 'number' ? time : Date.UTC(time.year, time.month - 1, time.day) / 1000),
            },
        });
    }, [isReady, locale, wantsSeconds, formatTsShort, formatTsFull]);

    /* 3) Load history + live updates AFTER chart is ready, and on symbol/interval change */
    useEffect(() => {
        // Do nothing if the chart isn't ready or if no symbol is selected
        if (!isReady || !seriesRef.current || !chartRef.current || !symbol) {
            // Clear data if no symbol is selected
            if (seriesRef.current) {
                seriesRef.current.setData([]);
            }

            return;
        }

        const series = seriesRef.current;
        const chart = chartRef.current;
        let cleanupWebSocket: (() => void) | null = null;
        let active = true;

        const adapter = getExchangeAdapter(symbol.broker);

        setIsDataLoading(true);
        setOhlc(null);

        // Close any previous WebSocket connection
        wsRef.current?.close();

        (async () => {
            try {
                // 2. Fetch historical data using the adapter
                const initialData = await adapter.fetchHistoricalData(symbol, currentInterval);

                if (!active) return;

                series.setData(initialData);

                if (initialData.length > 0) {
                    const dataSize = initialData.length;

                    chart.timeScale().setVisibleLogicalRange({
                        from: dataSize > 100 ? dataSize - 100 : 0,
                        to: dataSize - 1,
                    });
                } else {
                    chart.timeScale().fitContent();
                }
            } catch {
                addToast({
                    title: `Error fetching data from ${symbol.broker}`,
                    color: 'danger'
                });
                series.setData([]); // Clear data on error
            } finally {
                if (active) setIsDataLoading(false);
            }
        })();

        // 3. Subscribe to the live stream using the adapter
        cleanupWebSocket = adapter.subscribeToKlineStream(
            symbol,
            currentInterval,
            (candle) => {
                if (active && seriesRef.current) {
                    seriesRef.current.update(candle);
                }
            }
        );

        return () => {
            active = false;
            // Use the cleanup function returned by the adapter
            if (cleanupWebSocket) {
                cleanupWebSocket();
            }
        };
    }, [symbol, currentInterval, isReady]);

    const intervals: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'> = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

    const formatPrice = (price: number) => {
        return price.toFixed(price > 100 ? 2 : 5);
    }

    return (
        <div ref={containerRef} className="relative w-full flex-grow ua-card h-full">
            <div className="absolute top-0 right-0 left-0 z-10 bg-dark-gray rounded-t-xl shadow-lg p-2 flex flex-col-reverse gap-2 items-start">
                <div className="flex-grow flex items-center gap-4 pl-2">
                    {ohlc && (
                        <div
                            className="flex gap-3 text-xs font-mono"
                            style={{ color: ohlc.color }}
                        >
                            <span><span className="text-white font-bold">O:</span> {formatPrice(ohlc.open)}</span>
                            <span><span className="text-white font-bold">H:</span> {formatPrice(ohlc.high)}</span>
                            <span><span className="text-white font-bold">L:</span> {formatPrice(ohlc.low)}</span>
                            <span><span className="text-white font-bold">C:</span> {formatPrice(ohlc.close)}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-1">
                    {intervals.map((iv) => {
                        const active = iv === currentInterval;

                        return (
                            <button
                                key={iv}
                                className={`px-3 py-1.5 text-xs font-medium rounded-t-xl transition ${active ? 'text-white border-b-2 border-white' : 'text-white/60 hover:text-white/80'}`}
                                type="button"
                                onClick={() => setCurrentInterval(iv)}
                            >
                                {iv}
                            </button>
                        );
                    })}
                </div>
            </div>

            {(!isReady || isDataLoading) && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-gray rounded-lg">
                    <span className="text-gray-400 font-medium">Loading Chart</span>
                    <Spinner className="ml-2" color="primary" size="sm" variant="wave" />
                </div>
            )}
        </div>
    );
}
