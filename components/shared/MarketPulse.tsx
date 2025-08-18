import React, {useEffect, useState} from "react";

export default function MarketPulse({className}: {className?: string}) {

    const [indicators, setIndicators] = useState({
        rsi: 65.4,
        macd: 0.234,
        stochastic: 72.8,
        bollinger: 'Upper',
        volume: 847532,
        momentum: 'Bullish'
    });

    // const [signals, setSignals] = useState({
    //     overall: 'Buy',
    //     strength: 0.67, // -1 to 1 scale
    //     confidence: 85
    // });

    // Simulate real-time technical data updates
    useEffect(() => {
        const interval = setInterval(() => {
            setIndicators(prev => ({
                rsi: Math.max(0, Math.min(100, prev.rsi + (Math.random() - 0.5) * 5)),
                macd: prev.macd + (Math.random() - 0.5) * 0.1,
                stochastic: Math.max(0, Math.min(100, prev.stochastic + (Math.random() - 0.5) * 8)),
                bollinger: Math.random() > 0.5 ? 'Upper' : Math.random() > 0.33 ? 'Middle' : 'Lower',
                volume: Math.floor(prev.volume + (Math.random() - 0.5) * 50000),
                momentum: Math.random() > 0.6 ? 'Bullish' : Math.random() > 0.3 ? 'Neutral' : 'Bearish'
            }));

            // Update overall signal based on indicators
            // const rsiSignal = indicators.rsi > 70 ? -0.3 : indicators.rsi < 30 ? 0.3 : 0;
            // const macdSignal = indicators.macd > 0 ? 0.2 : -0.2;
            // const stochSignal = indicators.stochastic > 80 ? -0.2 : indicators.stochastic < 20 ? 0.2 : 0;

            // const newStrength = Math.max(-1, Math.min(1, (rsiSignal + macdSignal + stochSignal) + (Math.random() - 0.5) * 0.3));

            // setSignals({
            //     overall: newStrength > 0.2 ? 'Strong Buy' : newStrength > 0.05 ? 'Buy' : newStrength < -0.2 ? 'Strong Sell' : newStrength < -0.05 ? 'Sell' : 'Neutral',
            //     strength: newStrength,
            //     confidence: Math.floor(Math.abs(newStrength) * 100)
            // });
        }, 3000);

        return () => clearInterval(interval);
    }, [indicators.rsi, indicators.macd, indicators.stochastic]);

    const getRSIColor = (rsi: number) => {
        if (rsi > 70) return 'text-red-400';
        if (rsi < 30) return 'text-green-400';

        return 'text-yellow-400';
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">RSI (14)</span>
                        <div className={`w-2 h-2 rounded-full ${indicators.rsi > 70 ? 'bg-red-400' : indicators.rsi < 30 ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
                    </div>
                    <div className={`text-lg font-bold ${getRSIColor(indicators.rsi)} transition-colors duration-300`}>
                        {indicators.rsi.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                        {indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Normal'}
                    </div>
                </div>

                <div className="bg-stone-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">MACD</span>
                    </div>
                    <div className={`text-lg font-bold ${indicators.macd > 0 ? 'text-green-400' : 'text-red-400'} transition-colors duration-300`}>
                        {indicators.macd.toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-500">
                        {indicators.macd > 0 ? 'Bullish' : 'Bearish'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Stochastic</span>
                    </div>
                    <div className={`text-lg font-bold ${indicators.stochastic > 80 ? 'text-red-400' : indicators.stochastic < 20 ? 'text-green-400' : 'text-white'} transition-colors duration-300`}>
                        {indicators.stochastic.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                        {indicators.stochastic > 80 ? 'Overbought' : indicators.stochastic < 20 ? 'Oversold' : 'Neutral'}
                    </div>
                </div>

                <div className="bg-stone-900/30 rounded-lg p-3">
                    <span className="text-xs text-gray-400 block mb-1">Bollinger</span>
                    <div className={`text-lg font-bold transition-colors duration-300 ${
                        indicators.bollinger === 'Upper' ? 'text-red-400' :
                            indicators.bollinger === 'Lower' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                        {indicators.bollinger}
                    </div>
                    <div className="text-xs text-gray-500">Band Position</div>
                </div>
            </div>

            <div className="bg-stone-900/30 rounded-lg p-3 pb-0">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Volume Analysis</span>
                    <span className={`text-xs font-medium ${indicators.momentum === 'Bullish' ? 'text-green-400' : indicators.momentum === 'Bearish' ? 'text-red-400' : 'text-gray-400'}`}>
                      {indicators.momentum}
                    </span>
                </div>
                <div className="text-lg font-bold text-white">
                    {(indicators.volume / 1000).toFixed(0)}K
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                                indicators.momentum === 'Bullish' ? 'bg-green-400' :
                                    indicators.momentum === 'Bearish' ? 'bg-red-400' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min(100, (indicators.volume / 1000000) * 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-500">vs Avg</span>
                </div>
            </div>
        </div>
    )
}
