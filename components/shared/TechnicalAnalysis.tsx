import React, { useEffect, useRef, memo } from "react";

function TechnicalAnalysis() {
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
          "height": 600,
          "symbol": "NASDAQ:AAPL",
          "showIntervalTabs": true
        }`;
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(TechnicalAnalysis);
