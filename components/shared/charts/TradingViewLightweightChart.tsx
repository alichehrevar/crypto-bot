'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    UTCTimestamp,
    ColorType,
} from 'lightweight-charts';
import {Spinner} from "@heroui/react";

interface RealTimeCandlestickChartProps {
    symbol?: string;                       // e.g. "BTCUSDT"
    interval?: '1m' | '5m' | '15m' | '30m';
    timeZone?: 'UTC' | 'local' | string;   // e.g. 'Europe/Helsinki'
    locale?: string;                       // e.g. 'en-US', 'fa-IR'
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

    // Toolbar state (starts from prop)
    const [currentInterval, setCurrentInterval] = useState<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'>(interval);

    // Ensures data effect runs only after chart + series exist
    const [isReady, setIsReady] = useState(false);

    // 👇 --- State for data loading --- 👇
    const [isDataLoading, setIsDataLoading] = useState(true);


    const wantsSeconds = useMemo(
        () => ['1s', '3s', '5s', '10s', '15s', '30s'].includes(currentInterval),
        [currentInterval]
    );

    // TIME-ONLY for x-axis
    const formatTsShort = (tsSec: number) =>
        new Intl.DateTimeFormat(locale, {
            timeZone: timeZone === 'local' ? undefined : timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: wantsSeconds ? '2-digit' : undefined,
            hour12: true,
        }).format(new Date(tsSec * 1000));

    // DATE + TIME for crosshair
    const formatTsFull = (tsSec: number) =>
        new Intl.DateTimeFormat(locale, {
            timeZone: timeZone === 'local' ? undefined : timeZone,
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: wantsSeconds ? '2-digit' : undefined,
            hour12: true,
        }).format(new Date(tsSec * 1000));

    /* 1) Create chart + series ONCE. StrictMode-safe with real cleanup. */
    useEffect(() => {
        let handleResize: (() => void) | null = null;
        let chart: IChartApi | undefined;
        let series: ISeriesApi<'Candlestick'> | undefined;

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
                    tickMarkFormatter: (time: number | any) => {
                        const t =
                            typeof time === 'number'
                                ? time
                                : Date.UTC(time.year, time.month - 1, time.day) / 1000;

                        return formatTsShort(t); // time-only on axis
                    },
                },
                localization: {
                    locale,
                    timeFormatter: (time: number | any) => {
                        const t =
                            typeof time === 'number'
                                ? time
                                : Date.UTC(time.year, time.month - 1, time.day) / 1000;

                        return formatTsFull(t); // date+time on crosshair
                    },
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

            chartRef.current = chart;
            seriesRef.current = series;

            handleResize = () => {
                if (!containerRef.current || !chartRef.current) return;
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight || 300,
                });
            };
            window.addEventListener('resize', handleResize);

            // Allow data effect to run
            setIsReady(true);
        })();

        // ✅ Proper cleanup runs on StrictMode re-mount and on unmount
        return () => {
            if (handleResize) window.removeEventListener('resize', handleResize);
            if (chart) chart.remove();
            chartRef.current = undefined;
            seriesRef.current = undefined;
        };
        // deps intentionally [] so it runs exactly once per mount-cycle
        // React StrictMode will mount->cleanup->mount in dev, which is OK because we clean up.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* 2) Keep formats in sync if tz/locale/seconds toggle changes */
    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.applyOptions({
            timeScale: {
                borderColor: THEME.dark.timeScale.borderColor,
                timeVisible: true,
                secondsVisible: wantsSeconds,
                tickMarkFormatter: (time: number | any) => {
                    const t =
                        typeof time === 'number'
                            ? time
                            : Date.UTC(time.year, time.month - 1, time.day) / 1000;

                    return formatTsShort(t);
                },
            },
            localization: {
                locale,
                timeFormatter: (time: number | any) => {
                    const t =
                        typeof time === 'number'
                            ? time
                            : Date.UTC(time.year, time.month - 1, time.day) / 1000;

                    return formatTsFull(t);
                },
            },
        });
    }, [locale, timeZone, wantsSeconds]);

    /* 3) Load history + live updates AFTER chart is ready, and on interval/symbol change */
    useEffect(() => {
        if (!isReady || !seriesRef.current) return;

        const series = seriesRef.current;
        let active = true;

        // 1. Set loading to true when interval changes
        setIsDataLoading(true);

        // Close previous stream
        wsRef.current?.close();

        // Fetch initial history
        (async () => {
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${currentInterval}&limit=1000`;
            const resp = await fetch(url);
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

            // 2. Set loading to false after data is loaded
            setIsDataLoading(false);
        })();

        // Subscribe to live updates
        const ws = new WebSocket(
            `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${currentInterval}`
        );

        wsRef.current = ws;

        ws.onmessage = (event) => {
            if (!active) return;
            const k = JSON.parse(event.data).k;
            const tick: CandlestickData = {
                time: (k.t / 1000) as UTCTimestamp,
                open: +k.o,
                high: +k.h,
                low: +k.l,
                close: +k.c,
            };

            series.update(tick); // updates forming bar or appends on close
        };

        return () => {
            active = false;
            ws.close();
        };
    }, [symbol, currentInterval, isReady]);

    const intervals: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'> = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex-grow rounded-lg min-h-[320px]"
        >
            {/* Interval Toolbar */}
            <div className="absolute top-0 right-0 left-0 z-10 bg-dark-gray rounded-tl-lg rounded-tr-lg shadow-lg p-2 flex gap-1">
                {intervals.map((iv) => {
                    const active = iv === currentInterval;

                    return (
                        <button
                            key={iv}
                            className={[
                                'px-3 py-1.5 text-xs font-medium transition',
                                active
                                    ? 'text-white border-b-2 border-white'
                                    : 'text-white/60 hover:text-white/80',
                            ].join(' ')}
                            type="button"
                            onClick={() => setCurrentInterval(iv)}
                        >
                            {iv}
                        </button>
                    );
                })}
            </div>

            {/* 👇 --- Loading Indicator --- 👇 */}
            {(!isReady || isDataLoading) && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-gray rounded-lg">
                    <span className="text-gray-400 font-medium">Loading Chart</span>
                    <Spinner className="ml-2" color="primary" size="sm" variant="wave"/>
                </div>
            )}
            {/* The chart library will attach its canvas to the containerRef element.
                This loading indicator will appear on top until isReady becomes true. */}
        </div>
    );
}
