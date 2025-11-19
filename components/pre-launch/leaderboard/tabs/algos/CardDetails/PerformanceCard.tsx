import {ChevronDown} from "lucide-react";
import React from "react";

import CardWrapper from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/CardWrapper";
import StatRow from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/StatRow";
import {PerformanceData} from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/QuantumLeadDetails";


const PerformanceCard = ({ data }: { data: PerformanceData }) => {
    // Calculate progress bar width
    const totalTrades = data.winningTrades + data.losingTrades;
    const winPercentage = totalTrades > 0 ? (data.winningTrades / totalTrades) * 100 : 0;

    return (
        <CardWrapper>
            {/* Header & Filter */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">Performance</h2>
                <button className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                    7 days
                    <ChevronDown size={14} />
                </button>
            </div>

            {/* ROI & PnL Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 border-b border-zinc-800 pb-6">
                <div className="flex flex-col">
                    <span className="text-zinc-400 text-sm mb-1">ROI</span>
                    <span className="text-emerald-400 text-xl font-bold">{data.roi}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-zinc-400 text-sm mb-1">PnL</span>
                    <span className="text-emerald-400 text-xl font-bold">{data.pnl}</span>
                </div>
            </div>

            {/* Stats List */}
            <div className="space-y-1 mb-6">
                <StatRow label="Max drawdown" value={data.maxDrawdown} />
                <StatRow label="Sharpe ratio" value={data.sharpeRatio} />
                <StatRow label="Win rate" value={data.winRate} />
            </div>

            {/* Progress Bar Section */}
            <div className="space-y-2">
                {/* Bar */}
                <div className="h-2 w-full bg-zinc-700 rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${winPercentage}%` }}
                    />
                </div>

                {/* Labels */}
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-400">
                        Winning trades <span className="text-emerald-400 ml-1">{data.winningTrades}</span>
                    </span>
                    <span className="text-zinc-400">
                        Losing trades <span className="text-white ml-1">{data.losingTrades}</span>
                    </span>
                </div>
            </div>
        </CardWrapper>
    );
};

export default PerformanceCard;
