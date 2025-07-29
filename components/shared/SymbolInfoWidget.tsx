import React, { useEffect, useRef, memo } from 'react';

function SymbolInfoWidget() {
    const container = useRef<HTMLDivElement>(null);
    const hasInjected = useRef(false)

    useEffect(() => {
        if (hasInjected.current) return
        hasInjected.current = true

        if (!container.current) return;

        const script = document.createElement("script");

        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
        {
          "symbol": "OKX:BTCUSD",
          "colorTheme": "dark",
          "isTransparent": false,
          "locale": "en",
          "width": "100%"
        }`;
        container.current.appendChild(script);
    }, []);

    return (
        <div ref={container} className="tradingview-widget-container">
            <div className="tradingview-widget-container__widget" />
        </div>
    );
}

export default memo(SymbolInfoWidget);
