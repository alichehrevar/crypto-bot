// app/components/BotConfigForm.tsx
'use client';

import React, { useEffect, useState } from 'react';

/**
 * BotConfig represents the configuration data required to deploy a new bot.
 */
export interface BotConfig {
    name: string; // Bot name (e.g. "BTC/USDT 1h RSI Bot")
    symbol: string; // Trading pair (e.g. "BTC/USDT")
    baseFund: number; // Base fund in dollars.
    tradeFund: number; // Trade fund percentage.
    leverage: number; // Leverage factor.
    riskStrategy: string; // Money management strategy.
    compoundPositionSizing: boolean; // Use compound or simple position sizing.
    takeProfit: number; // Take profit multiplier.
    stopLoss: number; // Stop loss multiplier.
    indicator: string; // Primary indicator (e.g. "RSI", "MACD", etc.)
    timeframe: string; // Primary timeframe (e.g. "1h", "5m", etc.)
    additionalIndicators: Array<{ indicator: string; timeframe: string }>; // Additional indicator configurations.
    strategy: string; // Overall trading strategy (for now we set it equal to the indicator).
    strategyParams: object; // Configuration for the indicator (e.g. { period, overbought, oversold }).
}

/**
 * BotConfigFormProps defines the properties expected by the BotConfigForm component.
 */
interface BotConfigFormProps {
    onDeploy: (config: BotConfig) => void;
}

/**
 * BotConfigForm component
 *
 * Renders a form to deploy a new bot with configuration options.
 * It collects:
 *  - Bot Name
 *  - Symbol
 *  - Base Fund, Trade Fund, and Leverage
 *  - Risk Strategy and compound position sizing option
 *  - Take Profit and Stop Loss multipliers
 *  - Primary Indicator (with its timeframe) and additional indicators
 *  - Default strategy parameters are set based on the chosen primary indicator.
 */
export default function BotConfigForm({ onDeploy }: BotConfigFormProps) {
    // Form state variables.
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('BTC/USDT');
    const [baseFund, setBaseFund] = useState(10000);
    const [tradeFund, setTradeFund] = useState(50);
    const [leverage, setLeverage] = useState(1);
    const [riskStrategy, setRiskStrategy] = useState('KellyCriterionStrategy');
    const [compoundPositionSizing, setCompoundPositionSizing] = useState(true);
    const [takeProfit, setTakeProfit] = useState(1.02);
    const [stopLoss, setStopLoss] = useState(0.98);
    const [indicator, setIndicator] = useState('RSI');
    const [timeframe, setTimeframe] = useState('1h');
    const [additionalIndicators, setAdditionalIndicators] = useState<
        Array<{ indicator: string; timeframe: string }>
    >([]);
    const [symbols, setSymbols] = useState<string[]>([]);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    // Predefined options.
    const riskStrategyOptions = [
        'KellyCriterionStrategy',
        'MartingaleStrategy',
        'MirroredMartingaleStrategy',
        'SimpleStrategy'
    ];
    const indicatorOptions = [
        'RSI',
        'MACD',
        'MA_Crossover',
        'Donchian',
        'Volume',
        'Heikin_Ashi',
        'Combined_RSI_MACD',
        'Bollinger_Bands',
        'Stochastic_RSI',
    ];
    const timeframeOptions = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    const leverageOptions = Array.from({ length: 100 }, (_, i) => i + 1);

    // Define default strategy parameters for known indicators.
    const defaultStrategyParams: Record<string, object> = {
        RSI: { period: 14, overbought: 70, oversold: 30 },
        MACD: { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 },
        MA_Crossover: { shortPeriod: 5, longPeriod: 20 },
        // For other indicators, you can set defaults if needed.
    };

    // Fetch available symbols from backend on mount.
    useEffect(() => {
        async function fetchSymbols() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
                const res = await fetch(`${apiUrl}/currencies`);
                if (!res.ok) {
                    throw new Error('Failed to fetch symbols');
                }
                const data = await res.json();
                const symbolList = data.data ? data.data : data;
                setSymbols(symbolList);
                if (symbolList.length > 0) {
                    setSymbol(symbolList[0]);
                }
            } catch (err) {
                console.error('Error fetching symbols:', err);
                setError('Failed to load symbols');
            }
        }
        fetchSymbols();
    }, []);

    // Handler to add an additional indicator row.
    const addAdditionalIndicator = () => {
        setAdditionalIndicators([...additionalIndicators, { indicator: 'RSI', timeframe: '1m' }]);
    };

    // Handler to update an additional indicator entry.
    const updateAdditionalIndicator = (
        index: number,
        field: 'indicator' | 'timeframe',
        value: string
    ) => {
        const updated = [...additionalIndicators];
        updated[index] = { ...updated[index], [field]: value };
        setAdditionalIndicators(updated);
    };

    // Form submission handler.
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate required fields.
        if (!name.trim()) {
            setError('Bot name is required.');
            return;
        }
        if (!symbol.trim()) {
            setError('Symbol is required.');
            return;
        }

        // Format symbol: if no slash is present, insert one.
        let formattedSymbol = symbol.trim().toUpperCase();
        if (!formattedSymbol.includes('/')) {
            if (formattedSymbol.endsWith('USDT')) {
                formattedSymbol = formattedSymbol.slice(0, -4) + '/USDT';
            } else if (formattedSymbol.endsWith('USDC')) {
                formattedSymbol = formattedSymbol.slice(0, -4) + '/USDC';
            }
        }

        // Build the bot configuration object.
        const config: BotConfig = {
            name: name.trim(),
            symbol: formattedSymbol,
            baseFund,
            tradeFund,
            leverage,
            riskStrategy,
            compoundPositionSizing,
            takeProfit,
            stopLoss,
            indicator,
            timeframe,
            additionalIndicators,
            strategy: indicator, // For now, we set strategy equal to the primary indicator.
            strategyParams: defaultStrategyParams[indicator] || {}
        };

        onDeploy(config);
    };

    return (
        <div className="border p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Deploy New Bot</h2>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            {success && <p className="text-green-500 mb-2">{success}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Bot Name */}
                <div>
                    <label className="block mb-1 font-semibold">Bot Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="e.g. BTC/USDT 1h RSI Bot"
                        required
                    />
                </div>
                {/* Symbol Select */}
                <div>
                    <label className="block mb-1 font-semibold">Symbol</label>
                    <select
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    >
                        {symbols.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Base Fund */}
                <div>
                    <label className="block mb-1 font-semibold">Base Fund ($)</label>
                    <input
                        type="number"
                        value={baseFund}
                        onChange={(e) => setBaseFund(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        min={0}
                        required
                    />
                </div>
                {/* Trade Fund */}
                <div>
                    <label className="block mb-1 font-semibold">Trade Fund (%)</label>
                    <input
                        type="number"
                        value={tradeFund}
                        onChange={(e) => setTradeFund(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        min={0}
                        max={100}
                        required
                    />
                </div>
                {/* Leverage */}
                <div>
                    <label className="block mb-1 font-semibold">Leverage (1x to 100x)</label>
                    <select
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        required
                    >
                        {leverageOptions.map((lv) => (
                            <option key={lv} value={lv}>
                                {lv}x
                            </option>
                        ))}
                    </select>
                </div>
                {/* Risk Strategy */}
                <div>
                    <label className="block mb-1 font-semibold">Risk Strategy</label>
                    <select
                        value={riskStrategy}
                        onChange={(e) => setRiskStrategy(e.target.value)}
                        className="w-full p-2 border rounded"
                        required
                    >
                        {riskStrategyOptions.map((rs) => (
                            <option key={rs} value={rs}>
                                {rs}
                            </option>
                        ))}
                    </select>
                </div>
                {/* Compound Position Sizing Switch */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        checked={compoundPositionSizing}
                        onChange={(e) => setCompoundPositionSizing(e.target.checked)}
                        className="mr-2"
                    />
                    <label>Use compound position sizing</label>
                </div>
                {/* Take Profit */}
                <div>
                    <label className="block mb-1 font-semibold">Take Profit (Multiplier)</label>
                    <input
                        type="number"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        step="0.01"
                        required
                    />
                </div>
                {/* Stop Loss */}
                <div>
                    <label className="block mb-1 font-semibold">Stop Loss (Multiplier)</label>
                    <input
                        type="number"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        step="0.01"
                        required
                    />
                </div>
                {/* Primary Indicator and Timeframe */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block mb-1 font-semibold">Primary Indicator</label>
                        <select
                            value={indicator}
                            onChange={(e) => setIndicator(e.target.value)}
                            className="w-full p-2 border rounded"
                            required
                        >
                            {indicatorOptions.map((ind) => (
                                <option key={ind} value={ind}>
                                    {ind}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block mb-1 font-semibold">Primary Timeframe</label>
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                            className="w-full p-2 border rounded"
                            required
                        >
                            {timeframeOptions.map((tf) => (
                                <option key={tf} value={tf}>
                                    {tf}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Additional Indicators */}
                <div>
                    <label className="block mb-1 font-semibold">Additional Indicators</label>
                    {additionalIndicators.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-4 mb-2">
                            <select
                                value={item.indicator}
                                onChange={(e) => updateAdditionalIndicator(index, 'indicator', e.target.value)}
                                className="flex-1 p-2 border rounded"
                                required
                            >
                                {indicatorOptions.map((ind) => (
                                    <option key={ind} value={ind}>
                                        {ind}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={item.timeframe}
                                onChange={(e) => updateAdditionalIndicator(index, 'timeframe', e.target.value)}
                                className="flex-1 p-2 border rounded"
                                required
                            >
                                {timeframeOptions.map((tf) => (
                                    <option key={tf} value={tf}>
                                        {tf}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addAdditionalIndicator}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                    >
                        Add Additional Indicator
                    </button>
                </div>
                {/* Deploy Button */}
                <div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Deploy Bot
                    </button>
                </div>
            </form>
        </div>
    );
}
