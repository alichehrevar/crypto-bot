import React, { useState } from 'react';
import { Play, Activity, Bot, Sparkles, Zap, MessageSquare, Box } from 'lucide-react';

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
        color: 'bg-indigo-500',
        returns: 46.31,
        equity: 14.631,
        winRate: 30.31,
    },
    {
        id: 'qwen',
        name: 'Qwen',
        version: '3 Max',
        color: 'bg-violet-600',
        returns: 68.20, // inferred positive
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
    const commonClasses = "w-5 h-5 text-white";

    switch (id) {
        case 'deepseek': return <div className="bg-blue-600 p-1 rounded-full"><Bot className={commonClasses} /></div>;
        case 'qwen': return <div className="bg-violet-600 p-1 rounded-full"><Zap className={commonClasses} /></div>;
        case 'claude': return <div className="bg-orange-700 p-1 rounded-full"><MessageSquare className={commonClasses} /></div>;
        case 'grok': return <div className="bg-gray-700 p-1 rounded-full"><Box className={commonClasses} /></div>;
        case 'gemini': return <div className="bg-blue-400 p-1 rounded-full"><Sparkles className={commonClasses} /></div>;
        case 'gpt': return <div className="bg-emerald-600 p-1 rounded-full"><Activity className={commonClasses} /></div>;
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
            yAxisSteps: [40, 25, 15, 5, 0],
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
        // Normalization logic
        const max = currentConfig.scaleMax;

        if (activeMetric === 'returns') {
            const percentage = (Math.abs(value) / 80) * 50;

            if (value >= 0) {
                // Positive: Start from middle (50%), grow up
                return {
                    height: `${percentage}%`,
                    bottom: '50%',
                    top: 'auto' // Explicitly unset top
                };
            } else {
                // Negative: Start from middle (50%), grow down
                return {
                    height: `${percentage}%`,
                    top: '50%',
                    bottom: 'auto' // Explicitly unset bottom
                };
            }
        }

        // For Equity and Win Rate (Standard bottom-up)
        const percentage = (value / max) * 100;

        return {
            height: `${Math.min(percentage, 100)}%`,
            bottom: '0%',
            top: 'auto'
        };
    };

    return (
        <div className="text-gray-300 flex items-center justify-center font-sans">
            <div className="w-full bg-[#121212] rounded-2xl p-8 shadow-2xl relative overflow-hidden">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
                    <h1 className="text-2xl font-medium text-white mb-6 md:mb-0">Performance</h1>

                    {/* Tabs */}
                    <div className="flex items-center space-x-1">
                        {(['returns', 'equity', 'win_rate'] as MetricType[]).map((key) => (
                            <button
                                key={key}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeMetric === key
                                    ? 'bg-[#F2F3F733] text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
                                `}
                                onClick={() => setActiveMetric(key)}
                            >
                                {config[key].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart Label */}
                <div className="text-xs font-medium text-zinc-400 mb-8">
                    {currentConfig.title}
                </div>

                {/* Chart Area */}
                <div className="relative w-full h-[400px]">

                    {/* Y-Axis Grid Lines & Labels */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {currentConfig.yAxisSteps.map((step, index) => (
                            <div key={step} className="relative w-full flex items-center group">
                                {/* Y-Axis Label */}
                                <span className="absolute -left-10 text-xs text-zinc-500 font-mono w-8 text-right">
                                    {step === 0 && activeMetric === 'returns' ? '' : step}
                                </span>

                                {/* Dashed Line (Only for 0 in Returns, or all base lines) */}
                                <div
                                    className={`w-full h-px ${
                                        activeMetric === 'returns' && step === 0
                                            ? 'bg-zinc-600 border-t border-dashed border-zinc-500 opacity-50'
                                            : 'bg-zinc-800/0' // Hidden grid lines to match clean screenshot look, except baseline
                                    }`}
                                />

                                {/* Little tick mark for labels */}
                                <div className="absolute left-0 w-2 h-px bg-zinc-800" />
                            </div>
                        ))}
                    </div>

                    {/* Zero Line for Returns (Center) - Visual Aid */}
                    {activeMetric === 'returns' && (
                        <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-zinc-700/50" />
                    )}

                    {/* Bars Container */}
                    <div className="absolute inset-0 flex justify-around items-end px-4 z-10">
                        {models.map((model) => {
                            const value = model[currentConfig.dataKey] as number;
                            const style = getBarStyle(value);
                            const isNegative = value < 0;
                            const barColor = isNegative ? 'bg-[#ef4444]' : model.color; // Red if negative, else model color
                            const isHovered = hoveredModel === model.id;

                            // Dynamic Rounding:
                            // Positive bars round the TOP.
                            // Negative bars round the BOTTOM.
                            // Standard bars (Equity/WinRate) always round TOP.
                            let roundingClass = 'rounded-t-md rounded-b-none';

                            if (activeMetric === 'returns' && isNegative) {
                                roundingClass = 'rounded-b-md rounded-t-none';
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
                                           absolute z-50 bg-zinc-900 border border-white/10 p-3 rounded-lg shadow-xl w-48
                                           transition-all duration-200 pointer-events-none mb-4
                                           ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                                        `}
                                        style={{
                                            // Smart positioning for negative vs positive bars
                                            bottom: activeMetric === 'returns' && isNegative ? 'auto' : `calc(${style.bottom === '50%' ? '50%' : '0%'} + ${parseFloat(style.height)}% + 15px)`,
                                            top: activeMetric === 'returns' && isNegative ? `calc(50% + ${parseFloat(style.height)}% + 15px)` : 'auto'
                                        }}
                                    >
                                        <div className="font-semibold text-white mb-1">{model.name}</div>
                                        <div className="text-xs text-zinc-400 font-mono">
                                            {currentConfig.title.split('(')[0]}: <span className={value > 0 ? "text-green-400" : "text-red-400"}>{currentConfig.formatter(value)}</span>
                                        </div>
                                    </div>

                                    {/* The Bar Track */}
                                    <div className="relative w-12 md:w-16 h-full mx-2 flex flex-col justify-end">

                                        {/* The Actual Bar */}
                                        <div
                                            className={`
                                                w-full transition-all duration-500 ease-out overflow-hidden group-hover:brightness-110 group-hover:cursor-context-menu
                                                ${barColor}
                                                ${roundingClass}
                                                ${activeMetric === 'returns' ? 'absolute left-0 right-0' : 'relative'}
                                            `}
                                            style={style}
                                        >
                                            {/* Gradient sheen effect */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* X-Axis Label (Logo + Name) - Positioned below the chart area */}
                                    <div className="absolute -bottom-20 flex flex-col items-center space-y-2 opacity-80 group-hover:opacity-100 transition-opacity z-20">
                                        <ModelIcon id={model.id} />
                                        <div className="text-center">
                                            <div className="text-xs font-medium text-zinc-300">{model.name}</div>
                                            <div className="text-[10px] text-zinc-500 font-mono">{model.version}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend/Footer Area (Spacer for labels) */}
                <div className="h-16 w-full border-t border-white/5" />

            </div>
        </div>
    );
}
