// components/TradingViewWidget.tsx
'use client'

import React, { useEffect, useRef, memo } from 'react';

const TradingViewWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run once, and only if the ref is set
    if (!containerRef.current) return;

    // Remove any previous children (in case React re-mounts)
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    // Our widget config
    const config = {
      autosize: true,
      symbol: 'NASDAQ:AAPL',
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      support_host: 'https://www.tradingview.com'
    };

    // Inject config JSON safely
    script.textContent = JSON.stringify(config);

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full h-full"
      style={{ minHeight: 400 }}
    />
  );
};

export default memo(TradingViewWidget);
