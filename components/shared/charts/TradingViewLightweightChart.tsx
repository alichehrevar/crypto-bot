'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    UTCTimestamp,
    ColorType,
} from 'lightweight-charts';
import {addToast, Spinner} from '@heroui/react';

interface RealTimeCandlestickChartProps {
    symbol?: string;
    interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
    timeZone?: 'UTC' | 'local' | string;
    locale?: string;
}

interface Ohlc {
    open: number;
    high: number;
    low: number;
    close: number;
}

const THEME = {
    dark: {
        chart: { background: { type: ColorType.Solid, color: '#1A1A1A' }, textColor: 'rgba(255,255,255,0.9)' },
        grid: { vertLines: { color: '#2A2A2A' }, horzLines: { color: '#2A2A2A' } },
        timeScale: { borderColor: '#444' },
        rightPriceScale: { borderVisible: false },
    },
} as const;

export default function RealTimeCandlestickChart({
                                                     symbol = 'BTCUSDT',
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

    useEffect(() => {
        let handleResize: (() => void) | null = null;
        let chart: IChartApi | undefined;
        let series: ISeriesApi<'Candlestick'> | undefined;

        // ✨ The 'param' type is now correctly inferred by TypeScript automatically
        const handleCrosshairMove = (param: any) => {
            if (!param.seriesData || !series) {
                setOhlc(null);

                return;
            }
            const data = param.seriesData.get(series) as CandlestickData;

            if (data) {
                setOhlc({ open: data.open, high: data.high, low: data.low, close: data.close });
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
                    secondsVisible: wantsSeconds,
                    tickMarkFormatter: (time: number | any) => formatTsShort(typeof time === 'number' ? time : Date.UTC(time.year, time.month - 1, time.day) / 1000),
                },
                localization: {
                    locale,
                    timeFormatter: (time: number | any) => formatTsFull(typeof time === 'number' ? time : Date.UTC(time.year, time.month - 1, time.day) / 1000),
                },
            });

            series = chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderUpColor: '#26a69a',
                borderDownColor: '#ef5350',
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
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
    }, [formatTsFull, formatTsShort, locale, wantsSeconds]);

    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.applyOptions({
            timeScale: {
                borderColor: THEME.dark.timeScale.borderColor,
                timeVisible: true,
                secondsVisible: wantsSeconds,
                tickMarkFormatter: (time: number | any) => formatTsShort(typeof time === 'number' ? time : Date.UTC(time.year, time.month - 1, time.day) / 1000),
            },
            localization: {
                locale,
                timeFormatter: (time: number | any) => formatTsFull(typeof time === 'number' ? time : Date.UTC(time.year, time.month - 1, time.day) / 1000),
            },
        });
    }, [locale, timeZone, wantsSeconds, formatTsShort, formatTsFull]);

    useEffect(() => {
        if (!isReady || !seriesRef.current) return;

        const series = seriesRef.current;
        let active = true;

        setIsDataLoading(true);
        setOhlc(null); // Reset OHLC when data reloads
        wsRef.current?.close();

        (async () => {
            try {
                const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${currentInterval}&limit=1000`;
                const resp = await fetch(url);

                if (!resp.ok) {
                    addToast({
                        title: 'Failed to fetch historical data',
                        color: 'danger'
                    })

                    return;
                }
                const raw = await resp.json();

                if (!active) return;

                const initial: CandlestickData[] = raw.map((d: any[]) => ({
                    time: Math.floor(d[0] / 1000) as UTCTimestamp,
                    open: +d[1],
                    high: +d[2],
                    low: +d[3],
                    close: +d[4],
                }));

                series.setData(initial);
            } catch {
                addToast({
                    title: 'Error fetching klines',
                    color: 'danger'
                })
            } finally {
                if (active) setIsDataLoading(false);
            }
        })();

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${currentInterval}`);

        wsRef.current = ws;

        ws.onmessage = (event) => {
            if (!active) return;
            const { k: tickData } = JSON.parse(event.data);
            const tick: CandlestickData = {
                time: (tickData.t / 1000) as UTCTimestamp,
                open: +tickData.o,
                high: +tickData.h,
                low: +tickData.l,
                close: +tickData.c,
            };

            series.update(tick);
        };

        return () => {
            active = false;
            ws.close();
        };
    }, [symbol, currentInterval, isReady]);

    const intervals: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'> = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

    const formatPrice = (price: number) => {
        return price.toFixed(price > 100 ? 2 : 5);
    }

    return (
        <div ref={containerRef} className="relative w-full h-full flex-grow rounded-lg min-h-[320px]">
            <div className="absolute top-0 right-0 left-0 z-10 bg-dark-gray rounded-tl-lg rounded-tr-lg shadow-lg p-2 flex gap-1 items-center">
                <div className="flex-grow flex items-center gap-4 pl-2">
                    {ohlc ? (
                        <div className="flex gap-3 text-xs text-white/90 font-mono">
                            <span><span className="text-white/60">O:</span> {formatPrice(ohlc.open)}</span>
                            <span><span className="text-white/60">H:</span> {formatPrice(ohlc.high)}</span>
                            <span><span className="text-white/60">L:</span> {formatPrice(ohlc.low)}</span>
                            <span><span className="text-white/60">C:</span> {formatPrice(ohlc.close)}</span>
                        </div>
                    ) : (
                        <div className="text-sm font-bold text-white/90">
                            {symbol}
                        </div>
                    )}
                </div>

                <div className="flex gap-1">
                    {intervals.map((iv) => {
                        const active = iv === currentInterval;

                        return (
                            <button
                                key={iv}
                                className={`px-3 py-1.5 text-xs font-medium transition ${active ? 'text-white border-b-2 border-white' : 'text-white/60 hover:text-white/80'}`}
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
