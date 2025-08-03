import React, { FC, useState, useEffect, useRef } from 'react';

import MarketPulse from "@/components/shared/MarketPulse";

// Define allowed summary strings
type SummaryKey = 'Strong sell' | 'Sell' | 'Neutral' | 'Buy' | 'Strong buy';

// Structure for each data entry
interface DataPoint {
    sell: number;
    neutral: number;
    buy: number;
    summary: SummaryKey;
}

// Timeframe options
const timeframes = [
    { id: '1m', label: '1 minute' },
    { id: '5m', label: '5 minutes' },
    { id: '10m', label: '10 minutes' },
    { id: '15m', label: '15 minutes' },
    { id: '30m', label: '30 minutes' },
    { id: '1h', label: '1 hour' },
    { id: '4h', label: '4 hours' },
    { id: '1d', label: '1 day' },
] as const;

type Timeframe = typeof timeframes[number];
type TimeframeId = Timeframe['id'];

// Mock data mapped by timeframe
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

// Color mapping for summary labels
const colorMap: Record<SummaryKey, string> = {
    'Strong sell': '#F44336',
    'Sell': '#F44336',
    'Neutral': '#a0a0a0',
    'Buy': '#2196F3',
    'Strong buy': '#1976D2',
};

// Convert degree to percentage value
const degreeToValue = (deg: number): number => (180 - deg) / 1.8;

// Map summary to pointer/bar values
const summaryToValueMap: Record<SummaryKey, { pointer: number; bar: number }> = {
    'Strong sell': { pointer: degreeToValue(165), bar: degreeToValue(165) },
    'Sell':        { pointer: degreeToValue(127), bar: degreeToValue(127) },
    'Neutral':     { pointer: degreeToValue(90),  bar: degreeToValue(90) },
    'Buy':         { pointer: degreeToValue(52),  bar: degreeToValue(52) },
    'Strong buy':  { pointer: degreeToValue(15),  bar: degreeToValue(0) },
};

const TechnicalAnalysis: FC = () => {
    const [activeIndex, setActiveIndex] = useState<number>(1);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [counts, setCounts] = useState<DataPoint>(mockData[timeframes[activeIndex].id]);
    const [currentSummary, setCurrentSummary] = useState<SummaryKey>(mockData[timeframes[activeIndex].id].summary);
    const svgRef = useRef<SVGSVGElement>(null);

    const arcRadius = 75;
    const arcLength = Math.PI * arcRadius;

    const updateMeter = (pointer: number, bar: number, summary: SummaryKey) => {
        if (!svgRef.current) return;
        const rotation = -90 + (pointer / 100) * 180;
        const needle = svgRef.current.querySelector<SVGGElement>('#meter-needle-group');
        const arc = svgRef.current.querySelector<SVGPathElement>('#meter-value-arc');

        needle?.setAttribute('transform', `rotate(${rotation} 100 100)`);
        if (arc) {
            arc.style.strokeDasharray = `${arcLength}`;
            arc.style.strokeDashoffset = `${arcLength * (1 - bar / 100)}`;
        }
        setCurrentSummary(summary);
    };

    const selectIndex = (idx: number) => {
        if (idx === activeIndex) return;
        setActiveIndex(idx);
        const { id } = timeframes[idx];
        const data = mockData[id];

        setCounts(data);
        const vals = summaryToValueMap[data.summary];

        updateMeter(vals.pointer, vals.bar, data.summary);
        setShowDropdown(false);
    };

    useEffect(() => {
        const { id } = timeframes[activeIndex];
        const data = mockData[id];
        const vals = summaryToValueMap[data.summary];

        updateMeter(vals.pointer, vals.bar, data.summary);
        setCounts(data);
    }, [activeIndex]);

    const visibleButtons = (): number[] => {
        const last = timeframes.length - 1;
        const first = activeIndex === 0 ? 0 : activeIndex === last ? last - 2 : activeIndex - 1;

        return [first, first + 1, first + 2];
    };

    return (
        <div className="bg-dark-gray rounded-2xl p-6 max-w-sm w-full shadow-lg relative mx-auto">
            {/* Time selector */}
            <div className="relative grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-8 items-center">
                {visibleButtons().map(i => (
                    <button
                        key={i}
                        className={`px-2 py-1 text-xs font-medium rounded ${i === activeIndex ? 'bg-gray-700 text-white' : 'text-gray-400'}`}            onClick={() => selectIndex(i)}
                    >{timeframes[i].label}</button>
                ))}
                <button className="p-2 flex items-center justify-center" onClick={() => setShowDropdown(!showDropdown)}>
                    More
                    <svg className="ml-1" height={10} viewBox="0 0 16 16" width={10} xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" fill="currentColor"/>
                    </svg>
                </button>
                {showDropdown && (
                    <div className="absolute top-full right-0 bg-[#2c2c2c] rounded p-2 mt-2 w-36 shadow-lg z-20">
                        {timeframes.map((tf, idx) => (
                            <button
                                key={tf.id}
                                className="block text-gray-400 text-xs py-1 px-2 rounded hover:bg-gray-700 hover:text-white"
                                onClick={e => { e.preventDefault(); selectIndex(idx); }}
                            >{tf.label}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Meter visualization */}
            <div className="flex justify-center items-center mb-4">
                <div className="w-4/5 pt-[40%] relative">
                    <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full overflow-visible" viewBox="0 0 200 100">
                        <defs>
                            <linearGradient id="valueGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#F44336" />
                                <stop offset="50%" stopColor="#9C27B0" />
                                <stop offset="100%" stopColor="#2196F3" />
                            </linearGradient>
                        </defs>
                        <path className="fill-none stroke-white/10 stroke-[16] rounded-full" d="M 25 100 A 75 75 0 0 1 175 100" />
                        <path className="fill-none stroke-[8] transition-all" d="M 25 100 A 75 75 0 0 1 175 100" id="meter-value-arc" stroke="url(#valueGradient)" />
                        <g className="transition-all">
                            <text className="text-[8px] font-semibold fill-gray-500" x={-5} y={75}>Strong sell</text>
                            <text className="text-[8px] font-semibold fill-gray-500" x={38} y={32}>Sell</text>
                            <text className="text-[8px] font-semibold fill-gray-500" x={100} y={12}>Neutral</text>
                            <text className="text-[8px] font-semibold fill-gray-500" x={162} y={32}>Buy</text>
                            <text className="text-[8px] font-semibold fill-gray-500" x={205} y={75}>Strong buy</text>
                        </g>
                        <g className="transition-transform" id="meter-needle-group">
                            <polygon className="fill-white" points="99.5,40 100.5,40 101.5,100 98.5,100" />
                            <circle className="fill-white" cx={100} cy={100} r={3.5} />
                            <circle className="fill-[#1a1a1a]" cx={100} cy={100} r={1.5} />
                        </g>
                    </svg>
                </div>
            </div>

            {/* Current summary */}
            <div className="text-center mb-6">
                <span className="text-lg font-semibold transition-colors" style={{ color: colorMap[currentSummary] }}>
                  {currentSummary}
                </span>
            </div>

            {/* Stats */}
            <div className="flex justify-around pt-6 border-t border-white/10">
                <div className="text-center">
                    <div className="text-2xl font-semibold text-white">{counts.sell}</div>
                    <div className="text-xs text-red-500">Sell</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-semibold text-white">{counts.neutral}</div>
                    <div className="text-xs text-gray-400">Neutral</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-semibold text-white">{counts.buy}</div>
                    <div className="text-xs text-blue-500">Buy</div>
                </div>
            </div>

            <MarketPulse className="mt-6" />
        </div>
    );
};

export default TechnicalAnalysis;
