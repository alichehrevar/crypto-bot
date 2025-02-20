'use client';

import React, { useState } from 'react';

export default function DefaultMethodPage() {
    const [baseFund, setBaseFund] = useState<number>(1000);
    const [tradeFund, setTradeFund] = useState<number>(10);
    const [leverage, setLeverage] = useState<number>(1);
    const [riskStrategy, setRiskStrategy] = useState<string>('KellyCriterionStrategy');
    const [maxSuccessiveLoss, setMaxSuccessiveLoss] = useState<number>(3);
    const [useCompound, setUseCompound] = useState<boolean>(true);
    const [takeProfit, setTakeProfit] = useState<number>(2); // e.g., 2% TP
    const [stopLoss, setStopLoss] = useState<number>(2);       // e.g., 2% SL
    const [indicator, setIndicator] = useState<string>('RSI');
    const [timeframe, setTimeframe] = useState<string>('1h');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Construct the bot configuration object.
        const botConfig = {
            baseFund, // in dollars
            tradeFund, // percentage (e.g., 10 means 10% of base fund allocated to trading)
            leverage,
            riskStrategy, // e.g., 'KellyCriterionStrategy'
            maxSuccessiveLoss,
            positionSizingMethod: useCompound ? 'compound' : 'simple',
            takeProfit, // take profit percentage (or factor)
            stopLoss,   // stop loss percentage (or factor)
            indicator,  // e.g., 'RSI'
            timeframe   // e.g., '1h'
        };
        console.log('Bot configuration:', botConfig);
        // Here you can POST this data to your backend API endpoint.
        // Example:
        // const res = await fetch('/api/bots', { method: 'POST', body: JSON.stringify(botConfig) });
        // Handle response accordingly.
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded max-w-md mx-auto">
            <div>
                <label htmlFor="baseFund" className="block font-medium">Base Fund ($):</label>
                <input
                    id="baseFund"
                    type="number"
                    value={baseFund}
                    onChange={(e) => setBaseFund(Number(e.target.value))}
                    className="mt-1 block w-full border rounded p-2"
                />
            </div>

            <div>
                <label htmlFor="tradeFund" className="block font-medium">Trade Fund (%):</label>
                <input
                    id="tradeFund"
                    type="number"
                    value={tradeFund}
                    onChange={(e) => setTradeFund(Number(e.target.value))}
                    className="mt-1 block w-full border rounded p-2"
                />
            </div>

            <div>
                <label htmlFor="leverage" className="block font-medium">Leverage (1x to 100x):</label>
                <input
                    id="leverage"
                    type="number"
                    min="1"
                    max="100"
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="mt-1 block w-full border rounded p-2"
                />
            </div>

            <div>
                <label htmlFor="riskStrategy" className="block font-medium">Risk Strategy:</label>
                <select
                    id="riskStrategy"
                    value={riskStrategy}
                    onChange={(e) => setRiskStrategy(e.target.value)}
                    className="mt-1 block w-full border rounded p-2"
                >
                    <option value="KellyCriterionStrategy">KellyCriterionStrategy</option>
                    <option value="MartingaleStrategy">MartingaleStrategy</option>
                    <option value="MirroredMartingaleStrategy">MirroredMartingaleStrategy</option>
                    <option value="SimpleStrategy">SimpleStrategy</option>
                </select>
            </div>

            <div>
                <label htmlFor="maxSuccessiveLoss" className="block font-medium">Maximum Successive Loss:</label>
                <input
                    id="maxSuccessiveLoss"
                    type="number"
                    value={maxSuccessiveLoss}
                    onChange={(e) => setMaxSuccessiveLoss(Number(e.target.value))}
                    className="mt-1 block w-full border rounded p-2"
                />
            </div>

            <div>
                <label htmlFor="positionSizingMethod" className="block font-medium">
                    Use Compound Position Sizing by Default:
                </label>
                <input
                    id="positionSizingMethod"
                    type="checkbox"
                    checked={useCompound}
                    onChange={(e) => setUseCompound(e.target.checked)}
                    className="mt-1"
                />
            </div>

            <div>
                <label htmlFor="takeProfit" className="block font-medium">Take Profit (%):</label>
                <input
                    id="takeProfit"
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(Number(e.target.value))}
                    className="mt-1 block w-full border rounded p-2"
                />
            </div>

            <div>
                <label htmlFor="stopLoss" className="block font-medium">Stop Loss (%):</label>
                <input
                    id="stopLoss"
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(Number(e.target.value))}
                    className="mt-1 block w-full border rounded p-2"
                />
            </div>

            <div>
                <label htmlFor="indicator" className="block font-medium">Indicator:</label>
                <select
                    id="indicator"
                    value={indicator}
                    onChange={(e) => setIndicator(e.target.value)}
                    className="mt-1 block w-full border rounded p-2"
                >
                    <option value="RSI">RSI</option>
                    <option value="MACD">MACD</option>
                    <option value="MACrossover">MA_Crossover</option>
                </select>
            </div>

            <div>
                <label htmlFor="timeframe" className="block font-medium">Timeframe:</label>
                <select
                    id="timeframe"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="mt-1 block w-full border rounded p-2"
                >
                    <option value="1m">1 Minute</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="1d">1 Day</option>
                    <option value="1w">1 Week</option>
                </select>
            </div>

            <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
                Start a Bot
            </button>
        </form>
    );
}
