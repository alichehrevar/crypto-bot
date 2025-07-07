// FINAL CORRECTED FILE: app/components/shared/charts/BacktestResultChart.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
  SeriesMarker,
} from 'lightweight-charts';

// Define the shape of a single trade for the chart
interface Trade {
  entry: number;
  exit: number;
  profit: number;
  entryTime: number; // Expecting timestamp in seconds
  exitTime: number;  // Expecting timestamp in seconds
  closedBy: string;
}

interface BacktestResultChartProps {
  candles: CandlestickData[];
  trades: Trade[];
  height?: number;
}

export default function BacktestResultChart({
                                              candles,
                                              trades,
                                              height = 500,
                                            }: BacktestResultChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    let resizeObserver: ResizeObserver;

    (async () => {
      const { createChart } = await import('lightweight-charts');

      // FIX: Re-introduce the type assertion to tell TypeScript that this method exists.
      const chart = createChart(containerRef.current!, {
        layout: {
          background: { color: '#1A1A1A' },
          textColor: 'rgba(255,255,255,0.9)',
        },
        grid: {
          vertLines: { color: '#2A2A2A' },
          horzLines: { color: '#2A2A2A' },
        },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      }) as IChartApi & { addCandlestickSeries: any }; // The assertion happens here.

      chartRef.current = chart;

      const series = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      series.setData(candles);

      const markers: SeriesMarker<UTCTimestamp>[] = [];
      trades.forEach(trade => {
        markers.push({
          time: trade.entryTime as UTCTimestamp,
          position: 'belowBar',
          color: '#2196F3',
          shape: 'arrowUp',
          text: `Entry @ ${trade.entry.toFixed(2)}`,
        });
        markers.push({
          time: trade.exitTime as UTCTimestamp,
          position: 'aboveBar',
          color: '#e91e63',
          shape: 'arrowDown',
          text: `Exit @ ${trade.exit.toFixed(2)}`,
        });
      });

      series.setMarkers(markers);

      chart.timeScale().fitContent();

      resizeObserver = new ResizeObserver(entries => {
        if (entries.length === 0 || !entries[0].contentRect) return;
        const { width } = entries[0].contentRect;
        chart.applyOptions({ width });
      });
      resizeObserver.observe(containerRef.current!);
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [candles, trades, height]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
