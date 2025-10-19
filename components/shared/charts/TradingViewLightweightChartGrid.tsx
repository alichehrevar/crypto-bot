'use client';

import React, {useEffect, useRef, useState} from 'react';
import {addToast, Spinner} from "@heroui/react";

// --- Type Definitions & Constants ---
type Interval = '1m' | '5m' | '15m' | '30m' | '1h' |
    '4h' | '1d';

interface RealTimeCandlestickChartProps {
    symbol?: string; // e.g., 'BTCUSDT'
    initialInterval?: Interval;
// The default timeframe to load.
}

// Defines the structure for OHLC (Open, High, Low, Close) data.
interface Ohlc {
    open: number;
    high: number;
    low: number;
    close: number;
    color: string;
// Color determined by whether the candle is up or down.
}

// Color constants for the chart elements.
const COLORS = {
    UP: '#26a69a', // Green for price increases
    DOWN: '#ef5350', // Red for price decreases
    NEUTRAL: '#9598A1', // Gray for neutral states
};
// The number of historical bars to display when the chart initially loads.
const VISIBLE_BARS_ON_LOAD = 120;
// --- Component ---

/**
 * A real-time, lightweight trading chart component using TradingView's Lightweight Charts library.
 * It displays candlestick data for a given symbol, connects to a WebSocket for live updates,
 * and overlays a customizable, static grid for grid bot visualization.
 * @param {RealTimeCandlestickChartProps} props - The component props.
 * @returns {JSX.Element} The rendered chart component.
 */
export default function TradingViewLightweightChartGrid({
    symbol = 'BTCUSDT',
    initialInterval = '5m', // Default timeframe is now 5m.
}: RealTimeCandlestickChartProps): JSX.Element {
    // --- Refs for DOM elements and chart instances ---
    const containerRef = useRef<HTMLDivElement>(null);
    // Ref to the main chart container div.
    const chartRef = useRef<any>(); // Ref to the Lightweight Charts instance.
    const seriesRef = useRef<any>(); // Ref to the candlestick series instance.
    const gridLinesRef = useRef<any[]>([]);
    // Ref to store the array of grid line instances.
    // --- State Management ---
    const [libraryLoaded, setLibraryLoaded] = useState(false);
    // Tracks if the charting library script has loaded.
    const [currentInterval, setCurrentInterval] = useState<Interval>(initialInterval); // The currently selected timeframe.
    const [isDataLoading, setIsDataLoading] = useState(true); // Manages the loading state overlay.
    const [liveOhlc, setLiveOhlc] = useState<Ohlc | null>(null);
    // Stores the latest OHLC data from the WebSocket.
    const [crosshairOhlc, setCrosshairOhlc] = useState<Ohlc | null>(null);
    // Stores OHLC data for the candle under the crosshair.
    const displayOhlc = crosshairOhlc ?? liveOhlc;
    // Determines which OHLC data to display (crosshair takes priority).
    const [initialPrice, setInitialPrice] = useState<number | null>(null);
    // The price used as the baseline for grid calculation.
    const [precision, setPrecision] = useState(2);
    // The number of decimal places for price display.

    // --- Effect for Loading External Charting Library ---
    useEffect(() => {
        // If the library is already on the window object, no need to load it again.
        if ((window as any).LightweightCharts) {
            setLibraryLoaded(true);

            return;
        }
        // Create a script tag to load the library from a CDN.
            const script = document.createElement('script');

        script.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';
        script.async = true;
        script.onload = () => setLibraryLoaded(true); // Set state to true once loaded.
        script.onerror = () => addToast({ title: 'Failed to load charting library', color: 'danger' });
        document.body.appendChild(script);
    }, []);
    // --- Main Effect for Chart Initialization, Data Fetching, and WebSocket ---
    useEffect(() => {
        // Exit early if the library isn't loaded or the container isn't rendered yet.
        if (!libraryLoaded || !containerRef.current) {
            return;
        }

        let chart: any;
        let series: any;
        let resizeObserver:
            ResizeObserver;
        let ws: WebSocket | null = null;

        // Use a timeout to ensure the container div has its final dimensions before the chart is created.
        const timeoutId = setTimeout(() => {
            setIsDataLoading(true);
            setInitialPrice(null);

            const LightweightCharts = (window as any).LightweightCharts;


            // 1. Create the chart instance with styling options.
            chart = LightweightCharts.createChart(containerRef.current!, {
                layout: { background: { type: 'solid', color: '#141414' }, textColor: '#D9D9D9' },
                grid: { vertLines: { color: '#2A2E39' }, horzLines: { color: '#2A2E39' } },

                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
                timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#444' },
                rightPriceScale: {
                    borderVisible: false,
                    scaleMargins: { top: 0.1, bottom: 0 }, // Removes the white space at the bottom.
                },
                watermark: { visible: false }, // Hides the TradingView watermark.
                attribution: { visible: false },
            });
            chartRef.current = chart;
            // 2. Add the candlestick series to the chart.
            series = chart.addCandlestickSeries({
                upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
                wickUpColor: '#26a69a', wickDownColor: '#ef5350',
            });
            seriesRef.current = series;

            // 3. Set up event listeners for user interaction (crosshair movement).
            const handleCrosshairMove = (param: any) => {
                if (!param.seriesData || !param.seriesData.size || !series) {
                    setCrosshairOhlc(null);

                    return;
                }
                const data = param.seriesData.get(series);

                if (data) {
                    const candleColor = data.close >= data.open ?
                        COLORS.UP : COLORS.DOWN;

                    setCrosshairOhlc({ ...data, color: candleColor });
                }
            };

            chart.subscribeCrosshairMove(handleCrosshairMove);

            // 4. Set up a ResizeObserver to make the chart responsive.
            resizeObserver = new ResizeObserver(entries => {
                const { width, height } = entries[0].contentRect;

                chart?.applyOptions({ width, height });
            });
            resizeObserver.observe(containerRef.current!);

            // 5. Fetch historical data from the Binance API.
            const fetchData = async () => {
                try {
                    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${currentInterval}&limit=1000`);

                    if (!response.ok) {
                        new Error('Failed to fetch historical data');
                        addToast({title: 'Failed to fetch historical data', color: 'danger'})

                        return;
                    }
                    const data = await response.json();

                    if (!Array.isArray(data) || data.length === 0) {
                        addToast({ title: 'No chart data received', color: 'danger' });

                        return;
                    }
                    const formattedData = data.map((d: any) => ({
                        time: d[0] / 1000,
                        open: parseFloat(d[1]), high: parseFloat(d[2]),

                        low: parseFloat(d[3]), close: parseFloat(d[4]),
                    }));

                    series.setData(formattedData);

                    // Set the initial visible range to position the latest candle at the 80% mark.
                    const dataSize = formattedData.length;
                    const futureMargin = Math.round(VISIBLE_BARS_ON_LOAD * 0.25); // 25% margin gives ~80% position
                    const fromIndex = dataSize - VISIBLE_BARS_ON_LOAD;
                    const toIndex = dataSize + futureMargin;

                    chart.timeScale().setVisibleLogicalRange({ from: fromIndex, to: toIndex });
                    // Set initial state based on the fetched data.
                    const lastCandle = formattedData[formattedData.length - 1];
                    const priceStr = lastCandle.close.toString();

                    setPrecision(priceStr.includes('.') ? priceStr.split('.')[1].length : 0);
                    setInitialPrice(lastCandle.close);
                    const candleColor = lastCandle.close >= lastCandle.open ? COLORS.UP : COLORS.DOWN;

                    setLiveOhlc({ ...lastCandle, color: candleColor });
                } catch {
                    addToast({ title: 'Error fetching data', color: 'danger' });
                } finally {
                    setIsDataLoading(false);
                }
            };
            // 6. Connect to the Binance WebSocket for real-time data updates.
            const connectWebSocket = () => {
                ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${currentInterval}`);
                ws.onmessage = (event) => {
                    const { k: kline } = JSON.parse(event.data);
                    const formattedUpdate = {
                        time: kline.t / 1000, open: parseFloat(kline.o), high: parseFloat(kline.h),
                        low: parseFloat(kline.l), close: parseFloat(kline.c),
                    };

                    series.update(formattedUpdate);
                    const candleColor = formattedUpdate.close >= formattedUpdate.open ? COLORS.UP : COLORS.DOWN;

                    setLiveOhlc({ ...formattedUpdate, color: candleColor });
                };
                ws.onerror = () => addToast({ title: 'WebSocket error', color: 'danger' });
            };

            fetchData().then(connectWebSocket);
        }, 0);

        // 7. Cleanup function to run when the component unmounts or dependencies change.
        return () => {
            clearTimeout(timeoutId);
            ws?.close();
            if (resizeObserver && containerRef.current) {
                resizeObserver.unobserve(containerRef.current!);
            }
            chart?.remove();
        };
    }, [libraryLoaded, symbol, currentInterval]);
    // Re-run this effect if the library, symbol, or interval changes.
    // --- Effect for Drawing the Grid Lines ---
    useEffect(() => {
        // Exit if there's no price to base the grid on, or if the chart isn't ready.
        if (!initialPrice || !seriesRef.current || !(window as any).LightweightCharts) return;
        const series = seriesRef.current;

        // Clear any existing grid lines before drawing new ones.
        gridLinesRef.current.forEach(line => series.removePriceLine(line));
        gridLinesRef.current =
            [];

        const levels: number[] = [];
        const STEP = 0.002; // 0.2% interval between lines.

        // Calculate positive grid levels up to +5%.
        for (let i = 1; i <= 25; i++) { // 25 steps * 0.2% = 5%
            levels.push(initialPrice * (1 + i * STEP));

        }

        // Calculate negative grid levels down to -25%.
        for (let i = 1; i <= 125; i++) { // 125 steps * 0.2% = 25%
            levels.push(initialPrice * (1 - i * STEP));
        }

        // Create the price line objects and add them to the chart.
        gridLinesRef.current = levels.map(price =>
            series.createPriceLine({
                price, color: '#42A5F5', lineWidth: 1,
                lineStyle: (window as any).LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: false, title: '',
            })
        );
    }, [initialPrice]); // Re-run this effect only when the initial price is set.
    const intervals: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

    // --- JSX Rendering ---
    return (
        <div className="absolute inset-0 rounded-xl flex flex-col">
            {/* Top bar for timeframe selection */}
            <div className="flex-shrink-0 flex gap-1 p-2 border-b border-zinc-800 bg-zinc-900 rounded-t-xl">
                {intervals.map((iv) => (
                    <button key={iv}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${ iv === currentInterval ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:bg-zinc-800 hover:text-gray-200' }`} type="button"
                            onClick={() => setCurrentInterval(iv)} >
                        {iv}
                    </button>

                ))}
            </div>

            {/* Main container for the chart and overlays */}
            <div className="relative flex-grow">
                {/* Glassmorphic OHLC display overlay */}
                <div className="absolute top-2 left-2 z-20 pointer-events-none bg-black/30 backdrop-blur-md p-2 rounded-md">

                    <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                        {displayOhlc ?
                            (
                                <>
                                    <span className="font-bold text-white">O <span className="font-normal" style={{ color: displayOhlc.color }}>{displayOhlc.open.toFixed(precision)}</span></span>

                                    <span className="font-bold text-white">H <span className="font-normal" style={{ color: displayOhlc.color }}>{displayOhlc.high.toFixed(precision)}</span></span>
                                    <span className="font-bold text-white">L <span className="font-normal" style={{ color: displayOhlc.color }}>{displayOhlc.low.toFixed(precision)}</span></span>
                                    <span className="font-bold text-white">C <span className="font-normal" style={{ color: (displayOhlc as Ohlc).color }}>{displayOhlc.close.toFixed(precision)}</span></span>

                                </>
                            ) : ( <span className="font-sans text-sm font-bold text-gray-200">{symbol}</span> )}
                    </div>
                </div>


                {/* The div where the chart will be rendered */}
                <div ref={containerRef} className="absolute inset-0 z-10" />

                {/* Loading spinner overlay */}
                {(isDataLoading ||
                    !libraryLoaded) && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-dark-gray/80 backdrop-blur-sm">
                        <Spinner />
                        <span className="mt-4 text-gray-300 font-medium">Loading Chart...</span>

                    </div>
                )}
            </div>
        </div>
    );
}
