import React, { useState } from 'react';
import { Activity, Bot, Sparkles, Zap, MessageSquare, Box, Clock, Coins, RefreshCw, Banknote } from 'lucide-react';

// --- Types ---
type MetricType = 'returns' | 'equity' | 'win_rate';

interface ModelData {
    id: string;
    name: string;
    version: string;
    color: string;
    // Specific data for each metric
    returns: number;
    equity: number;
    winRate: number;
}

// --- Mock Data ---
const models: ModelData[] = [
    {
        id: 'deepseek',
        name: 'DeepSeek',
        version: 'V5',
        color: 'bg-emerald-400',
        returns: 46.31,
        equity: 14.631,
        winRate: 30.31,
    },
    {
        id: 'qwen',
        name: 'Qwen',
        version: '3 Max',
        color: 'bg-emerald-400',
        returns: 68.20,
        equity: 16.5,
        winRate: 35.0,
    },
    {
        id: 'claude',
        name: 'Claude',
        version: 'Sonnet 4.5',
        color: 'bg-orange-400',
        returns: -25.5,
        equity: 2.8,
        winRate: 10.5,
    },
    {
        id: 'grok',
        name: 'Grok',
        version: '4',
        color: 'bg-zinc-600',
        returns: -36.01,
        equity: 4.2,
        winRate: 15.0,
    },
    {
        id: 'gemini',
        name: 'Gemini',
        version: '2Pro',
        color: 'bg-blue-500',
        returns: -55.0,
        equity: 5.5,
        winRate: 18.0,
    },
    {
        id: 'gpt',
        name: 'GPT',
        version: '4o',
        color: 'bg-emerald-500',
        returns: -62.0,
        equity: 6.2,
        winRate: 22.0,
    },
];

// --- Icons Component ---
const ModelIcon = ({ id }: { id: string }) => {
    const commonClasses = "w-4 h-4 text-white";

    switch (id) {
        case 'deepseek': return <div className="bg-blue-600 p-1.5 rounded-full"><Bot className={commonClasses} /></div>;
        case 'qwen': return <div className="bg-violet-600 p-1.5 rounded-full"><Zap className={commonClasses} /></div>;
        case 'claude': return <div className="bg-orange-700 p-1.5 rounded-full"><MessageSquare className={commonClasses} /></div>;
        case 'grok': return <div className="bg-gray-700 p-1.5 rounded-full"><Box className={commonClasses} /></div>;
        case 'gemini': return <div className="bg-linear-to-tr from-blue-400 to-purple-400 p-1.5 rounded-full"><Sparkles className={commonClasses} /></div>;
        case 'gpt': return <div className="bg-emerald-600 p-1.5 rounded-full"><Activity className={commonClasses} /></div>;
        default: return <Bot className={commonClasses} />;
    }
};

export default function PerformanceChart() {
    const [activeMetric, setActiveMetric] = useState<MetricType>('returns');
    const [hoveredModel, setHoveredModel] = useState<string | null>(null);

    // Configuration based on active metric
    const config = {
        returns: {
            label: 'Returns',
            unit: '%',
            yAxisSteps: [80, 40, 0, -40, -80],
            formatter: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`,
            dataKey: 'returns' as keyof ModelData,
            title: 'Total Return (%)',
            allowNegative: true,
            scaleMax: 80,
        },
        equity: {
            label: 'Equity',
            unit: 'K$',
            yAxisSteps: [16, 12, 8, 4, 0],
            formatter: (val: number) => `$${val.toLocaleString()}`,
            dataKey: 'equity' as keyof ModelData,
            title: 'Total equity (K$)',
            allowNegative: false,
            scaleMax: 16,
        },
        win_rate: {
            label: 'Win rate',
            unit: '%',
            // FIXED: Standardized the linear scale to map height calculations correctly
            yAxisSteps: [40, 30, 20, 10, 0],
            formatter: (val: number) => `${val.toFixed(2)}%`,
            dataKey: 'winRate' as keyof ModelData,
            title: 'Win rate (%)',
            allowNegative: false,
            scaleMax: 40,
        },
    };

    const currentConfig = config[activeMetric];

    // --- Helper to calculate bar height and position ---
    const getBarStyle = (value: number) => {
        const max = currentConfig.scaleMax;

        if (activeMetric === 'returns') {
            const percentage = (Math.abs(value) / 80) * 50;
            if (value >= 0) {
                return { height: `${percentage}%`, bottom: '50%', top: 'auto' };
            } else {
                return { height: `${percentage}%`, top: '50%', bottom: 'auto' };
            }
        }

        const percentage = (value / max) * 100;

        return {
            height: `${Math.min(percentage, 100)}%`,
            bottom: '0%',
            top: 'auto'
        };
    };

    return (
        <div className="flex items-center justify-center font-sans">
            <div className="w-full bg-[#121212] rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col lg:flex-row gap-12 lg:gap-20">

                {/* Left Column: Info & Settings */}
                <div className="w-full lg:w-1/3 flex flex-col">
                    <h1 className="text-[22px] font-medium text-white mb-6">Performance</h1>

                    <p className="text-[14px] text-zinc-400 mb-10 leading-relaxed pr-4">
                        This chart shows how different AI models responded to real historical crypto market conditions — not a forecast of future results.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center text-[13px]">
                            <Clock className="w-4 h-4 text-zinc-300 mr-3" strokeWidth={2} />
                            <span className="font-medium text-zinc-100 mr-2">Performance period:</span>
                            <span className="text-zinc-500">30 days trailing</span>
                        </div>
                        <div className="flex items-center text-[13px]">
                            <Coins className="w-4 h-4 text-zinc-300 mr-3" strokeWidth={2} />
                            <span className="font-medium text-zinc-100 mr-2">Base asset:</span>
                            <span className="text-zinc-500">USDT</span>
                        </div>
                        <div className="flex items-center text-[13px]">
                            <RefreshCw className="w-4 h-4 text-zinc-300 mr-3" strokeWidth={2} />
                            <span className="font-medium text-zinc-100 mr-2">Rebalance frequency:</span>
                            <span className="text-zinc-500">Daily</span>
                        </div>
                        <div className="flex items-center text-[13px]">
                            <Banknote className="w-4 h-4 text-zinc-300 mr-3" strokeWidth={2} />
                            <span className="font-medium text-zinc-100 mr-2">Trading fees:</span>
                            <span className="text-zinc-500">Included</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart & Tabs */}
                <div className="w-full lg:w-2/3 flex flex-col">

                    {/* Header Row for Chart (Title + Tabs) */}
                    <div className="flex justify-between items-end mb-8 relative z-20">
                        <div className="text-[13px] font-medium text-zinc-200">
                            {currentConfig.title}
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center space-x-1 bg-transparent">
                            {(['returns', 'equity', 'win_rate'] as MetricType[]).map((key) => (
                                <button
                                    key={key}
                                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${activeMetric === key
                                        ? 'bg-zinc-200 text-black shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
                                    `}
                                    onClick={() => setActiveMetric(key)}
                                >
                                    {config[key].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="relative w-full h-80 mt-4">

                        {/* Y-Axis Grid Lines & Labels */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {currentConfig.yAxisSteps.map((step, index) => (
                                <div key={index} className="relative w-full flex items-center group">
                                    <span className="absolute -left-8 text-[11px] text-zinc-500 font-mono w-6 text-right">
                                        {step === 0 && activeMetric === 'returns' ? '' : step}
                                    </span>

                                    {/* FIXED: We now render the 0 baseline explicitly for all tabs to anchor the bars visually */}
                                    <div
                                        className={`w-full h-px ${
                                            step === 0
                                                ? 'bg-zinc-600 border-t border-dashed border-zinc-600 opacity-50'
                                                : 'bg-zinc-800/0'
                                        }`}
                                    />

                                    <div className="absolute -left-2 w-1.5 h-px bg-zinc-700" />
                                </div>
                            ))}
                        </div>

                        {/* Bars Container */}
                        <div className="absolute inset-0 flex justify-around items-end ml-4 z-10">
                            {models.map((model) => {
                                const value = model[currentConfig.dataKey] as number;
                                const style = getBarStyle(value);
                                const isNegative = value < 0;
                                const barColor = isNegative ? 'bg-[#ef4444]' : model.color;
                                const isHovered = hoveredModel === model.id;

                                let roundingClass = 'rounded-t-lg rounded-b-none';

                                if (activeMetric === 'returns' && isNegative) {
                                    roundingClass = 'rounded-b-lg rounded-t-none';
                                }

                                return (
                                    <div
                                        key={model.id}
                                        className="flex flex-col items-center justify-end h-full w-full group relative"
                                        onMouseEnter={() => setHoveredModel(model.id)}
                                        onMouseLeave={() => setHoveredModel(null)}
                                    >
                                        {/* Tooltip Popup */}
                                        <div
                                            className={`
                                               absolute z-50 bg-[#121212] border border-white/10 p-3 rounded-xl shadow-xl w-40
                                               transition-all duration-200 pointer-events-none
                                               ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                                            `}
                                            style={{
                                                bottom: activeMetric === 'returns' && isNegative ? 'auto' : `calc(${style.bottom === '50%' ? '50%' : '0%'} + ${parseFloat(style.height)}% + 15px)`,
                                                top: activeMetric === 'returns' && isNegative ? `calc(50% + ${parseFloat(style.height)}% + 15px)` : 'auto'
                                            }}
                                        >
                                            <div className="font-semibold text-white text-[13px] mb-1">{model.name}</div>
                                            <div className="text-[11px] text-zinc-400">
                                                {currentConfig.title.split('(')[0]}: <span className={value > 0 ? "text-white font-medium" : "text-white font-medium"}>{currentConfig.formatter(value)}</span>
                                            </div>
                                        </div>

                                        {/* The Bar */}
                                        <div className="relative w-10 md:w-14 h-full mx-1 flex flex-col justify-end">
                                            <div
                                                className={`
                                                    w-full transition-all duration-500 ease-out overflow-hidden cursor-pointer
                                                    ${barColor}
                                                    ${roundingClass}
                                                    ${activeMetric === 'returns' ? 'absolute left-0 right-0' : 'relative'}
                                                `}
                                                style={style}
                                            >
                                                {isHovered && activeMetric === 'returns' && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                                                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-10 border-l-white border-b-[6px] border-b-transparent ml-1" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* FIXED: Changed from absolute -bottom-16 to absolute top-full pt-4 to strictly enforce the gap below the bars */}
                                        <div className="absolute top-full pt-4 flex flex-col items-center space-y-2.5 z-20">
                                            <ModelIcon id={model.id} />
                                            <div className="text-center">
                                                <div className="text-[11px] font-medium text-zinc-300">{model.name}</div>
                                                <div className="text-[10px] text-zinc-500">{model.version}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Adjusted margin to safely contain the relocated labels */}
                    <div className="w-full h-px bg-zinc-800/60 mt-25" />
                </div>

            </div>
        </div>
    );
}
