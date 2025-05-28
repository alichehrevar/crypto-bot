'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react'; // Import useState and useCallback
import {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  createChart,
  UTCTimestamp,
  CandlestickSeries,
  ColorType // Import ColorType for theme
} from "lightweight-charts";

interface RealTimeCandlestickChartProps {
  symbol?: string;      // e.g. "BTCUSDT"
  interval?: string;    // e.g. "1m", "5m", "1h"
  height?: number;
}

export default function RealTimeCandlestickChart({
                                                   symbol = 'BTCUSDT',
                                                   interval = '1m',
                                                   height = 400,
                                                 }: RealTimeCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi>();
  const seriesRef    = useRef<ISeriesApi<'Candlestick'>>();

  // Add state for the current theme
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');

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

  // Callback to toggle theme
  const toggleTheme = useCallback(() => {
    setCurrentTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;

    async function init() {
      if (!containerRef.current) return;

      const { createChart, CandlestickSeries } = await import('lightweight-charts');

      const chart = createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height,
        // Apply initial theme based on currentTheme state
        layout: themes[currentTheme].chart,
        grid: themes[currentTheme].grid,
        timeScale: themes[currentTheme].timeScale,
        rightPriceScale: themes[currentTheme].rightPriceScale,
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

    // Re-run init if symbol, interval, height, or currentTheme changes
  }, [symbol, interval, height, currentTheme]); // Add currentTheme to dependency array

  // Effect to apply theme changes when currentTheme state updates
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: themes[currentTheme].chart,
        grid: themes[currentTheme].grid,
        timeScale: themes[currentTheme].timeScale,
        rightPriceScale: themes[currentTheme].rightPriceScale,
      });
    }
  }, [currentTheme, themes]); // Add themes to dependency array as it's defined outside

  return (
    <div className="flex flex-col h-full"> {/* Use flex column for layout */}
      <div className="p-2 bg-gray-800 text-white flex items-center justify-between">
        <h2 className="text-lg font-bold">{symbol.toUpperCase()} Chart</h2>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition-colors duration-200"
        >
          Toggle Theme ({currentTheme === 'dark' ? 'Light' : 'Dark'})
        </button>
      </div>
      <div
        ref={containerRef}
        className="live-candlestick-chart w-full flex-grow" // Use flex-grow to fill remaining height
        style={{ height }} // This height will be the minimum, flex-grow will stretch it
      />
    </div>
  );
}
