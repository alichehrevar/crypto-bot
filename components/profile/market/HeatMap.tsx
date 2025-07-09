'use client'

import React, { useEffect, useRef, memo } from 'react';

function HeatMapWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInjected = useRef(false)

  useEffect(() => {
    if (hasInjected.current) return
    hasInjected.current = true

    if (!containerRef.current) return;

    const script = document.createElement('script');

    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js';
    script.type = 'text/javascript';
    script.async = true;

    // Use textContent for JSON payload
    script.text = JSON.stringify({
      dataSource: 'Crypto',
      blockSize: 'market_cap_calc',
      blockColor: '24h_close_change|5',
      locale: 'en',
      symbolUrl: '',
      colorTheme: 'dark',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '100%',
    });

    containerRef.current.appendChild(script);

    return () => {
      // cleanup in case this component unmounts/remounts
      containerRef.current?.removeChild(script);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: '100%' }}
    >
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}

export default memo(HeatMapWidget);
