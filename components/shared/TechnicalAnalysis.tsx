import React, { FC, useState, useEffect, useRef } from 'react';

import MarketPulse from "@/components/shared/MarketPulse";

// --- TYPE DEFINITIONS ---
type SummaryKey = 'Strong sell' | 'Sell' | 'Neutral' | 'Buy' | 'Strong buy';

interface DataPoint {
    sell: number;
    neutral: number;
    buy: number;
    summary: SummaryKey;
}

const timeframes = [
    { id: '1m', label: '1 minute' }, { id: '5m', label: '5 minutes' },
    { id: '10m', label: '10 minutes' }, { id: '15m', label: '15 minutes' },
    { id: '30m', label: '30 minutes' }, { id: '1h', label: '1 hour' },
    { id: '4h', label: '4 hours' }, { id: '1d', label: '1 day' },
] as const;

type TimeframeId = typeof timeframes[number]['id'];

// --- MOCK DATA & CONFIGURATION ---
const mockData: Record<TimeframeId, DataPoint> = {
    '1m': { sell: 8, neutral: 15, buy: 3, summary: 'Neutral' },
    '5m': { sell: 17, neutral: 9, buy: 0, summary: 'Strong sell' },
    '10m': { sell: 15, neutral: 10, buy: 2, summary: 'Sell' },
    '15m': { sell: 12, neutral: 12, buy: 4, summary: 'Sell' },
    '30m': { sell: 10, neutral: 10, buy: 10, summary: 'Neutral' },
    '1h': { sell: 5, neutral: 10, buy: 15, summary: 'Buy' },
    '4h': { sell: 3, neutral: 8, buy: 18, summary: 'Strong buy' },
    '1d': { sell: 2, neutral: 5, buy: 20, summary: 'Strong buy' },
};

const colorMap: Record<SummaryKey, string> = {
    'Strong sell': '#F44336',
    'Sell': '#F44336',
    'Neutral': '#a0a0a0',
    'Buy': '#2196F3',
    'Strong buy': '#1976D2',
};

const degreeToValue = (deg: number): number => (180 - deg) / 1.8;

const summaryToValueMap: Record<SummaryKey, { pointer: number; bar: number }> = {
    'Strong sell': { pointer: degreeToValue(165), bar: degreeToValue(165) },
    'Sell':        { pointer: degreeToValue(127), bar: degreeToValue(127) },
    'Neutral':     { pointer: degreeToValue(90),  bar: degreeToValue(90) },
    'Buy':         { pointer: degreeToValue(52),  bar: degreeToValue(52) },
    'Strong buy':  { pointer: degreeToValue(15),  bar: degreeToValue(0) },
};

// --- COMPONENT ---
const TechnicalAnalysis: FC = () => {
    const [activeIndex, setActiveIndex] = useState<number>(1); // Default to '5m'
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeData = mockData[timeframes[activeIndex].id];
    const { summary, sell, neutral, buy } = activeData;
    const { pointer, bar } = summaryToValueMap[summary];

    const arcRadius = 75;
    const arcLength = Math.PI * arcRadius;
    const rotation = -90 + (pointer / 100) * 180;
    const dashOffset = arcLength * (1 - bar / 100);

    // --- LOGIC ---
    const selectIndex = (idx: number) => {
        if (idx !== activeIndex) {
            setActiveIndex(idx);
        }
        setShowDropdown(false);
    };

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getVisibleButtons = (): number[] => {
        const last = timeframes.length - 1;

        if (activeIndex === 0) return [0, 1, 2];
        if (activeIndex === last) return [last - 2, last - 1, last];

        return [activeIndex - 1, activeIndex, activeIndex + 1];
    };
    const visibleButtons = getVisibleButtons();

    // --- RENDER ---
    return (
        <div className="bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-[360px] shadow-2xl shadow-black/30 border border-white/10 relative mx-auto font-sans">
            {/* Time Selector */}
            <div ref={dropdownRef} className="relative grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-8 items-center">
                {visibleButtons.map(i => (
                    <button
                        key={i}
                        className={`px-2 py-2.5 text-[0.75rem] font-medium rounded-lg transition-colors duration-300 ${
                            i === activeIndex
                                ? 'bg-[#4a4a4a] text-white'
                                : 'text-[#a0a0a0] hover:text-white'
                        }`}
                        onClick={() => selectIndex(i)}
                    >
                        {timeframes[i].label}
                    </button>
                ))}
                <button
                    className="p-2.5 flex items-center justify-center text-[#a0a0a0] hover:text-white"
                    onClick={() => setShowDropdown(!showDropdown)}
                >
                    More
                    <svg className="ml-1" fill="currentColor" height="10" viewBox="0 0 16 16" width="10" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                    </svg>
                </button>
                {showDropdown && (
                    <div className="absolute top-full right-0 bg-[#2c2c2c] rounded-lg p-2 mt-2 w-36 shadow-lg shadow-black/40 z-20">
                        {timeframes.map((tf, idx) => (
                            <button
                                key={tf.id}
                                className="block text-[#a0a0a0] text-left text-xs py-2 px-4 rounded transition-all duration-200 hover:bg-[#4a4a4a] hover:text-white"
                                onClick={(e) => { e.preventDefault(); selectIndex(idx); }}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Meter */}
            <div className="relative w-full h-[100px] flex justify-center items-center mb-4">
                <div className="relative w-4/5 pt-[40%]">
                    <svg className="absolute top-0 left-0 w-full h-full overflow-visible" viewBox="0 0 200 100">
                        <defs>
                            <linearGradient id="valueGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#F44336" />
                                <stop offset="50%" stopColor="#9C27B0" />
                                <stop offset="100%" stopColor="#2196F3" />
                            </linearGradient>
                        </defs>
                        <path className="fill-none stroke-white/10" d="M 25 100 A 75 75 0 0 1 175 100" strokeLinecap="round" strokeWidth="16" />
                        {/* === FIX IS HERE === */}
                        <path
                            className="fill-none transition-[stroke-dashoffset] duration-[3500ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            stroke="url(#valueGradient)"
                            strokeDasharray={arcLength}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            strokeWidth="8"
                        />
                        <g>
                            {Object.entries({
                                'Strong sell': {x: -5, y: 75}, 'Sell': {x: 38, y: 32},
                                'Neutral': {x: 100, y: 12}, 'Buy': {x: 162, y: 32},
                                'Strong buy': {x: 205, y: 75}
                            }).map(([key, {x, y}]) => (
                                <text
                                    key={key}
                                    className="text-[8px] font-semibold text-center transition-fill duration-500"
                                    fill={summary === key ? colorMap[summary as SummaryKey] : '#888'}
                                    textAnchor="middle"
                                    x={x} y={y}
                                >
                                    {key}
                                </text>
                            ))}
                        </g>
                        <g
                            className="transition-transform duration-[3500ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                            id="meter-needle-group"
                            transform={`rotate(${rotation} 100 100)`}
                        >
                            <polygon className="fill-white" points="99.5,40 100.5,40 101.5,100 98.5,100" />
                            <circle className="fill-white" cx="100" cy="100" r="3.5" />
                            <circle className="fill-[#1a1a1a]" cx="100" cy="100" r="1.5" />
                        </g>
                    </svg>
                </div>
            </div>

            {/* Current Value */}
            <div className="text-center h-8 relative top-2.5">
                <div
                    className="text-lg font-semibold transition-colors duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ color: colorMap[summary] }}
                >
                    {summary}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="flex justify-around text-center mt-6 pt-6 border-t border-white/10">
                <div className="stat">
                    <div className="text-2xl font-semibold text-white">{sell}</div>
                    <div className="text-sm text-[#F44336]">Sell</div>
                </div>
                <div className="stat">
                    <div className="text-2xl font-semibold text-white">{neutral}</div>
                    <div className="text-sm text-[#a0a0a0]">Neutral</div>
                </div>
                <div className="stat">
                    <div className="text-2xl font-semibold text-white">{buy}</div>
                    <div className="text-sm text-[#2196F3]">Buy</div>
                </div>
            </div>

            <MarketPulse className="mt-6" />
        </div>
    );
};

export default TechnicalAnalysis;
