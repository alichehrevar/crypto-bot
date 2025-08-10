'use client';

import React, { useEffect, useRef } from 'react';
import {
    createChart,
    CrosshairMode,
    CandlestickSeries,
    LineSeries,
    createSeriesMarkers,
} from 'lightweight-charts';

type Candle = { time: number; open: number; high: number; low: number; close: number };
type Trade = {
    entryTime: number; exitTime: number; direction: 'LONG' | 'SHORT';
    profit?: number; closedBy?: string;
};

type Overlay =
    | { type: 'SMA_CROSS'; fast?: number; slow?: number }
    | { type: 'NONE' }
    | undefined;

interface Props {
    candles: Candle[];
    trades?: Trade[];
    overlay?: Overlay;
    height?: number;
}

const toSec = (t: number) => (t > 1e12 ? Math.floor(t / 1000) : t);

const calcSMA = (candles: Candle[], period: number) => {
    if (!period || period < 1 || candles.length < period) return [];
    const out: { time: number; value: number }[] = [];
    let sum = 0;

    for (let i = 0; i < candles.length; i++) {
        sum += candles[i].close;
        if (i >= period) sum -= candles[i - period].close;
        if (i >= period - 1) {
            out.push({ time: toSec(candles[i].time), value: sum / period });
        }
    }

    return out;
};

const BacktestResultChart: React.FC<Props> = ({ candles, trades = [], overlay, height = 550 }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<any>(null);
    const candleSeriesRef = useRef<any>(null);
    const smaFastRef = useRef<any>(null);
    const smaSlowRef = useRef<any>(null);
    const markersPluginRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null);

    // init / destroy
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: { background: { color: '#141414' }, textColor: '#d1d4dc' },
            grid: {
                vertLines: { color: 'rgba(42,46,57,.5)' },
                horzLines: { color: 'rgba(42,46,57,.5)' },
            },
            crosshair: { mode: CrosshairMode.Normal },
            rightPriceScale: { borderVisible: false },
            timeScale: { rightOffset: 4, fixLeftEdge: true },
        });

        chartRef.current = chart;

        const cs = chart.addSeries(CandlestickSeries, {
            upColor: '#049981',
            downColor: '#F23645',
            wickUpColor: '#049981',
            wickDownColor: '#F23645',
            borderVisible: false,
        });

        candleSeriesRef.current = cs;

        const resize = () => {
            if (!containerRef.current) return;
            chart.applyOptions({
                width: containerRef.current.clientWidth,
                height,
            });
        };

        resize();
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('resize', resize);
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            smaFastRef.current = null;
            smaSlowRef.current = null;
            markersPluginRef.current = null;
        };
    }, [height]);

    // set data, overlay, markers
    useEffect(() => {
        const chart = chartRef.current;
        const cs = candleSeriesRef.current;

        if (!chart || !cs) return;

        // Candles
        const normalized = (candles ?? [])
            .map(c => ({ time: toSec(c.time), open: c.open, high: c.high, low: c.low, close: c.close }))
            .sort((a, b) => (a.time as number) - (b.time as number));

        cs.setData(normalized);

        // Clear previous SMA overlays
        if (smaFastRef.current) { chart.removeSeries(smaFastRef.current); smaFastRef.current = null; }
        if (smaSlowRef.current) { chart.removeSeries(smaSlowRef.current); smaSlowRef.current = null; }

        // SMA overlay
        if (overlay && overlay.type === 'SMA_CROSS' && normalized.length) {
            if (overlay.fast && overlay.fast > 0) {
                const s = chart.addSeries(LineSeries, {
                    color: '#FFC107',
                    lineWidth: 2,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });

                s.setData(calcSMA(candles, overlay.fast));
                smaFastRef.current = s;
            }
            if (overlay.slow && overlay.slow > 0) {
                const s = chart.addSeries(LineSeries, {
                    color: '#9C27B0',
                    lineWidth: 2,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });

                s.setData(calcSMA(candles, overlay.slow));
                smaSlowRef.current = s;
            }
        }

        // Markers (v5 plugin)
        if (!markersPluginRef.current) {
            markersPluginRef.current = createSeriesMarkers(cs);
        }
        const markers =
            (trades ?? [])
                .flatMap(t => {
                    const entry = {
                        time: toSec(t.entryTime),
                        position: t.direction === 'LONG' ? 'belowBar' : 'aboveBar',
                        color: t.direction === 'LONG' ? '#2196F3' : '#E91E63',
                        shape: t.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
                        text: `${t.direction} Entry`,
                    } as const;

                    const exit = {
                        time: toSec(t.exitTime),
                        position: t.direction === 'LONG' ? 'aboveBar' : 'belowBar',
                        color: (t.profit ?? 0) >= 0 ? '#22AB94' : '#F7525F',
                        shape: 'square',
                        text: `Exit${t.closedBy ? ` (${t.closedBy})` : ''} PnL: ${(t.profit ?? 0).toFixed(2)}`,
                    } as const;

                    return [entry, exit];
                })
                .sort((a, b) => (a.time as number) - (b.time as number));

        markersPluginRef.current.setMarkers(markers);

        // Nice starting view
        if (normalized.length) {
            chart.timeScale().fitContent();
        }
    }, [candles, trades, overlay]);

    return <div ref={containerRef} style={{ width: '100%', height }} />;
};

export default BacktestResultChart;
