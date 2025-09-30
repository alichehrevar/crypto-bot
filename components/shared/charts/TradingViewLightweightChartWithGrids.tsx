// src/components/TradingViewLightweightChart.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    UTCTimestamp,
    ColorType,
    IPriceLine,
    LineStyle,
    Time,
    CrosshairMode,
    LogicalRange,
} from 'lightweight-charts';
import Decimal from 'decimal.js';

import { calculateGridLevels, GridMode, fetchSymbolFilters, roundToTickNeutral } from '@/types/bots/GridCalculator';

// A simple Tailwind-based spinner component
const Spinner = () => (
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent" />
);

// For toasts, a library like 'react-hot-toast' or 'sonner' is recommended.
const addToast = (props: { title: string; intent: 'error' | 'success' }) => {
    console.log(`Toast: [${props.intent}] ${props.title}`);
};

// --- Interfaces & Constants ---

export interface ChartGridConfig {
    enabled: boolean;
    lower: number;
    upper: number;
    grids: number;
    mode: GridMode;
}

type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

interface RealTimeCandlestickChartProps {
    symbol?: string;
    initialInterval?: Interval;
    gridConfig?: ChartGridConfig;
    onGridConfigChange?: (config: Partial<ChartGridConfig>) => void;
}

interface Ohlc {
    open: number;
    high: number;
    low: number;
    close: number;
}

const COLORS = {
    BUY_ZONE: '#26a69a',
    SELL_ZONE: '#ef5350',
    NEUTRAL: '#9598A1',
};

const DEFAULT_GRID_COUNT = 40;
const DEFAULT_RANGE_PERCENTAGE = 0.10; // +/- 10%
const VISIBLE_BARS_ON_LOAD = 120; // Number of bars to show on initial load

// --- Component ---

export default function TradingViewLightweightChart({
    symbol = 'BTCUSDT',
    initialInterval = '1m',
    gridConfig,
    onGridConfigChange,
}: RealTimeCandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi>();
    const seriesRef = useRef<ISeriesApi<'Candlestick'>>();
    const wsRef = useRef<WebSocket | null>(null);

    const gridLinesRef = useRef<IPriceLine[]>([]);
    const boundaryLinesRef = useRef<{ upper: IPriceLine | null; lower: IPriceLine | null }>({ upper: null, lower: null });

    const [currentInterval, setCurrentInterval] = useState<Interval>(initialInterval);
    const [isReady, setIsReady] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const [liveOhlc, setLiveOhlc] = useState<Ohlc | null>(null); // For the latest tick
    const [crosshairOhlc, setCrosshairOhlc] = useState<Ohlc | null>(null); // For hover
    const displayOhlc = crosshairOhlc ?? liveOhlc; // Decide which OHLC to show

    const [initialPrice, setInitialPrice] = useState<number | null>(null);
    const [lastPrice, setLastPrice] = useState<number | null>(null);
    const [tickSize, setTickSize] = useState<Decimal>(new Decimal(0.01));
    const precision = useMemo(() => tickSize.decimalPlaces(), [tickSize]);

    // --- Chart Initialization and Core Setup (Inspired by your 'working perfect' component) ---
    useEffect(() => {
        let chart: IChartApi | undefined;
        let series: ISeriesApi<'Candlestick'> | undefined;
        let resizeObserver: ResizeObserver | undefined;

        const handleCrosshairMove = (param: any) => {
            if (!param.seriesData || !param.seriesData.size || !series) {
                setCrosshairOhlc(null);

                return;
            }
            const data = param.seriesData.get(series) as CandlestickData;

            if (data) setCrosshairOhlc(data);
        };

        const initializeChart = async () => {
            if (!containerRef.current) return;
            const { createChart, CandlestickSeries } = await import('lightweight-charts');

            chart = createChart(containerRef.current, {
                layout: { background: { type: ColorType.Solid, color: '#141414FF' }, textColor: '#D9D9D9' },
                grid: { vertLines: { color: '#2A2E39' }, horzLines: { color: '#2A2E39' } },
                crosshair: { mode: CrosshairMode.Normal },
                timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#444' },
                rightPriceScale: { borderVisible: false },
            });
            chartRef.current = chart;

            series = chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
                wickUpColor: '#26a69a', wickDownColor: '#ef5350',
            });
            seriesRef.current = series;

            chart.subscribeCrosshairMove(handleCrosshairMove);

            // Handle resizing
            resizeObserver = new ResizeObserver(entries => {
                const { width, height } = entries[0].contentRect;

                chart?.applyOptions({ width, height });
            });
            resizeObserver.observe(containerRef.current);

            setIsReady(true);
        };

        initializeChart();

        return () => {
            if (chart) chart.unsubscribeCrosshairMove(handleCrosshairMove);
            resizeObserver?.disconnect();
            chart?.remove();
            chartRef.current = undefined; seriesRef.current = undefined;
        };
    }, []);

    // --- Data Loading and WebSocket Connection ---
    useEffect(() => {
        if (!isReady || !symbol || !seriesRef.current || !chartRef.current) return;
        const series = seriesRef.current;
        const chart = chartRef.current;

        setIsDataLoading(true);
        setInitialPrice(null);
        setLastPrice(null);
        setLiveOhlc(null);
        wsRef.current?.close();

        const fetchHistoricalData = async () => {
            try {
                const response = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${currentInterval}&limit=1000`
                );

                if (!response.ok) throw new Error('Failed to fetch historical data');
                const data = await response.json();

                const formattedData: CandlestickData[] = data.map((d: any) => ({
                    time: (d[0] / 1000) as UTCTimestamp,
                    open: parseFloat(d[1]), high: parseFloat(d[2]),
                    low: parseFloat(d[3]), close: parseFloat(d[4]),
                }));

                series.setData(formattedData);

                if (formattedData.length > 0) {
                    const lastCandle = formattedData[formattedData.length - 1];

                    setInitialPrice(lastCandle.close);
                    setLastPrice(lastCandle.close);
                    setLiveOhlc(lastCandle);
                    // Set smart initial zoom
                    const dataSize = formattedData.length;

                    chart.timeScale().setVisibleLogicalRange({
                        from: dataSize - VISIBLE_BARS_ON_LOAD,
                        to: dataSize,
                    } as LogicalRange);
                }
            } catch {
                addToast({ title: 'Error fetching historical data', intent: 'error' });
            } finally {
                setIsDataLoading(false);
            }
        };

        const connectWebSocket = () => {
            const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${currentInterval}`);

            wsRef.current = ws;
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                const kline = message.k;
                const formattedUpdate: CandlestickData<Time> = {
                    time: (kline.t / 1000) as UTCTimestamp, open: parseFloat(kline.o),
                    high: parseFloat(kline.h), low: parseFloat(kline.l), close: parseFloat(kline.c),
                };

                series.update(formattedUpdate);
                setLastPrice(formattedUpdate.close);
                setLiveOhlc(formattedUpdate);
            };
            ws.onerror = () => addToast({ title: 'WebSocket connection error', intent: 'error' });
        };

        fetchHistoricalData().then(connectWebSocket);

        return () => { wsRef.current?.close(); wsRef.current = null; };
    }, [isReady, symbol, currentInterval]);

    // --- Grid Logic (Largely unchanged, but now benefits from better chart context) ---

    // Fetch Tick Size
    useEffect(() => {
        fetchSymbolFilters(symbol).then((filters: { tickSize: React.SetStateAction<Decimal>; }) => {
            setTickSize(filters.tickSize);
        }).catch(() => {
            addToast({ title: 'Error fetching market precision', intent: 'error' });
        });
    }, [symbol]);

    // Clear Grid Helper
    const clearGrid = useCallback(() => {
        if (!seriesRef.current) return;
        gridLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
        gridLinesRef.current = [];
        if (boundaryLinesRef.current.upper) seriesRef.current.removePriceLine(boundaryLinesRef.current.upper);
        if (boundaryLinesRef.current.lower) seriesRef.current.removePriceLine(boundaryLinesRef.current.lower);
        boundaryLinesRef.current = { upper: null, lower: null };
    }, []);

    // Initialize Default Grid
    useEffect(() => {
        if (isDataLoading || !onGridConfigChange || initialPrice === null) return;
        if (!gridConfig || (!gridConfig.enabled && gridConfig.grids === 0)) {
            const P0 = new Decimal(initialPrice);
            const lowerD = roundToTickNeutral(P0.mul(1 - DEFAULT_RANGE_PERCENTAGE), tickSize);
            const upperD = roundToTickNeutral(P0.mul(1 + DEFAULT_RANGE_PERCENTAGE), tickSize);

            onGridConfigChange({
                enabled: true, lower: lowerD.toNumber(), upper: upperD.toNumber(),
                grids: DEFAULT_GRID_COUNT, mode: 'geometric',
            });
        }
    }, [isDataLoading, initialPrice, onGridConfigChange, gridConfig, tickSize]);

    // Draw/Update Grid Visualization
    useEffect(() => {
        if (!isReady || !seriesRef.current) return;
        if (!gridConfig || !gridConfig.enabled || gridConfig.grids < 1) {
            clearGrid();

            return;
        }

        const { lower, upper, grids, mode } = gridConfig;

        if (lower >= upper || lower <= 0) { clearGrid();

 return; }

        const levels = calculateGridLevels({
            lower: new Decimal(lower), upper: new Decimal(upper),
            grids, mode, tickSize,
        });

        if (levels.length < 2) { clearGrid();

 return; }

        const determineLineColor = (price: number, current: number | null): string => {
            if (current === null) return COLORS.NEUTRAL;
            if (price < current) return COLORS.BUY_ZONE;
            if (price > current) return COLORS.SELL_ZONE;

            return COLORS.NEUTRAL;
        };

        // Redraw intermediate lines
        gridLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
        gridLinesRef.current = [];
        const intermediateLevels = levels.slice(1, levels.length - 1);

        intermediateLevels.forEach((level: { toNumber: () => any; }) => {
            const price = level.toNumber();
            const line = seriesRef.current?.createPriceLine({
                price, color: determineLineColor(price, lastPrice),
                lineWidth: 1, lineStyle: LineStyle.Dashed, title: '',
            });

            if (line) gridLinesRef.current.push(line);
        });

        const handleBoundaryDrag = (type: 'upper' | 'lower') => {
            const line = boundaryLinesRef.current[type];

            if (line && onGridConfigChange && gridConfig) {
                const rawPrice = line.options().price;
                const snappedPrice = roundToTickNeutral(new Decimal(rawPrice), tickSize).toNumber();
                const buffer = tickSize.toNumber();

                if ((type === 'upper' && snappedPrice <= gridConfig.lower + buffer) ||
                    (type === 'lower' && snappedPrice >= gridConfig.upper - buffer)) return;
                onGridConfigChange({ [type]: snappedPrice });
            }
        };

        const updateOrCreateBoundary = (type: 'upper' | 'lower', price: Decimal) => {
            const priceValue = price.toNumber();
            const color = determineLineColor(priceValue, lastPrice);
            const title = type.charAt(0).toUpperCase() + type.slice(1);
            // @ts-ignore
            let line: IPriceLine | undefined = boundaryLinesRef.current[type];

            if (line) {
                line.applyOptions({ price: priceValue, color, title });
            } else {
                line = seriesRef.current?.createPriceLine({
                    price: priceValue,
                    color,
                    lineWidth: 2,
                    lineStyle: LineStyle.Solid,
                    title,
                    axisLabelVisible: true,
                    draggable: true, // <-- This was the missing piece
                } as any);
                if (line) {
                    boundaryLinesRef.current[type] = line;
                    // This will now work correctly because the line is draggable
                    (line as any).subscribeDragged?.(() => handleBoundaryDrag(type));
                }
            }
        };

        updateOrCreateBoundary('upper', levels[levels.length - 1]);
        updateOrCreateBoundary('lower', levels[0]);

    }, [gridConfig, isReady, tickSize, lastPrice, clearGrid, onGridConfigChange]);

    const intervals: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

    return (
        <div className="relative h-full w-full bg-dark-gray rounded-lg">
            {/* Header with OHLC and Interval Selector */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 bg-dark-gray border-b border-stone-800">
                <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                    {displayOhlc ? (
                        <>
                            <span>O: <span className="text-gray-200">{displayOhlc.open.toFixed(precision)}</span></span>
                            <span>H: <span className="text-gray-200">{displayOhlc.high.toFixed(precision)}</span></span>
                            <span>L: <span className="text-gray-200">{displayOhlc.low.toFixed(precision)}</span></span>
                            <span>C: <span className="text-gray-200">{displayOhlc.close.toFixed(precision)}</span></span>
                        </>
                    ) : (
                        <span className="font-sans text-sm font-bold text-gray-200">{symbol}</span>
                    )}
                </div>
                <div className="flex gap-1">
                    {intervals.map((iv) => (
                        <button
                            key={iv}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                                iv === currentInterval
                                    ? 'bg-[#F0F0F0FF]/20 text-[#F0F0F0FF]'
                                    : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'
                            }`}
                            type="button"
                            onClick={() => setCurrentInterval(iv)}
                        >
                            {iv.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div ref={containerRef} className="h-full w-full" />

            {/* Loading Overlay */}
            {(!isReady || isDataLoading) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-dark-gray/80 backdrop-blur-sm rounded-lg">
                    <Spinner />
                    <span className="mt-4 text-gray-300 font-medium">Loading Chart Data...</span>
                </div>
            )}
        </div>
    );
}
