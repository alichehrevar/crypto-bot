import React, { useEffect, useRef, memo } from "react";

import MarketPulse from "@/components/shared/MarketPulse";

function TechnicalAnalysisTradingView() {
  const container = useRef<HTMLDivElement>(null);
  const hasInjected = useRef(false)

  useEffect(() => {
    if (hasInjected.current) return
    hasInjected.current = true

    if (!container.current) return;

    const script = document.createElement("script");

    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
        {
          "colorTheme": "dark",
          "displayMode": "single",
          "isTransparent": false,
          "locale": "en",
          "interval": "1m",
          "disableInterval": false,
          "width": "100%",
          "height": 370,
          "symbol": "NASDAQ:AAPL",
          "showIntervalTabs": true
        }`;
    container.current.appendChild(script);
  }, []);

  return (
    <div className="bg-dark-gray backdrop-blur-sm rounded-xl border border-gray-800/50 h-full w-full flex flex-col justify-between gap-4">
      <div ref={container} className="tradingview-widget-container px-4 mt-4">
        <div className="tradingview-widget-container__widget" />
      </div>
      <MarketPulse />
    </div>
  );
}

export default memo(TechnicalAnalysisTradingView);
