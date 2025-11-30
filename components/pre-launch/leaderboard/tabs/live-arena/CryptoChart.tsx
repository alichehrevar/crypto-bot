import React, { useState, useMemo, useRef, useEffect } from 'react';
import Image from "next/image";

// --- Types ---

interface DataPoint {
    date: string;
    value: number;
}

interface Trader {
    id: string;
    name: string;
    color: string;
    avatar: string; // Using initials or image url
    currentValue: number;
    data: DataPoint[];
}

// --- Mock Data ---

const DATES = ["5 oct", "10 oct", "15 oct", "20 oct", "25 oct", "30 oct"];

const generateData = (base: number, volatility: number): DataPoint[] => {
    return DATES.map((date, i) => ({
        date,
        value: base + Math.sin(i * 0.8) * volatility + (i * (volatility * 0.5)) + (Math.random() * 1000 - 500)
    }));
};

const TRADERS: Trader[] = [
    {
        id: 'quantum-lead',
        name: 'QuantumLead',
        color: '#4ade80', // green-400
        avatar: 'Q',
        currentValue: 12248.5,
        data: [
            { date: '5 oct', value: 10000 },
            { date: '10 oct', value: 4800 },
            { date: '15 oct', value: 3500 },
            { date: '20 oct', value: 7800 },
            { date: '25 oct', value: 6400 },
            { date: '30 oct', value: 10500 },
        ]
    },
    {
        id: 'quantum-99',
        name: 'Quantum99',
        color: '#67e8f9', // cyan-300
        avatar: 'Q9',
        currentValue: 24500.0,
        data: [
            { date: '5 oct', value: 3500 },
            { date: '10 oct', value: 7200 },
            { date: '15 oct', value: 10800 },
            { date: '20 oct', value: 16100 },
            { date: '25 oct', value: 18500 },
            { date: '30 oct', value: 24500 },
        ]
    },
    {
        id: 'trader-99',
        name: 'Trader99',
        color: '#8b5cf6', // violet-500
        avatar: 'T9',
        currentValue: 18200.5,
        data: [
            { date: '5 oct', value: 2200 },
            { date: '10 oct', value: 4000 },
            { date: '15 oct', value: 6800 },
            { date: '20 oct', value: 8700 },
            { date: '25 oct', value: 12000 },
            { date: '30 oct', value: 18200 },
        ]
    },
    {
        id: 'sharp-lead',
        name: 'SharpLead',
        color: '#fbbf24', // amber-400
        avatar: 'SL',
        currentValue: 12248.5,
        data: [
            { date: '5 oct', value: 10000 },
            { date: '10 oct', value: 7000 },
            { date: '15 oct', value: 9200 },
            { date: '20 oct', value: 17800 },
            { date: '25 oct', value: 15500 },
            { date: '30 oct', value: 12248 },
        ]
    },
    {
        id: 'trader-2000',
        name: 'Trader2000',
        color: '#f3f4f6', // gray-100
        avatar: 'T2',
        currentValue: 11500.0,
        data: [
            { date: '5 oct', value: 10000 },
            { date: '10 oct', value: 3800 },
            { date: '15 oct', value: 9600 },
            { date: '20 oct', value: 7400 },
            { date: '25 oct', value: 13600 },
            { date: '30 oct', value: 11000 },
        ]
    },
];

// --- Helpers ---

// Simple smoothing function for SVG path (Catmull-Rom spline conversion to cubic bezier is complex,
// using a simpler L (Line) for strict accuracy or basic curve smoothing could work.
// For this visual style, standard lines with slight smoothing or straight lines are acceptable.
// The screenshots show straight lines between points.
const getSvgPath = (data: DataPoint[], width: number, height: number, maxVal: number) => {
    const stepX = width / (data.length - 1);

    const points = data.map((d, i) => {
        const x = i * stepX;
        const y = height - (d.value / maxVal) * height;

        return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
};

const getAreaPath = (data: DataPoint[], width: number, height: number, maxVal: number) => {
    const linePath = getSvgPath(data, width, height, maxVal);

    return `${linePath} L ${width},${height} L 0,${height} Z`;
};

// --- Components ---

export default function CryptoChart() {
    const [selectedTraderId, setSelectedTraderId] = useState<string | null>(null);
    const [hoverX, setHoverX] = useState<number | null>(null);
    const [chartRect, setChartRect] = useState<DOMRect | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    const selectedTrader = useMemo(() =>
            TRADERS.find(t => t.id === selectedTraderId) || null
        , [selectedTraderId]);

    const displayTraders = selectedTrader ? [selectedTrader] : TRADERS;

    // Chart dimensions config
    const CHART_HEIGHT = 400;
    const Y_AXIS_MAX = 25000;

    // Layout Constants
    const VIEWBOX_WIDTH = 1000;
    const RIGHT_MARGIN = 160; // Space for the badges
    const CHART_WIDTH = VIEWBOX_WIDTH - RIGHT_MARGIN; // The actual width of the line graph

    useEffect(() => {
        const updateRect = () => {
            if (chartRef.current) {
                setChartRect(chartRef.current.getBoundingClientRect());
            }
        };

        updateRect();
        window.addEventListener('resize', updateRect);

        return () => window.removeEventListener('resize', updateRect);
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!chartRef.current) return;
        const rect = chartRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // Map the mouse X (which is relative to the full container width)
        // to the SVG coordinate space (0-1000)
        const svgX = (x / rect.width) * VIEWBOX_WIDTH;

        setHoverX(Math.max(0, Math.min(svgX, CHART_WIDTH))); // Clamp to chart area
    };

    const handleMouseLeave = () => {
        setHoverX(null);
    };

    const getHoverDataIndex = () => {
        if (hoverX === null) return -1;
        const stepX = CHART_WIDTH / (DATES.length - 1);

        return Math.round(hoverX / stepX);
    };

    const hoverIndex = getHoverDataIndex();

    // Handlers
    const toggleTrader = (id: string) => {
        if (selectedTraderId === id) {
            setSelectedTraderId(null); // Deselect if already active
        } else {
            setSelectedTraderId(id);
        }
    };

    return (
        <div className="text-gray-300 font-sans flex flex-col items-center">

            {/* Main Container */}
            <div className="w-full border border-[#4A4A4A] rounded-2xl bg-[#121212] p-6 shadow-2xl relative overflow-hidden">

                {/* Header Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                selectedTraderId === null
                                    ? 'bg-[#F2F3F733] text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                            onClick={() => setSelectedTraderId(null)}
                        >
                            All
                        </button>
                        {TRADERS.map(trader => (
                            <button
                                key={trader.id}
                                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    selectedTraderId === trader.id
                                        ? 'bg-[#F2F3F733] text-white shadow-lg'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                                }`}
                                onClick={() => toggleTrader(trader.id)}
                            >
                                {trader.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">View:</span>
                        <div className="flex bg-gray-800 rounded-lg p-1">
                            <button className="px-3 py-1 rounded-md text-xs text-gray-400 hover:text-white">All</button>
                            <button className="px-3 py-1 rounded-md text-xs bg-gray-600 text-white shadow">72H</button>
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="relative w-full h-[450px] pl-12 pr-4">

                    {/* Y Axis Labels */}
                    <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 font-mono pointer-events-none">
                        {[25000, 20000, 15000, 10000, 5000, 0].map((val) => (
                            <span key={val}>${val.toLocaleString()}</span>
                        ))}
                    </div>

                    {/* Grid Lines */}
                    <div className="absolute left-12 right-4 top-2 bottom-8 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-full border-b border-dashed border-gray-800 h-0" />
                        ))}
                    </div>

                    {/* Chart SVG Layer */}
                    <div
                        ref={chartRef}
                        className="absolute left-12 right-4 top-2 bottom-8 cursor-crosshair z-10"
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                    >
                        <svg
                            className="overflow-visible"
                            height="100%"
                            preserveAspectRatio="none"
                            viewBox={`0 0 ${VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
                            width="100%"
                        >
                            <defs>
                                {/* Gradients for Single View */}
                                {TRADERS.map(t => (
                                    <linearGradient key={t.id} id={`grad-${t.id}`} x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor={t.color} stopOpacity="0.25" />
                                        <stop offset="100%" stopColor={t.color} stopOpacity="0" />
                                    </linearGradient>
                                ))}
                            </defs>

                            {displayTraders.map((trader, index) => {
                                const isFocused = selectedTraderId === trader.id;

                                // Use CHART_WIDTH (840) instead of full 1000 so we have space at the end
                                const path = getSvgPath(trader.data, CHART_WIDTH, CHART_HEIGHT, Y_AXIS_MAX);
                                const areaPath = getAreaPath(trader.data, CHART_WIDTH, CHART_HEIGHT, Y_AXIS_MAX);

                                // End Point Logic for Avatar
                                const lastPoint = trader.data[trader.data.length - 1];
                                const endX = CHART_WIDTH; // The end of the line is now at the restricted width
                                const endY = CHART_HEIGHT - (lastPoint.value / Y_AXIS_MAX) * CHART_HEIGHT;

                                return (
                                    <g key={trader.id} className="transition-all duration-500 ease-in-out">
                                        {/* Area Fill - Only if Single View */}
                                        {isFocused && (
                                            <path d={areaPath} fill={`url(#grad-${trader.id})`} />
                                        )}

                                        {/* Line */}
                                        <path
                                            className="drop-shadow-md"
                                            d={path}
                                            fill="none"
                                            stroke={trader.color}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={isFocused ? 3 : 2}
                                        />

                                        {/* End Point Avatar & Badge */}
                                        <g transform={`translate(${endX}, ${endY})`}>
                                            <circle fill={trader.color} r="4" />
                                            {/* Avatar Circle - positioned to the right */}
                                            <foreignObject className="overflow-visible" height="34" width="140" x="10" y="-15">
                                                <div className="flex items-center gap-2 transition-transform hover:scale-110 origin-left">
                                                    <div
                                                        className="w-7 h-7 relative rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white/20 z-10"
                                                        style={{ backgroundColor: trader.color }}
                                                    >
                                                        {['Q', 'Q9', 'T9', 'SL', 'T2'].includes(trader.avatar) ? (
                                                            <span>{trader.avatar}</span>
                                                        ) : (
                                                            <Image fill alt={trader.name} className="w-full h-full rounded-full object-cover" src={trader.avatar} />
                                                        )}
                                                    </div>
                                                    <div
                                                        className="px-2 py-1 rounded text-[11px] font-bold text-white shadow-sm whitespace-nowrap"
                                                        style={{ backgroundColor: trader.color }}
                                                    >
                                                        ${trader.currentValue.toLocaleString()}
                                                    </div>
                                                </div>
                                            </foreignObject>
                                        </g>
                                    </g>
                                );
                            })}

                            {/* Hover Line */}
                            {hoverX !== null && (
                                <line
                                    stroke="#4b5563"
                                    strokeDasharray="4 4"
                                    strokeWidth="1"
                                    x1={hoverX}
                                    x2={hoverX}
                                    y1="0"
                                    y2={CHART_HEIGHT}
                                />
                            )}

                        </svg>

                        {/* Tooltip Overlay */}
                        {hoverX !== null && hoverIndex !== -1 && hoverIndex < DATES.length && (
                            <div
                                className="absolute top-10 pointer-events-none bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 shadow-2xl z-50 text-xs min-w-[160px]"
                                // Adjust left position calculation to map svgX back to DOM percentage
                                style={{
                                    left: `${(hoverX / VIEWBOX_WIDTH) * 100}%`,
                                    transform: 'translateX(10px)'
                                }}
                            >
                                <div className="text-gray-400 mb-2 font-mono">
                                    {DATES[hoverIndex]}, 18:24
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {(selectedTraderId ? [selectedTrader!] : TRADERS).map(trader => {
                                        const val = trader.data[hoverIndex]?.value;

                                        return (
                                            <div key={trader.id} className="flex justify-between items-center gap-4">
                                                <span style={{ color: trader.color }}>{trader.name}:</span>
                                                <span className="font-bold text-gray-200">${val?.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* X Axis Labels - Constrained to Chart Width */}
                    <div
                        className="absolute left-12 bottom-0 flex justify-between text-xs text-gray-500 font-medium pt-4"
                        style={{
                            right: `calc(1rem + ${(RIGHT_MARGIN / VIEWBOX_WIDTH) * 100}%)`
                        }}
                    >
                        {DATES.map((date) => (
                            <span key={date}>{date}</span>
                        ))}
                    </div>
                </div>

                {/* Legend / Status Bar */}
                <div className="mt-12 flex flex-col items-center gap-6">
                    <div className="flex flex-wrap justify-center gap-6">
                        {TRADERS.map(trader => (
                            <button
                                key={trader.id}
                                className={`flex items-center gap-2 text-sm transition-colors duration-200 ${
                                    selectedTraderId === trader.id || selectedTraderId === null
                                        ? 'opacity-100'
                                        : 'opacity-40 hover:opacity-70'
                                }`}
                                onClick={() => toggleTrader(trader.id)}
                            >
                                <div
                                    className="w-3 h-1 rounded-full"
                                    style={{ backgroundColor: trader.color }}
                                />
                                <span className={`font-medium ${selectedTraderId === trader.id ? 'text-white' : 'text-gray-400'}`}>
                  {trader.name}
                </span>
                            </button>
                        ))}
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-500 text-xs font-bold uppercase tracking-wider">Live</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
