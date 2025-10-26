"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";

import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";

// --- Types ---
type Action = "Sell" | "Neutral" | "Buy";

type Indicator = {
    name: string;
    value: number;
    action: Action;
};

type TimeframeId = "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "4h" | "1d";

type SummaryLabel = "Strong sell" | "Sell" | "Neutral" | "Buy" | "Strong buy";

type Summary = {
    sell: number;
    neutral: number;
    buy: number;
    summary: SummaryLabel;
};

type SentimentSignal = "Positive" | "Neutral" | "Negative";

type Sentiment = Record<string, SentimentSignal>;

type TimeframeData = {
    oscillators: Indicator[];
    movingAverages: Indicator[];
    summary: Summary;
    sentiment: Sentiment;
};

type DataMap = Record<TimeframeId, TimeframeData>;

// --- Config ---
const timeframesConfig: { id: TimeframeId; label: string }[] = [
    { id: "1m", label: "1 minute" },
    { id: "5m", label: "5 minutes" },
    { id: "10m", label: "10 minutes" },
    { id: "15m", label: "15 minutes" },
    { id: "30m", label: "30 minutes" },
    { id: "1h", label: "1 hour" },
    { id: "4h", label: "4 hours" },
    { id: "1d", label: "1 day" },
];

const colorMap: Record<string, string> = {
    "strong sell": "#F44336",
    sell: "#F44336",
    neutral: "#a0a0a0",
    buy: "#2196F3",
    "strong buy": "#1976D2",
};

// --- Simulated data seeds (replace with real data if desired) ---
const baseOscillators: Indicator[] = [
    { name: "Relative Strength Index (14)", value: 56.3, action: "Neutral" },
    { name: "Stochastic %K (14, 3, 3)", value: 45.4, action: "Neutral" },
    { name: "Commodity Channel Index (20)", value: -11.1, action: "Neutral" },
    { name: "Average Directional Index (14)", value: 18.0, action: "Neutral" },
    { name: "Awesome Oscillator", value: -1361.0, action: "Neutral" },
    { name: "Momentum (10)", value: -596.6, action: "Buy" },
    { name: "MACD Level (12, 26)", value: 275.1, action: "Sell" },
    { name: "Stochastic RSI Fast (3, 3, 14, 14)", value: 43.8, action: "Neutral" },
    { name: "Williams Percent Range (14)", value: -30.4, action: "Neutral" },
    { name: "Bull Bear Power", value: 273.5, action: "Buy" },
    { name: "Ultimate Oscillator (7, 14, 28)", value: 57.5, action: "Neutral" },
];

const baseMovingAverages: Indicator[] = [
    { name: "Exponential Moving Average (10)", value: 115694.0, action: "Buy" },
    { name: "Simple Moving Average (10)", value: 115341.7, action: "Buy" },
    { name: "Exponential Moving Average (20)", value: 115821.0, action: "Buy" },
    { name: "Simple Moving Average (20)", value: 116817.5, action: "Buy" },
    { name: "Exponential Moving Average (30)", value: 115219.4, action: "Buy" },
    { name: "Simple Moving Average (30)", value: 117048.4, action: "Buy" },
    { name: "Exponential Moving Average (50)", value: 113313.9, action: "Buy" },
    { name: "Simple Moving Average (50)", value: 112914.8, action: "Buy" },
    { name: "Exponential Moving Average (100)", value: 108739.1, action: "Buy" },
    { name: "Simple Moving Average (100)", value: 108606.4, action: "Buy" },
    { name: "Exponential Moving Average (200)", value: 102656.0, action: "Buy" },
    { name: "Simple Moving Average (200)", value: 99532.6, action: "Buy" },
    { name: "Ichimoku Base Line (9, 26, 52, 26)", value: 117594.2, action: "Neutral" },
    { name: "Volume Weighted Moving Average (20)", value: 116714.3, action: "Buy" },
    { name: "Hull Moving Average (9)", value: 115562.7, action: "Buy" },
];

const calculateSummary = (oscillators: Indicator[], movingAverages: Indicator[]): Summary => {
    const all = [...oscillators, ...movingAverages];
    const summary = { sell: 0, neutral: 0, buy: 0 } as Summary;

    all.forEach((i) => {
        if (i.action === "Sell") summary.sell++;
        else if (i.action === "Neutral") summary.neutral++;
        else summary.buy++;
    });
    const total = summary.sell + summary.neutral + summary.buy;
    const score = (summary.buy - summary.sell) / Math.max(1, total);
    let overall: SummaryLabel = "Neutral";

    if (score > 0.6) overall = "Strong buy";
    else if (score > 0.2) overall = "Buy";
    else if (score < -0.6) overall = "Strong sell";
    else if (score < -0.2) overall = "Sell";

    return { ...summary, summary: overall };
};

const generateSentimentData = (): Sentiment => {
    const moods: SentimentSignal[] = ["Positive", "Neutral", "Negative"];
    const pick = () => moods[Math.floor(Math.random() * moods.length)];

    return {
        "Market Mood": pick(),
        "Twitter Buzz": pick(),
        "Reddit Community Mood": pick(),
        "US Political Climate": pick(),
        "EU Political Climate": pick(),
        "Asia Political Climate": pick(),
        "Whale Activity": pick(),
        "Market Volatility (VIX)": pick(),
        "Analyst Ratings": pick(),
    };
};

const generateDynamicData = (): DataMap => {
    const timeframes: TimeframeId[] = ["1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d"];
    const scenarios: Record<SummaryLabel, { sellBias: number; buyBias: number }> = {
        "Strong sell": { sellBias: 0.8, buyBias: 0.1 },
        Sell: { sellBias: 0.6, buyBias: 0.2 },
        Neutral: { sellBias: 0.3, buyBias: 0.3 },
        Buy: { sellBias: 0.2, buyBias: 0.6 },
        "Strong buy": { sellBias: 0.1, buyBias: 0.8 },
    };
    const sequence: SummaryLabel[] = [
        "Strong sell",
        "Sell",
        "Neutral",
        "Buy",
        "Strong buy",
        "Buy",
        "Neutral",
        "Sell",
    ];

    const result: Partial<DataMap> = {};

    const adjust = (items: Indicator[], sellBias: number, buyBias: number) =>
        items.map((i) => {
            const rnd = Math.random();
            const action: Action = rnd < sellBias ? "Sell" : rnd < sellBias + buyBias ? "Buy" : "Neutral";
            const value = i.value * (1 + (Math.random() - 0.5) * 0.05);

            return { ...i, action, value };
        });

    timeframes.forEach((tf, idx) => {
        const scenario = scenarios[sequence[idx]];
        const oscillators = adjust(baseOscillators, scenario.sellBias, scenario.buyBias);
        const movingAverages = adjust(baseMovingAverages, scenario.sellBias, scenario.buyBias);

        (result as DataMap)[tf] = {
            oscillators,
            movingAverages,
            summary: calculateSummary(oscillators, movingAverages),
            sentiment: generateSentimentData(),
        };
    });

    return result as DataMap;
};

// --- Modal ---
function TechnicalAnalysisModal({
                                    onClose,
                                    data,
                                    timeframe,
                                }: {
    onClose: () => void;
    data: TimeframeData;
    timeframe: string;
}) {
    const [activeTab, setActiveTab] = useState<"oscillators" | "movingAverages" | "sentiment">("oscillators");

    const parseIndicatorName = (fullName: string) => {
        const match = fullName.match(/(.+?)\s?\((\d+.*)\)/);

        if (match) return { name: match[1].trim(), params: match[2] };

        return { name: fullName, params: null as string | null };
    };

    const renderTable = (items: Indicator[]) => (
        <div className="w-full">
            <table className="w-full table-fixed border-collapse text-[0.9rem]">
                <thead>
                <tr className="text-zinc-400 text-xs">
                    <th className="text-left py-4 px-2 font-medium">Name</th>
                    <th className="text-left py-4 px-2 font-medium">Value</th>
                    <th className="text-left py-4 px-2 font-medium">Signal</th>
                </tr>
                </thead>
                <tbody>
                {items.map((item, idx) => {
                    const { name, params } = parseIndicatorName(item.name);

                    return (
                        <tr key={idx} className="border-b border-white/10">
                            <td className="py-4 px-2 truncate">
                                {name}
                                {params && <span className="ml-2 text-zinc-500 text-[0.85em]">{params}</span>}
                            </td>
                            <td className="py-4 px-2">{item.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                            <td
                                className={
                                    "py-4 px-2 font-semibold " +
                                    (item.action === "Sell"
                                        ? "text-red-500"
                                        : item.action === "Buy"
                                            ? "text-blue-500"
                                            : "text-zinc-400")
                                }
                            >
                                {item.action}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );

    const renderSentiment = (sent: Sentiment) => (
        <div className="w-full">
            <table className="w-full table-fixed border-collapse text-[0.9rem]">
                <thead>
                <tr className="text-zinc-400 text-xs">
                    <th className="text-left py-4 px-2 font-medium">Factor</th>
                    <th className="text-left py-4 px-2 font-medium">Signal</th>
                </tr>
                </thead>
                <tbody>
                {Object.entries(sent).map(([k, v]) => (
                    <tr key={k} className="border-b border-white/10">
                        <td className="py-4 px-2 truncate">{k}</td>
                        <td
                            className={
                                "py-4 px-2 font-semibold " +
                                (v === "Negative" ? "text-red-500" : v === "Positive" ? "text-blue-500" : "text-zinc-400")
                            }
                        >
                            {v}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div
            aria-label="Technical Indicators"
            aria-modal="true"
            className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-5"
            role="dialog"
        >
            <div className="bg-zinc-950 border border-white/10 shadow-2xl text-white w-full max-w-[680px] max-h-[90vh] rounded-2xl p-8 flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                    <h2 className="text-xl font-bold">Technical Indicators - {timeframe}</h2>
                    <button
                        aria-label="Close"
                        className="text-3xl leading-none text-zinc-400 hover:text-white transition"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>

                <div className="border-b border-white/10 mb-6 flex">
                    <button
                        className={`px-4 py-3 text-sm font-medium -mb-px border-b-2 transition ${
                            activeTab === "oscillators" ? "text-white border-blue-500" : "text-zinc-400 border-transparent hover:text-white"
                        }`}
                        onClick={() => setActiveTab("oscillators")}
                    >
                        Oscillators
                    </button>
                    <button
                        className={`px-4 py-3 text-sm font-medium -mb-px border-b-2 transition ${
                            activeTab === "movingAverages" ? "text-white border-blue-500" : "text-zinc-400 border-transparent hover:text-white"
                        }`}
                        onClick={() => setActiveTab("movingAverages")}
                    >
                        Moving Averages
                    </button>
                    <button
                        className={`px-4 py-3 text-sm font-medium -mb-px border-b-2 transition ${
                            activeTab === "sentiment" ? "text-white border-blue-500" : "text-zinc-400 border-transparent hover:text-white"
                        }`}
                        onClick={() => setActiveTab("sentiment")}
                    >
                        Sentiment
                    </button>
                </div>

                <div className="flex-1 overflow-auto pr-1 no-scrollbar">
                    {activeTab === "oscillators" && renderTable(data.oscillators)}
                    {activeTab === "movingAverages" && renderTable(data.movingAverages)}
                    {activeTab === "sentiment" && renderSentiment(data.sentiment)}
                </div>
            </div>
        </div>
    );
}

// --- Main Component ---
export default function FearAndGreedMeter() {
    const [data, setData] = useState<DataMap | null>(null);
    const [activeTimeframeIndex, setActiveTimeframeIndex] = useState<number>(5); // default: 1h
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Fake fetch
    useEffect(() => {
        setIsLoading(true);
        const t = setTimeout(() => {
            try {
                setData(generateDynamicData());
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(t);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
        };

        document.addEventListener("mousedown", handle);

        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const selectedTimeframe = timeframesConfig[activeTimeframeIndex];
    const currentData = data ? data[selectedTimeframe.id] : null;

    const updateData = (newIndex: number) => {
        if (newIndex !== activeTimeframeIndex) setActiveTimeframeIndex(newIndex);
        setIsDropdownOpen(false);
    };

    const visibleTimeframeIndices = useMemo(() => {
        const len = timeframesConfig.length;
        let firstIndex: number;

        if (activeTimeframeIndex <= 1) firstIndex = 0;
        else if (activeTimeframeIndex >= len - 2) firstIndex = len - 3;
        else firstIndex = activeTimeframeIndex - 1;

        return [firstIndex, firstIndex + 1, firstIndex + 2].filter((i) => i >= 0 && i < len);
    }, [activeTimeframeIndex]);

    // --- Meter calculations ---
    const TOTAL_DEGREES = 180;
    const arcRadius = 75; // matches SVG path radii
    const arcLength = Math.PI * arcRadius; // half circumference (for dasharray)
    const degreeToValue = (degree: number) => (180 - degree) / 1.8; // -> 0..100

    const summaryToValueMap: Record<SummaryLabel, { pointer: number; bar: number }> = {
        "Strong sell": { pointer: degreeToValue(165), bar: degreeToValue(165) },
        Sell: { pointer: degreeToValue(127), bar: degreeToValue(127) },
        Neutral: { pointer: degreeToValue(90), bar: degreeToValue(90) },
        Buy: { pointer: degreeToValue(52), bar: degreeToValue(52) },
        "Strong buy": { pointer: degreeToValue(15), bar: degreeToValue(0) },
    };

    const meterValues = useMemo(() => {
        if (!currentData) return { rotation: -90, dashOffset: arcLength, activeColor: "#a0a0a0", summary: "N/A" };
        const summary = currentData.summary.summary;
        const values = summaryToValueMap[summary] || summaryToValueMap["Neutral"];
        const rotation = -90 + (values.pointer / 100) * TOTAL_DEGREES;
        const dashOffset = arcLength * (1 - values.bar / 100);
        const activeColor = colorMap[summary.toLowerCase()];

        return { rotation, dashOffset, activeColor, summary };
    }, [currentData]);

    if (isLoading)
        return (
            <LoadingWithSpinner />
        );

    if (!data)
        return (
            <div className="font-sans bg-zinc-900 text-red-500 w-[360px] max-w-full rounded-3xl p-6 border border-white/10 shadow-2xl">
                Error loading data.
            </div>
        );

    return (
        <div className="font-sans text-white w-full ua-card py-3 shadow-2xl">
            {/* Timeframe selector */}
            <div className="relative grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center mb-8 min-h-[38px] mx-2">
                {visibleTimeframeIndices.map((index) => {
                    const tf = timeframesConfig[index];
                    const active = index === activeTimeframeIndex;

                    return (
                        <button
                            key={tf.id}
                            className={`px-2 py-2 rounded-md text-xs font-medium transition whitespace-nowrap text-center ${
                                active ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                            }`}
                            onClick={() => updateData(index)}
                        >
                            {tf.label}
                        </button>
                    );
                })}

                <div ref={dropdownRef} className="relative">
                    <button
                        className="px-2 py-2 rounded-md text-xs font-medium transition flex items-center justify-center text-zinc-400 hover:text-white"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsDropdownOpen((s) => !s);
                        }}
                    >
                        More
                        <svg
                            className="ml-1"
                            fill="currentColor"
                            height="10"
                            viewBox="0 0 16 16"
                            width="10"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                        </svg>
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-36 bg-zinc-800 rounded-md p-2 shadow-xl z-20">
                            {timeframesConfig.map((tf, index) => (
                                <button
                                    key={tf.id}
                                    className="block w-full text-left px-3 py-2 text-xs rounded-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
                                    onClick={() => updateData(index)}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Meter */}
            <div className="relative w-full h-[100px] flex items-center justify-center mb-4">
                <div className="relative w-[73%] pt-[40%]">
                    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 200 100">
                        <defs>
                            <linearGradient id="valueGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#F44336" />
                                <stop offset="50%" stopColor="#9C27B0" />
                                <stop offset="100%" stopColor="#2196F3" />
                            </linearGradient>
                        </defs>

                        {/* background arc */}
                        <path className="fill-none stroke-white/10" d="M 25 100 A 75 75 0 0 1 175 100" strokeLinecap="round" strokeWidth={16} />

                        {/* value arc */}
                        <path
                            className="fill-none"
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            stroke="url(#valueGradient)"
                            strokeLinecap="round"
                            strokeWidth={8}
                            style={{ strokeDasharray: arcLength, strokeDashoffset: meterValues.dashOffset, transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
                        />

                        {/* labels */}
                        {(() => {
                            const cx = 100, cy = 100, r = 96; // arc radius (75) + label offset
                            const defs: Array<{ id: number, text: SummaryLabel; angle: number }> = [
                                { id: 1, text: "Strong sell", angle: 172 },
                                { id: 2, text: "Sell", angle: 135 },
                                { id: 3, text: "Neutral", angle: 90 },
                                { id: 4, text: "Buy", angle: 45 },
                                { id: 5, text: "Strong buy", angle: 8 },
                            ];
                            const toXY = (ang: number) => {
                                const rad = (ang * Math.PI) / 180;
                                const x = cx + r * Math.cos(rad);
                                const y = cy - r * Math.sin(rad);

                                return { x, y };
                            };

                            return (
                                <g>
                                    {defs.map(({ id, text, angle }) => {
                                        let { x, y } = toXY(angle);
                                        const fill = meterValues.summary === text ? meterValues.activeColor : "#888";

                                        if (id === 1) x -= 14;
                                        else if (id === 5) x += 14;
                                        else if (id === 3) y += 3;

                                        return (
                                            <text key={text} className="text-[8px] font-semibold" style={{ fill }} textAnchor="middle" x={x} y={y}>
                                                {text}
                                            </text>
                                        );
                                    })}
                                </g>
                            );
                        })()}


                        {/* needle */}
                        <g
                            style={{ transform: `rotate(${meterValues.rotation}deg)`, transformOrigin: "100px 100px", transition: "transform 3.5s cubic-bezier(0.22,1,0.36,1)" }}
                        >
                            <polygon fill="#fff" points="99.5,40 100.5,40 101.5,100 98.5,100" />
                            <circle cx={100} cy={100} fill="#fff" r={3.5} />
                            <circle cx={100} cy={100} fill="#0d0d0d" r={1.5} />
                        </g>
                    </svg>
                </div>
            </div>

            {/* Current summary */}
            <div className="text-center relative z-10 h-8 pt-2">
                <div className="text-[1.1rem] font-semibold" style={{ color: meterValues.activeColor }}>
                    {meterValues.summary}
                </div>
            </div>

            {/* Summary stats */}
            {currentData && (
                <div className="grid grid-cols-3 text-center mt-6 pt-6 border-t border-white/10 mx-2">
                    <button
                        aria-label="View details"
                        className="px-2 py-1 rounded-lg transition hover:scale-[1.05] hover:bg-white/5"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <div className="text-2xl font-semibold text-white">{currentData.summary.sell}</div>
                        <div className="text-sm text-red-500">Sell</div>
                    </button>
                    <button
                        aria-label="View details"
                        className="px-2 py-1 rounded-lg transition hover:scale-[1.05] hover:bg-white/5"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <div className="text-2xl font-semibold text-white">{currentData.summary.neutral}</div>
                        <div className="text-sm text-zinc-400">Neutral</div>
                    </button>
                    <button
                        aria-label="View details"
                        className="px-2 py-1 rounded-lg transition hover:scale-[1.05] hover:bg-white/5"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <div className="text-2xl font-semibold text-white">{currentData.summary.buy}</div>
                        <div className="text-sm text-blue-500">Buy</div>
                    </button>
                </div>
            )}

            {isModalOpen && currentData && (
                <TechnicalAnalysisModal data={currentData} timeframe={selectedTimeframe.label} onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
}
