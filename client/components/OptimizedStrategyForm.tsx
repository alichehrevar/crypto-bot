'use client';

import React, { useEffect, useState } from 'react';

// Define the configuration interface for the bot deployment.
// Note: We've added "accountId" to store the attached account's ID.
export interface BotConfig {
    symbol: string;
    baseFund: number;
    tradeFund: number;
    leverage: number;
    riskStrategy: string;
    compoundPositionSizing: boolean;
    takeProfit: number;
    stopLoss: number;
    indicator: string;
    timeframe: string;
    additionalIndicators: Array<{ indicator: string; timeframe: string }>;
    strategy: string;
    // Extra optimization fields:
    optimizationMethod: 'grid' | 'bayesian';
    minOptimizationAccuracy: number;
    minSimulatedTrades: number;
    // New field to store the selected account ID.
    accountId: string;
}

interface OptimizedStrategyFormProps {
    onDeploy: (config: BotConfig) => void;
}

export default function OptimizedStrategyForm({ onDeploy }: OptimizedStrategyFormProps) {
    // Form state variables.
    const [symbol, setSymbol] = useState('BTC/USDT'); // Selected trading symbol.
    const [baseFund, setBaseFund] = useState(10000); // Starting fund.
    const [tradeFund, setTradeFund] = useState(50); // Percentage of the base fund used for trading.
    const [leverage, setLeverage] = useState(1); // Leverage value.
    const [riskStrategy, setRiskStrategy] = useState('KellyCriterionStrategy'); // Risk management strategy.
    const [compoundPositionSizing, setCompoundPositionSizing] = useState(true); // Whether to use compound sizing.
    const [takeProfit, setTakeProfit] = useState(1.02); // Take profit multiplier.
    const [stopLoss, setStopLoss] = useState(0.98); // Stop loss multiplier.
    const [indicator, setIndicator] = useState('RSI'); // Primary indicator.
    const [timeframe, setTimeframe] = useState('1h'); // Primary timeframe.
    const [additionalIndicators, setAdditionalIndicators] = useState<
        Array<{ indicator: string; timeframe: string }>
    >([]); // Additional indicators.
    // Extra optimization fields.
    const [optimizationMethod, setOptimizationMethod] = useState<'grid' | 'bayesian'>('grid');
    const [minOptimizationAccuracy, setMinOptimizationAccuracy] = useState(0.5);
    const [minSimulatedTrades, setMinSimulatedTrades] = useState(10);
    // New state to hold available symbols fetched from the backend.
    const [symbols, setSymbols] = useState<string[]>([]);
    // New state to hold the list of attached accounts (Binance, OKX, BingX).
    const [accounts, setAccounts] = useState<any[]>([]);
    // New state to hold the selected account ID.
    const [selectedAccountId, setSelectedAccountId] = useState('');
    // States for error and success messages.
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    // Predefined options for dropdowns.
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

    // Fetch available symbols from the backend on component mount.
    useEffect(() => {
        async function fetchSymbols() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
                // Request to the backend for currencies/symbols.
                const res = await fetch(`${apiUrl}/currencies`);
                if (!res.ok) {
                    throw new Error('Failed to fetch symbols');
                }
                const data = await res.json();
                // Assume that data contains an array in either data.data or data directly.
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

    // Fetch attached accounts from the backend on component mount.
    useEffect(() => {
        async function fetchAccounts() {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
                // Request to fetch all attached accounts (Binance, OKX, BingX).
                const res = await fetch(`${apiUrl}/accounts`);
                if (!res.ok) {
                    throw new Error('Failed to fetch accounts');
                }
                const data = await res.json();
                // Assume data is an array of account objects.
                setAccounts(data);
                // If accounts exist, set the default selected account.
                if (data.length > 0) {
                    setSelectedAccountId(data[0]._id);
                }
            } catch (err) {
                console.error('Error fetching accounts:', err);
                setError('Failed to load accounts');
            }
        }
        fetchAccounts();
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
        e.preventDefault(); // Prevent default form submission behavior.
        setError(''); // Reset error message.
        setSuccess(''); // Reset success message.

        // Build the configuration object with all form data.
        const config: BotConfig = {
            symbol, // Selected symbol.
            baseFund, // Base fund amount.
            tradeFund, // Trade fund percentage.
            leverage, // Selected leverage.
            riskStrategy, // Selected risk strategy.
            compoundPositionSizing, // Compound position sizing option.
            takeProfit, // Take profit multiplier.
            stopLoss, // Stop loss multiplier.
            indicator, // Primary indicator.
            timeframe, // Primary timeframe.
            additionalIndicators, // Array of additional indicators.
            strategy: indicator, // For now, strategy mirrors the primary indicator.
            optimizationMethod, // Selected optimization method.
            minOptimizationAccuracy, // Minimum optimization accuracy.
            minSimulatedTrades, // Minimum number of simulated trades.
            accountId: selectedAccountId, // Attached account ID from the select box.
        };

        // Call the onDeploy function passed via props with the built configuration.
        onDeploy(config);
    };

    return (
        <div className="border p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Deploy New Optimized Bot</h2>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            {success && <p className="text-green-500 mb-2">{success}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Symbol Select */}
                <div>
                    <label className="block mb-1 font-semibold">Symbol</label>
                    <select
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        {symbols.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Attached Account Select */}
                <div>
                    <label className="block mb-1 font-semibold">Attached Account</label>
                    <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full p-2 border rounded"
                    >
                        {/* Default option prompting the user to select an account */}
                        <option value="">Select an account</option>
                        {/* Map over accounts fetched from backend */}
                        {accounts.map((acc) => (
                            <option key={acc._id} value={acc._id}>
                                {/* Display the account type and a masked API key (first 4 characters) */}
                                {acc.type} - {acc.apiKey.substring(0, 4)}...
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
                    />
                </div>

                {/* Leverage */}
                <div>
                    <label className="block mb-1 font-semibold">Leverage (1x to 100x)</label>
                    <select
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="w-full p-2 border rounded"
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

                {/* Optimization Fields */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block mb-1 font-semibold">Optimization Method</label>
                        <select
                            value={optimizationMethod}
                            onChange={(e) => setOptimizationMethod(e.target.value as 'grid' | 'bayesian')}
                            className="w-full p-2 border rounded"
                        >
                            <option value="grid">Grid</option>
                            <option value="bayesian">Bayesian</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block mb-1 font-semibold">Minimum Optimization Accuracy</label>
                        <input
                            type="number"
                            value={minOptimizationAccuracy}
                            onChange={(e) => setMinOptimizationAccuracy(Number(e.target.value))}
                            className="w-full p-2 border rounded"
                            step="0.01"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block mb-1 font-semibold">Minimum Simulated Trades</label>
                        <input
                            type="number"
                            value={minSimulatedTrades}
                            onChange={(e) => setMinSimulatedTrades(Number(e.target.value))}
                            className="w-full p-2 border rounded"
                        />
                    </div>
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
