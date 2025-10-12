'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import Image from "next/image";

type FilterKey = 'all' | 'btc' | 'eth';
type SummaryData = Record<FilterKey, string>;

// Mock data (replace with API data if needed)
function generateSummaryData(): SummaryData {
    return {
        all: "Market-wide consolidation persists as Bitcoin establishes a tight range above the critical $68,500 support level. This sideways price action suggests trader indecision ahead of the high-impact US CPI data release, which is expected to be a major volatility catalyst. A clear divergence is visible: the AI & Big Data sector continues to absorb capital, while capital rotates out of legacy DeFi protocols. On-chain data corroborates this cautious stance, showing a slight uptick in exchange inflows.",
        btc: "Bitcoin is currently coiling in a tight range between $68,500 and $71,000. Open interest remains high, suggesting a significant leveraged move is imminent. Key support must hold at the range low, otherwise a test of the $66,000 liquidity zone is probable. A breakout above $71,500 would signal bullish continuation.",
        eth: "Ethereum shows relative weakness compared to Bitcoin, struggling to reclaim the crucial $3,800 level. Negative perpetual funding rates indicate short-term bearish sentiment from derivatives traders. The ETH/BTC ratio is trending downwards, suggesting capital is favoring Bitcoin. A reclaim of $3,800 is needed to invalidate the bearish outlook."
    };
}

export default function DailyMarketAnalysis() {
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const summary = useMemo(generateSummaryData, []);
    const text = summary[activeFilter];

    // Refs for animated underline
    const containerRef = useRef<HTMLDivElement | null>(null);
    const underlineRef = useRef<HTMLSpanElement | null>(null);
    const buttonRefs = useRef<Record<FilterKey, HTMLButtonElement | null>>({
        all: null,
        btc: null,
        eth: null,
    });

    // Move/resize underline to the active button
    useEffect(() => {
        const moveUnderline = () => {
            const btn = buttonRefs.current[activeFilter];
            const container = containerRef.current;
            const underline = underlineRef.current;

            if (!btn || !container || !underline) return;

            const btnLeft = btn.offsetLeft;
            const btnWidth = btn.offsetWidth;

            const underlineWidth = btnWidth * 0.8; // 80% of button width
            const underlineLeft = btnLeft + (btnWidth - underlineWidth) / 2;

            underline.style.width = `${underlineWidth}px`;
            underline.style.transform = `translateX(${underlineLeft}px)`;
        };

        moveUnderline();
        window.addEventListener('resize', moveUnderline);

        return () => window.removeEventListener('resize', moveUnderline);
    }, [activeFilter]);

    return (
        <div className="w-full h-full text-white shadow-xl p-6 flex flex-col ua-card">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 relative">
                    <h3 className="text-lg font-semibold">Daily Market Analysis</h3>
                </div>

                {/* Filters */}
                <div ref={containerRef} className="relative flex gap-4">
                    {(['all','btc','eth'] as FilterKey[]).map(key => (
                        <button
                            key={key}
                            ref={(el) => { buttonRefs.current[key] = el; }}
                            className={`text-sm font-medium transition-colors ${
                                activeFilter === key ? 'text-white' : 'text-neutral-400 hover:text-white'
                            }`}
                            onClick={() => setActiveFilter(key)}
                        >
                            {key.toUpperCase()}
                        </button>
                    ))}
                    <span
                        ref={underlineRef}
                        className="pointer-events-none absolute -bottom-1 left-0 h-0.5 rounded bg-white transition-[transform,width] duration-200 ease-in-out"
                        style={{width: 0}}
                    />
                </div>
            </div>

            {/* Body */}
            <p className="mt-4 flex-grow overflow-auto text-[15px] leading-6 text-neutral-300">
                {text}
            </p>
        </div>
    );
}
