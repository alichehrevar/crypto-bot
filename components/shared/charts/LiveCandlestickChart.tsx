'use client';

import React, { useEffect, useRef } from 'react';
// import only types here
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
} from 'lightweight-charts';

interface LiveCandlestickChartProps {
  symbol: string;    // e.g. "BTCUSDT"
  interval: string;  // "1m", "5m", "1h", etc.
  height?: number;
}

export default function LiveCandlestickChart({
                                               symbol,
                                               interval,
                                               height = 400,
                                             }: LiveCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket>();

  useEffect(() => {
    if (!containerRef.current) return;

    let resizeObserver: ResizeObserver;

    (async () => {
      const { createChart } = await import('lightweight-charts');

      // 1) Tell TS this chart WILL have addCandlestickSeries at runtime
      const chart = createChart(container.current!, {
        layout: {
          background: { color: '#1A1A1A' },
          textColor: 'rgba(255,255,255,0.9)',
        },
        grid: {
          vertLines: { color: '#2A2A2A' },
          horzLines: { color: '#2A2A2A' },
        },
        rightPriceScale: { borderVisible: false },
        timeScale:       { borderVisible: false },
        width: 800,
        height,
      }) as IChartApi & { addCandlestickSeries: any };

      chartRef.current = chart;

      // 2) Now TS will allow this call
      const series = chart.addCandlestickSeries({
        upColor:   '#26a69a',
        downColor: '#ef5350',
        borderUpColor:   '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor:     '#26a69a',
        wickDownColor:   '#ef5350',
      }) as ISeriesApi<'Candlestick'>;

      seriesRef.current = series;

      // 4) fetch initial historical bars
      const resp = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
      );
      const raw: any[] = await resp.json();
      const bars: CandlestickData[] = raw.map((r) => ({
        time: (r[0] / 1000) as UTCTimestamp,
        open: parseFloat(r[1]),
        high: parseFloat(r[2]),
        low: parseFloat(r[3]),
        close: parseFloat(r[4]),
      }));
      series.setData(bars);

      // 5) subscribe to live updates
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
      );
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        const k = msg.k;
        const bar: CandlestickData = {
          time: (k.t / 1000) as UTCTimestamp,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
        };
        series.update(bar);
      };
      wsRef.current = ws;

      // 6) resize handling
      resizeObserver = new ResizeObserver(() => {
        chart.applyOptions({
          width: 800,
        });
      });
      resizeObserver.observe(containerRef.current!);
    })();

    // cleanup
    return () => {
      wsRef.current?.close();
      if (chartRef.current) chartRef.current.remove();
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [symbol, interval, height]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height }}
    />
  );
}
