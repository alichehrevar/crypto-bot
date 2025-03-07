// components/BotConfigForm.tsx
'use client';

import React, { useEffect, useState } from 'react';

// Define a union type for strategy parameters.
// For RSI: period, overbought, oversold.
// For MACD: shortPeriod, longPeriod, signalPeriod.
// For MA_Crossover: shortPeriod, longPeriod.
interface RSIStrategyParams {
    period: number;
    overbought: number;
    oversold: number;
}

interface MACDStrategyParams {
    shortPeriod: number;
    longPeriod: number;
    signalPeriod: number;
}

interface MACrossoverStrategyParams {
    shortPeriod: number;
    longPeriod: number;
}

type StrategyParams = RSIStrategyParams | MACDStrategyParams | MACrossoverStrategyParams;

export interface BotConfig {
    name: string;
    symbol: string;
    timeframe: string;
    indicator: string;
    riskStrategy: string;
    strategy: string;
    baseFund: number;
    tradeFund: number;
    leverage: number;
    riskParams: {
        positionSizingMethod: string;
        riskFraction: number;
        stopLossDistance: number;
        maxOpenTrades: number;
    };
    strategyParams: StrategyParams;
}

interface BotConfigFormProps {
    onDeploy: (config: BotConfig) => void;
}

export default function BotConfigForm({ onDeploy }: BotConfigFormProps) {
    const [config, setConfig] = useState<BotConfig>({
        name: '',
        symbol: '',
        timeframe: '1h',
        indicator: 'RSI', // Default indicator.
        riskStrategy: 'KellyCriterionStrategy', // Default risk strategy.
        strategy: 'RSI', // Default strategy.
        baseFund: 0,
        tradeFund: 0,
        leverage: 1,
        riskParams: {
            positionSizingMethod: 'compound',
            riskFraction: 0.02,
            stopLossDistance: 0.02,
            maxOpenTrades: 1,
        },
        // Default strategyParams for RSI.
        strategyParams: { period: 14, overbought: 70, oversold: 30 },
    });

    /**
     * useEffect: When the indicator changes, update strategyParams and the strategy field.
     */
    useEffect(() => {
        let newStrategyParams: StrategyParams;
        if (config.indicator === 'MACD') {
            newStrategyParams = { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 };
        } else if (config.indicator === 'MA_Crossover') {
            newStrategyParams = { shortPeriod: 5, longPeriod: 20 };
        } else {
            newStrategyParams = { period: 14, overbought: 70, oversold: 30 };
        }
        setConfig((prev) => ({
            ...prev,
            strategyParams: newStrategyParams,
            strategy: config.indicator, // Set strategy equal to the chosen indicator.
        }));
    }, [config.indicator]);

    /**
     * handleChange updates the form state. Numeric inputs are converted to numbers.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'number' ? Number(value) : value;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setConfig((prev) => ({
                ...prev,
                [parent]: {
                    ...(prev[parent] as Record<string, any> || {}),
                    [child]: newValue,
                },
            }));
        } else {
            setConfig((prev) => ({ ...prev, [name]: newValue }));
        }
    };

    /**
     * handleSubmit parses numeric values explicitly and calls onDeploy.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Parse top-level numeric fields and nested fields.
        const parsedConfig: BotConfig = {
            ...config,
            baseFund: Number(config.baseFund),
            tradeFund: Number(config.tradeFund),
            leverage: Number(config.leverage),
            riskParams: {
                ...config.riskParams,
                riskFraction: Number(config.riskParams.riskFraction),
                stopLossDistance: Number(config.riskParams.stopLossDistance),
                maxOpenTrades: Number(config.riskParams.maxOpenTrades),
            },
            strategyParams: (() => {
                if (config.indicator === 'MACD') {
                    return {
                        shortPeriod: Number((config.strategyParams as MACDStrategyParams).shortPeriod),
                        longPeriod: Number((config.strategyParams as MACDStrategyParams).longPeriod),
                        signalPeriod: Number((config.strategyParams as MACDStrategyParams).signalPeriod),
                    };
                } else if (config.indicator === 'MA_Crossover') {
                    return {
                        shortPeriod: Number((config.strategyParams as MACrossoverStrategyParams).shortPeriod),
                        longPeriod: Number((config.strategyParams as MACrossoverStrategyParams).longPeriod),
                    };
                } else {
                    return {
                        period: Number((config.strategyParams as RSIStrategyParams).period),
                        overbought: Number((config.strategyParams as RSIStrategyParams).overbought),
                        oversold: Number((config.strategyParams as RSIStrategyParams).oversold),
                    };
                }
            })(),
        };

        onDeploy(parsedConfig);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label>Name:</label>
                <input
                    type="text"
                    name="name"
                    value={config.name}
                    onChange={handleChange}
                    className="border p-1"
                />
            </div>
            <div>
                <label>Symbol:</label>
                <input
                    type="text"
                    name="symbol"
                    value={config.symbol}
                    onChange={handleChange}
                    className="border p-1"
                />
            </div>
            <div>
                <label>Timeframe:</label>
                <select name="timeframe" value={config.timeframe} onChange={handleChange} className="border p-1">
                    <option value="1m">1 Minute</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="1d">1 Day</option>
                    <option value="1w">1 Week</option>
                </select>
            </div>
            <div>
                <label>Indicator:</label>
                <select name="indicator" value={config.indicator} onChange={handleChange} className="border p-1">
                    <option value="RSI">RSI</option>
                    <option value="MACD">MACD</option>
                    <option value="MA_Crossover">MA_Crossover</option>
                </select>
            </div>
            <div>
                <label>Risk Strategy:</label>
                <select name="riskStrategy" value={config.riskStrategy} onChange={handleChange} className="border p-1">
                    <option value="KellyCriterionStrategy">Kelly Criterion Strategy</option>
                    <option value="MartingaleStrategy">Martingale Strategy</option>
                    <option value="MirroredMartingaleStrategy">Mirrored Martingale Strategy</option>
                    <option value="SimpleStrategy">Simple Strategy</option>
                </select>
            </div>
            <div>
                <label>Strategy:</label>
                <select name="strategy" value={config.strategy} onChange={handleChange} className="border p-1">
                    <option value="RSI">RSI</option>
                    <option value="MACD">MACD</option>
                    <option value="MA_Crossover">MA_Crossover</option>
                </select>
            </div>
            <div>
                <label>Base Fund ($):</label>
                <input
                    type="number"
                    name="baseFund"
                    value={config.baseFund}
                    onChange={handleChange}
                    className="border p-1"
                />
            </div>
            <div>
                <label>Trade Fund (%):</label>
                <input
                    type="number"
                    name="tradeFund"
                    value={config.tradeFund}
                    onChange={handleChange}
                    className="border p-1"
                />
            </div>
            <div>
                <label>Leverage:</label>
                <input
                    type="number"
                    name="leverage"
                    value={config.leverage}
                    onChange={handleChange}
                    className="border p-1"
                />
            </div>
            {/* You can include additional fields for riskParams and strategyParams if needed,
          ensuring that their "name" attributes use dot notation, e.g., "strategyParams.period". */}
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
                Deploy Bot
            </button>
        </form>
    );
}
