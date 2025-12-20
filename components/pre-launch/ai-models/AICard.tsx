import React from 'react';
import { Fish } from 'lucide-react';

import {PortfolioData, Token} from "@/types/preLaunch/AIModel";

// --- Components ---

const TokenIcon = ({ token, index }: { token: Token; index: number }) => {
    return (
        <div
            className={`relative flex items-center justify-center w-6 h-6 rounded-full border border-[#111] text-[10px] font-bold text-white shadow-sm`}
            style={{
                backgroundColor: token.color,
                marginLeft: index > 0 ? '-8px' : '0', // Overlap effect
                zIndex: 10 - index
            }}
        >
            {/* Simple placeholder logic for icons vs text */}
            {token.label ? token.label : token.symbol[0]}
        </div>
    );
};

const StatRow = ({ label, value, isGreen = false }: { label: string; value: string; isGreen?: boolean }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
        <span className={`text-sm font-semibold ${isGreen ? 'text-emerald-400' : 'text-white'}`}>
      {value}
    </span>
    </div>
);

const ProgressBar = ({ value }: { value: number }) => (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
        <div
            className="h-full bg-emerald-400 rounded-full"
            style={{ width: `${value}%` }}
        />
    </div>
);

const AICard = ({ data }: { data: PortfolioData }) => {
    return (
        <div className="w-full bg-[#121212] rounded-2xl p-6 shadow-2xl font-sans">

            {/* Header Section */}
            <div className="flex items-start gap-4 mb-6">
                <div className="relative">
                    {/* Logo Container */}
                    <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-900/20">
                        <Fish className="text-white w-8 h-8 fill-white/20" strokeWidth={1.5} />
                    </div>
                    {/* Rank Badge */}
                    <div className="absolute -bottom-1 -right-1 bg-[#D4F933] text-black text-xs font-bold px-1.5 py-0.5 rounded-md border-2 border-[#0a0a0a]">
                        #{data.rank}
                    </div>
                </div>

                <div className="flex flex-col pt-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">{data.name}</h2>
                    <span className="text-zinc-500 text-sm font-medium">{data.version}</span>
                </div>
            </div>

            {/* Main Stats */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <p className="text-zinc-400 text-sm font-medium mb-1">Portfolio value</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">
                        ${data.portfolioValue.toLocaleString()}
                    </h3>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-zinc-400 text-sm font-medium mb-1">Total return</p>
                    <span className="text-emerald-400 text-xl font-bold">
                        +{data.totalReturnPercent}%
                    </span>
                </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="space-y-2 mb-6">
                <StatRow label="Equity" value={`$${data.equity.toLocaleString()}`} />
                <StatRow label="Sharpe" value={data.sharpeRatio.toString()} />
                <StatRow label="Trades" value={data.totalTrades.toString()} />
            </div>

            {/* Win Rate */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-zinc-400 text-sm font-medium">Win rate</span>
                    <span className="text-emerald-400 text-sm font-bold">{data.winRate}%</span>
                </div>
                <ProgressBar value={data.winRate} />
            </div>

            {/* Token Section */}
            <div className="flex justify-between items-center mb-8">
                <span className="text-zinc-400 text-sm font-medium">Token</span>
                <div className="flex items-center">
                    {data.tokens.map((token, idx) => (
                        <TokenIcon key={idx} index={idx} token={token} />
                    ))}
                </div>
            </div>

            {/* Action Button */}
            <button className="w-full bg-[#F2F3F71A] hover:bg-zinc-700 active:scale-[0.98] transition-all text-white font-medium py-3 rounded-3xl text-sm">
                View details
            </button>

        </div>
    );
};

export default AICard;
