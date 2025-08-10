'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {addToast} from "@heroui/react";

type Candle = { time: number; open: number; high: number; low: number; close: number };
type Trade = {
    entry: number;
    exit: number;
    profit: number;
    direction: 'LONG' | 'SHORT';
    entryTime: number;
    exitTime: number;
    closedBy?: string;
};

type Props = {
    candles: Candle[];
    trades?: Trade[];
    height?: number;
    className?: string;

    /** Optional overlay; keep for future (e.g. SMA_CROSS) */
    overlay?:
        | { type: 'SMA_CROSS'; fast?: number; slow?: number }
        | { type: 'NONE' };
};

const toSec = (t: number) => (t > 1e11 ? Math.floor(t / 1000) : t); // ms→sec if needed
const fmt = (n: number | undefined) => (typeof n === 'number' ? n.toFixed(2) : '--');

function calcSMA(points: Candle[], period: number) {
    if (!period || points.length < period) return [];
    const out: { time: number; value: number }[] = [];
    let sum = 0;

    for (let i = 0; i < points.length; i++) {
        sum += points[i].close;
        if (i >= period) sum -= points[i - period].close;
        if (i >= period - 1) {
            out.push({ time: toSec(points[i].time), value: sum / period });
        }
    }

    return out;
}

const BacktestResultChart: React.FC<Props> = ({ candles, trades = [], height = 550, className, overlay }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const candleSeriesRef = useRef<any>(null);
    const overlaySeriesRefs = useRef<any[]>([]);
    const [lib, setLib] = useState<any>(null);
    const [legend, setLegend] = useState<{ open: number; high: number; low: number; close: number; change: number; changePct: number } | null>(null);
    const [indLegend, setIndLegend] = useState<Record<string, { value: string; color: string }>>({});

    // Load library on client only
    useEffect(() => {
        let cancelled = false;

        import('lightweight-charts')
            .then((m) => {
                if (!cancelled) setLib(m);
            })
            .catch((err) => {
                addToast({
                    title: `Failed to load lightweight-charts ${err}`,
                    color: 'danger'
                })
            });

        return () => {
            cancelled = true;
        };
    }, []);


    // Init chart (once)
    useEffect(() => {
        if (!lib || !containerRef.current) return;
        const { createChart, CrosshairMode } = lib;

        chartRef.current = createChart(containerRef.current, {
            layout: { background: { color: '#141414' }, textColor: '#d1d4dc' },
            grid: {
                vertLines: { color: 'rgba(61,61,61,0.5)' },
                horzLines: { color: 'rgba(61,61,61,0.5)' },
            },
            crosshair: { mode: CrosshairMode.Normal },
            rightPriceScale: { borderColor: 'transparent' },
            timeScale: { borderColor: 'transparent', timeVisible: true, rightOffset: 10 },
        });

        candleSeriesRef.current = chartRef.current.addCandlestickSeries({
            upColor: '#049981',
            downColor: '#F23645',
            borderDownColor: '#F23645',
            borderUpColor: '#049981',
            wickDownColor: '#F23645',
            wickUpColor: '#049981',
        });

        const onMove = (param: any) => {
            if (!param?.time || !param.seriesData?.size) {
                setLegend(null);
                setIndLegend({});

                return;
            }
            const c = param.seriesData.get(candleSeriesRef.current);

            if (c) {
                const change = c.close - c.open;
                const changePct = (change / c.open) * 100;

                setLegend({ open: c.open, high: c.high, low: c.low, close: c.close, change, changePct });
            }
            const o: Record<string, { value: string; color: string }> = {};

            overlaySeriesRefs.current.forEach((series) => {
                const p = param.seriesData.get(series);

                if (p) {
                    const opts = series.options();
                    const title = opts?.title ?? 'IND';

                    o[title] = { value: (p.value as number).toFixed(2), color: opts?.color ?? '#999' };
                }
            });
            setIndLegend(o);
        };

        chartRef.current.subscribeCrosshairMove(onMove);

        const resize = () => {
            if (chartRef.current && containerRef.current) {
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };

        resize();
        window.addEventListener('resize', resize);

        return () => {
            window.removeEventListener('resize', resize);
            chartRef.current?.unsubscribeCrosshairMove(onMove);
            chartRef.current?.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            overlaySeriesRefs.current = [];
        };
    }, [lib]);

    const normalizedCandles = useMemo(
        () =>
            (candles || [])
                .map((c) => ({ ...c, time: toSec(c.time) }))
                .sort((a, b) => a.time - b.time),
        [candles]
    );

    // Push data + markers + overlay
    useEffect(() => {
        if (!lib || !chartRef.current || !candleSeriesRef.current) return;

        // Set candles
        candleSeriesRef.current.setData(normalizedCandles);

        // Clear overlays
        overlaySeriesRefs.current.forEach((s) => {
            try {
                chartRef.current.removeSeries(s);
            } catch {}
        });
        overlaySeriesRefs.current = [];

        // Draw overlay (optional)
        if (overlay && overlay.type === 'SMA_CROSS') {
            const fast = overlay.fast ?? 10;
            const slow = overlay.slow ?? 50;

            const fastSMA = calcSMA(candles, fast);
            const slowSMA = calcSMA(candles, slow);

            const fastSeries = chartRef.current.addLineSeries({
                color: '#FFC107',
                lineWidth: 2,
                title: `SMA(${fast})`,
                priceLineVisible: false,
                lastValueVisible: false,
                axisLabelVisible: false,
            });

            fastSeries.setData(fastSMA);
            overlaySeriesRefs.current.push(fastSeries);

            const slowSeries = chartRef.current.addLineSeries({
                color: '#9C27B0',
                lineWidth: 2,
                title: `SMA(${slow})`,
                priceLineVisible: false,
                lastValueVisible: false,
                axisLabelVisible: false,
            });

            slowSeries.setData(slowSMA);
            overlaySeriesRefs.current.push(slowSeries);
        }

        // Trades → markers
        const markers =
            (trades || [])
                .map((t) => {
                    const entry = {
                        time: toSec(t.entryTime),
                        position: t.direction === 'LONG' ? 'belowBar' : 'aboveBar',
                        color: t.direction === 'LONG' ? '#1E88E5' : '#E91E63',
                        shape: t.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
                        text: `${t.direction} Entry`,
                    };
                    const exitColor = t.profit >= 0 ? '#4CAF50' : '#F44336';
                    const exit = {
                        time: toSec(t.exitTime),
                        position: t.direction === 'LONG' ? 'aboveBar' : 'belowBar',
                        color: exitColor,
                        shape: 'square',
                        text: `Exit${t.closedBy ? ` (${t.closedBy})` : ''} PnL: ${t.profit.toFixed(2)}`,
                    };

                    return [entry, exit];
                })
                .flat()
                .sort((a, b) => (a.time as number) - (b.time as number)) ?? [];

        candleSeriesRef.current.setMarkers(markers);

        // Initial viewport: last ~140 bars
        if (normalizedCandles.length > 0) {
            const n = normalizedCandles.length;
            const from = Math.max(0, n - 140);
            const to = n - 1;

            chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
        }
    }, [lib, normalizedCandles, trades, overlay]);

    return (
        <div className={className} style={{ height }}>
            {/* Legend */}
            <div className="absolute z-10 top-2 left-2 text-xs text-white/90 pointer-events-none">
                {legend && (
                    <div className="mb-1">
                        <span className="mr-1">O</span><span className={legend.close >= legend.open ? 'text-[#049981]' : 'text-[#F23645]'}>{fmt(legend.open)}</span>
                        <span className="mx-2">H</span><span className={legend.close >= legend.open ? 'text-[#049981]' : 'text-[#F23645]'}>{fmt(legend.high)}</span>
                        <span className="mx-2">L</span><span className={legend.close >= legend.open ? 'text-[#049981]' : 'text-[#F23645]'}>{fmt(legend.low)}</span>
                        <span className="mx-2">C</span><span className={legend.close >= legend.open ? 'text-[#049981]' : 'text-[#F23645]'}>{fmt(legend.close)}</span>
                        <span className={`ml-2 ${legend.change >= 0 ? 'text-[#049981]' : 'text-[#F23645]'}`}>
              {legend.change >= 0 ? '+' : ''}
                            {fmt(legend.change)} ({legend.changePct >= 0 ? '+' : ''}{fmt(legend.changePct)}%)
            </span>
                    </div>
                )}
                {Object.entries(indLegend).length > 0 && (
                    <div className="space-y-0.5">
                        {Object.entries(indLegend).map(([title, v]) => (
                            <div key={title} className="flex items-center gap-2">
                                <span className="text-white/80">{title}</span>
                                <span style={{ color: v.color }}>{v.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chart container */}
            <div ref={containerRef} className="w-full h-full relative rounded-md overflow-hidden" />
        </div>
    );
};

export default React.memo(BacktestResultChart);
