'use client'

import React, { useEffect, useRef, memo } from 'react';

function TradingViewAdvancedChart() {
  const container = useRef<HTMLDivElement>(null);
  const hasInjected = useRef(false)

  useEffect(() => {
    if (hasInjected.current) return
    hasInjected.current = true

    if (!container.current) return;

    const script = document.createElement("script");

    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "allow_symbol_change": true,
        "calendar": false,
        "details": false,
        "hide_side_toolbar": true,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "D",
        "locale": "en",
        "save_image": true,
        "style": "1",
        "symbol": "NASDAQ:AAPL",
        "theme": "dark",
        "timezone": "Etc/UTC",
        "backgroundColor": "#000000",
        "gridColor": "rgba(46, 46, 46, 0.06)",
        "watchlist": [],
        "withdateranges": false,
        "compareSymbols": [],
        "studies": [],
        "autosize": true
      }`;
    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div ref={container} className="tradingview-widget-container h-full">
      <div className="tradingview-widget-container__widget h-full" />
    </div>
  );
}

export default memo(TradingViewAdvancedChart);
