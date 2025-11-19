import React from 'react';
import Image from "next/image";

interface TradingStrategyProps {
    description?: string;
    updatedAt?: string;
}

const TradingStrategy = ({
                             description = "This trader employs a momentum-based approach, capitalizing on strong price trends with quick entry and exit points. They focus on high-volatility altcoins and maintain strict risk management with 2-3% position sizing. The strategy combines technical analysis with market sentiment, targeting 15-20% gains per trade while maintaining a disciplined stop-loss system.",
                             updatedAt = "Data is updated every 10 minutes."
                         }: TradingStrategyProps) => {
    return (
        <div className="bg-black text-white flex flex-col items-center justify-center">
            <div className="w-full max-w-md">

                {/* Card Container */}
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6">

                    {/* Header */}
                    <h2 className="text-lg font-bold text-white mb-4">Trading strategy</h2>

                    {/* Description Text */}
                    <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                        {description}
                    </p>

                    {/* Divider */}
                    <div className="h-px bg-zinc-800 w-full mb-5" />

                    {/* Tokens Section */}
                    <div className="mb-5">
                        <h3 className="text-zinc-400 text-sm font-medium mb-3">Trading Tokens</h3>
                        <div className="flex gap-1">
                            <div className="relative w-6 rounded-full aspect-square">
                                <Image fill alt="coin" className="object-cover" src="/images/pre-launch/demo/btc.svg" />
                            </div>
                            <div className="relative w-6 rounded-full aspect-square">
                                <Image fill alt="coin" className="object-cover" src="/images/pre-launch/demo/dgb.svg" />
                            </div>
                            <div className="relative w-6 rounded-full aspect-square">
                                <Image fill alt="coin" className="object-cover" src="/images/pre-launch/demo/usdt.svg" />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-zinc-500 text-xs">
                        {updatedAt}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TradingStrategy;
