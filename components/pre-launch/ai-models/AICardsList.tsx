import React from "react";

import AICard from "@/components/pre-launch/ai-models/AICard";
import {PortfolioData} from "@/types/preLaunch/AIModel";

const DATA: PortfolioData = {
    name: "DeepSeek",
    version: "v5",
    rank: 1,
    portfolioValue: 15631,
    totalReturnPercent: 46.31,
    equity: 15631,
    sharpeRatio: 2.15,
    totalTrades: 5678,
    winRate: 46.31,
    tokens: [
        { symbol: 'BTC', color: '#F7931A' },
        { symbol: 'ETH', color: '#627EEA' },
        { symbol: 'USDT', color: '#26A17B' },
        { symbol: '+3', color: '#374151', label: '+3' },
    ]
};

export default function AICardsList () {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[...Array(6)].map((_, idx) => (
                <AICard key={idx} data={DATA} />
            ))}
        </div>
    )
}
