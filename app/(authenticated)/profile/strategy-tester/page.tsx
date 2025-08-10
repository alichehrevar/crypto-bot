'use client';

import type { BotProps } from '@/types/profile/bots/StrategyParams';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
    Autocomplete,
    AutocompleteItem,
    Input,
    Button,
    Switch,
    RadioGroup,
    Radio,
    DateRangePicker,
    RangeValue,
    DateValue,
    addToast,
} from '@heroui/react';
import copy from 'copy-to-clipboard';
import { parseDate } from '@internationalized/date';

import { getData } from '@/actions/get';
import { sendRequest } from '@/actions/post';
import { XIcon } from '@/utils/icons';
import BacktestResultChart from '@/components/shared/charts/BacktestResultChart';
import TradingViewAdvancedChart from '@/components/shared/charts/TradingViewAdvancedChart';
import MarketStats from '@/components/profile/MarketStats';
import LabelTag from '@/components/shared/ui/Label';
import { SymbolFilter, SymbolFilterResponse } from '@/types/profile/CurrencyType';

// ---------------- helpers ----------------
function formatDuration(mins: number) {
    if (!mins || mins < 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);

    return [h ? `${h}h` : null, m ? `${m}m` : null].filter(Boolean).join(' ') || '0m';
}
function formatParams(params: Record<string, any>) {
    return Object.entries(params)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
}

interface IndicatorPair {
    indicator: string;
    timeframe: string;
}
interface StrategyResult {
    indicator: string;
    timeframe: string;
    params: Record<string, any>;
    metrics: {
        totalTrades: number;
        avgTradeDuration: number;
        winRate: number;
        totalPnL: number;
        finalBalance: number;
    };
}
interface ChartData {
    candles: { time: number; open: number; high: number; low: number; close: number }[];
    trades: any[];
    indicator?: string;
    params?: Record<string, any>;
}

const toSec = (t: number) => (t > 1e11 ? Math.floor(t / 1000) : t);
const toBinanceSymbol = (s: string) => s.replace('/', '');
const tfMap = (tf: string) => {
    const m = tf.toLowerCase();

    if (['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1m'].includes(m)) return m;
    if (m === 'd') return '1d';

    return m;
};

// Fetch candles from Binance with a fallback attempt
async function fetchCandlesWithFallback(args: {
    symbol: string; interval: string; mode: 'recent' | 'range'; recentCount?: number; start?: number; end?: number;
}) {
    const base = 'https://api.binance.com/api/v3/klines';
    const symbol = toBinanceSymbol(args.symbol);
    const interval = tfMap(args.interval);

    const map = (rows: any[]) =>
        rows.map((k: any[]) => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
        }));

    try {
        if (args.mode === 'recent') {
            const url = `${base}?symbol=${symbol}&interval=${interval}&limit=${Math.max(10, Math.min(args.recentCount || 500, 1000))}`;
            const r = await fetch(url);

            if (!r.ok) throw new Error('recent fetch failed');
            const data = await r.json();
            const out = map(data || []);

            if (out.length) return out;
            throw new Error('recent empty');
        } else {
            // range mode (limited loops to avoid long waits)
            const end = args.end ?? Date.now();
            let start = args.start ?? end - 1000 * 1000;
            const out: any[] = [];
            let guard = 0;

            while (start < end && guard < 10) {
                const url = `${base}?symbol=${symbol}&interval=${interval}&startTime=${start}&endTime=${end}&limit=1000`;
                const r = await fetch(url);

                if (!r.ok) break;
                const batch = await r.json();

                if (!batch || batch.length === 0) break;
                out.push(...map(batch));
                const last = batch[batch.length - 1][0];

                start = last + 1;
                guard++;
            }
            if (out.length) return out;
            throw new Error('range empty');
        }
    } catch (e) {
        // fallback: always try recent 500 to draw *something*
        try {
            const url = `${base}?symbol=${symbol}&interval=${interval}&limit=500`;
            const r = await fetch(url);

            if (!r.ok) throw new Error('fallback recent failed');
            const data = await r.json();

            return map(data || []);
        } catch {
            return [];
        }
    }
}

// ---------------- page ----------------
export default function StrategyTesterPage() {
    const [symbols, setSymbols] = useState<SymbolFilter[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');

    const [botProps, setBotProps] = useState<BotProps>({
        riskStrategyOptions: [],
        indicatorOptions: [],
        OptMethod: [],
        timeframeOptions: [],
        defaultStrategyParams: {},
    });

    const [useRecent, setUseRecent] = useState<'recent-candles' | 'time-range'>('recent-candles');
    const [recentCount, setRecentCount] = useState('1000');
    const [dateRangeValue, setDateRangeValue] = useState<RangeValue<DateValue> | null>({
        start: parseDate('2024-04-01'),
        end: parseDate('2024-04-08'),
    });
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const [indicators, setIndicators] = useState<IndicatorPair[]>([{ indicator: 'RSI', timeframe: '30m' }]);

    const [optimize, setOptimize] = useState(true);
    const [optMethod, setOptMethod] = useState<'grid' | 'bayesian' | 'ann'>('grid');
    const [minAccuracy, setMinAccuracy] = useState<string>('');
    const [minTrades, setMinTrades] = useState<string>('');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);

    const firstRequestedTimeframe = useMemo(() => indicators[0]?.timeframe || '30m', [indicators]);

    const onCopySetting = (row: StrategyResult) => {
        const payload = { indicators: [{ indicator: row.indicator, timeframe: row.timeframe, params: row.params }] };

        copy(JSON.stringify(payload, null, 2));
        addToast({ title: 'Settings copied to clipboard!', color: 'success' });
    };

    useEffect(() => {
        getData('/currencies').then((res: SymbolFilterResponse) => {
            if (res.success) setSymbols(res.data);
            else addToast({ title: res.message, color: 'danger' });
        });
        getData('/bots/botProps').then((res) => {
            if (res.success) setBotProps(res.props);
        });
    }, []);

    useEffect(() => {
        if (dateRangeValue?.start) setStartDate(dateRangeValue.start.toString());
        if (dateRangeValue?.end) setEndDate(dateRangeValue.end.toString());
    }, [dateRangeValue]);

    const addIndicatorRow = () => setIndicators((p) => [...p, { indicator: '', timeframe: '' }]);
    const removeIndicatorRow = (i: number) => indicators.length > 1 && setIndicators((p) => p.filter((_, idx) => idx !== i));
    const updateIndicator = (i: number, v: string) => setIndicators((p) => (p[i] = { ...p[i], indicator: v }, [...p]));
    const updateTimeframe = (i: number, v: string) => setIndicators((p) => (p[i] = { ...p[i], timeframe: v }, [...p]));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setResult(null);
        setChartData(null);
        setLoading(true);

        const payload: any = {
            symbol: selectedSymbol,
            mode: useRecent === 'recent-candles' ? 'recent' : 'range',
            recentCount: useRecent === 'recent-candles' ? +recentCount : undefined,
            startDate: useRecent === 'time-range' ? startDate : undefined,
            endDate: useRecent === 'time-range' ? endDate : undefined,
            indicators: indicators.map((i) => ({
                indicator: i.indicator,
                timeframe: i.timeframe,
                params: botProps.defaultStrategyParams[i.indicator] || {},
            })),
            optimize,
            optimizationMethod: optimize ? optMethod : undefined,
            minAccuracy: optimize ? +minAccuracy : undefined,
            minTrades: optimize ? +minTrades : undefined,
        };

        try {
            const body = Object.fromEntries(
                Object.entries(payload)
                    .filter(([_, v]) => v !== undefined)
                    .map(([k, v]) => [k, k === 'indicators' ? JSON.stringify(v) : String(v)])
            );

            const res = await sendRequest(body, '/backtest/run');

            if (!res.success) {
                addToast({ title: res.error || 'Backtest failed', color: 'danger' });

                return;
            }

            setResult(res.result);
            addToast({ title: 'Backtest complete!', color: 'success' });

            // 1) TRADES from run
            let trades: any[] = [];

            if (res?.result?.runId) {
                const fullRunData = await getData(`/backtest/runs/${res.result.runId}`);

                if (fullRunData.success && fullRunData.run) {
                    trades = (fullRunData.run.trades || []).map((t: any) => ({
                        ...t,
                        entryTime: toSec(new Date(t.entryTime).getTime()),
                        exitTime: toSec(new Date(t.exitTime).getTime()),
                    }));
                }
            }

            // 2) STRATEGY (first one to display)
            const first = res?.result?.strategies?.[0];
            const chartIndicator = first?.indicator;
            const chartParams = first?.params || {};
            const usedTimeframe = first?.timeframe || firstRequestedTimeframe;

            // 3) CANDLES with fallback
            let candles: any[] = await fetchCandlesWithFallback({
                symbol: selectedSymbol,
                interval: usedTimeframe,
                mode: payload.mode,
                recentCount: payload.recentCount,
                start: payload.startDate ? Date.parse(payload.startDate) : undefined,
                end: payload.endDate ? Date.parse(payload.endDate) : undefined,
            });

            setChartData({ candles, trades, indicator: chartIndicator, params: chartParams });
        } catch (err: any) {
            addToast({ title: err.message || 'Error running backtest', color: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full mt-4 relative px-5 backtester-page">
            <div className="w-full flex flex-col gap-6">
                <MarketStats />

                {/* Main Content */}
                <div className="w-full flex flex-col lg:flex-row items-start gap-2">
                    {/* Left: Chart */}
                    <div className="flex self-stretch w-full lg:w-[72%]">
                        <div className="bg-dark-gray rounded-2xl p-0.5 w-full">
                            {/* RENDER THE NEW CHART WHENEVER WE HAVE chartData (even if candles are empty) */}
                            {chartData && chartData.candles.length > 0 ? (
                                <BacktestResultChart
                                    candles={chartData.candles}
                                    height={550}
                                    overlay={
                                        chartData.indicator === 'SMA_CROSS'
                                            ? { type: 'SMA_CROSS', fast: chartData.params?.fast, slow: chartData.params?.slow }
                                            : { type: 'NONE' }
                                    }
                                    trades={chartData.trades}
                                />
                            ) : (
                                <TradingViewAdvancedChart />
                            )}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="w-full lg:w-[28%] p-6 bg-dark-gray rounded-2xl text-white">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-white">Strategy Parameters</h3>
                            </div>

                            <div className="flex items-start justify-between flex-col-reverse gap-4 w-full border-b border-default-200 pb-4">
                                <div className="space-y-2 w-full">
                                    <LabelTag id="symbol" title="Symbol" />
                                    <Autocomplete
                                        defaultItems={symbols}
                                        id="symbol"
                                        isClearable={false}
                                        onSelectionChange={(k) => k && setSelectedSymbol(k.toString())}
                                    >
                                        {symbols.map((s) => (
                                            <AutocompleteItem key={s.id} textValue={s.symbol}>
                                                {s.symbol}
                                            </AutocompleteItem>
                                        ))}
                                    </Autocomplete>
                                </div>

                                <div className="flex items-start justify-between w-full gap-4">
                                    <RadioGroup orientation="vertical" size="sm" value={useRecent} onValueChange={setUseRecent as any}>
                                        <Radio value="recent-candles">Recent Candles</Radio>
                                        <Radio value="time-range">Time Range</Radio>
                                    </RadioGroup>
                                    {useRecent === 'recent-candles' ? (
                                        <Input
                                            className="w-28"
                                            min={1}
                                            placeholder="e.g., 1000"
                                            type="number"
                                            value={recentCount}
                                            onChange={(e) => setRecentCount(e.target.value)}
                                        />
                                    ) : (
                                        <DateRangePicker className="w-auto" value={dateRangeValue} onChange={setDateRangeValue} />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {indicators.map((row, i) => (
                                    <div key={i} className="flex items-end gap-2">
                                        <div className="space-y-2 w-full">
                                            <LabelTag id="indicator" title="Indicator" />
                                            <Autocomplete
                                                className="flex-1"
                                                id="indicator"
                                                isClearable={false}
                                                selectedKey={row.indicator}
                                                onSelectionChange={(v) => updateIndicator(i, v as string)}
                                            >
                                                {botProps.indicatorOptions.map((ind) => (
                                                    <AutocompleteItem key={ind} textValue={ind}>
                                                        {ind}
                                                    </AutocompleteItem>
                                                ))}
                                            </Autocomplete>
                                        </div>
                                        <div className="space-y-2">
                                            <LabelTag id="timeframe" title="Timeframe" />
                                            <Autocomplete
                                                className="w-28"
                                                id="timeframe"
                                                isClearable={false}
                                                selectedKey={row.timeframe}
                                                onSelectionChange={(v) => updateTimeframe(i, v as string)}
                                            >
                                                {botProps.timeframeOptions.map((tf) => (
                                                    <AutocompleteItem key={tf} textValue={tf}>
                                                        {tf}
                                                    </AutocompleteItem>
                                                ))}
                                            </Autocomplete>
                                        </div>
                                        {indicators.length > 1 && (
                                            <Button isIconOnly color="danger" size="sm" variant="light" onPress={() => removeIndicatorRow(i)}>
                                                <XIcon />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button color="primary" size="sm" variant="light" onPress={addIndicatorRow}>
                                    + Add Indicator
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-lg">Optimize Parameters</p>
                                    <Switch color="success" isSelected={optimize} onValueChange={setOptimize} />
                                </div>
                                {optimize && (
                                    <>
                                        <RadioGroup
                                            className="justify-between"
                                            classNames={{ wrapper: 'flex w-full gap-5' }}
                                            orientation="horizontal"
                                            size="sm"
                                            value={optMethod}
                                            onValueChange={(v) => setOptMethod(v as any)}
                                        >
                                            <Radio value="grid">Grid</Radio>
                                            <Radio value="bayesian">Bayesian</Radio>
                                            <Radio value="ann">ANN</Radio>
                                        </RadioGroup>
                                        <div className="flex gap-4 mt-2">
                                            <div className="space-y-2">
                                                <LabelTag id="min-accuracy" title="Min Accuracy (%)" />
                                                <Input id="min-accuracy" min={0} type="number" value={minAccuracy} onChange={(e) => setMinAccuracy(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <LabelTag id="min-trades" title="Min Trades" />
                                                <Input id="min-trades" min={1} type="number" value={minTrades} onChange={(e) => setMinTrades(e.target.value)} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <Button fullWidth className="text-black" color="primary" disabled={loading} isLoading={loading} size="lg" type="submit">
                                Start Backtester
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Results */}
                {result && (
                    <div className="overflow-x-auto bg-default-50 p-4 rounded-2xl my-4 w-full">
                        {optimize && Array.isArray(result?.strategies) && result.strategies.length > 0 && (
                            <table className="min-w-full text-sm text-left">
                                <thead>
                                <tr className="border-b border-default-200">
                                    {['Indicator','Time frame','Best parameter','Simulated Trades','Avg. Trade Duration','Win ratio','PnL',''].map((h) => (
                                        <th key={h} className="py-3 px-4 font-medium text-default-600">{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {result.strategies.map((row: StrategyResult, i: number) => (
                                    <tr key={i} className="border-b border-default-100 hover:bg-default-100">
                                        <td className="py-3 px-4">{row.indicator}</td>
                                        <td className="py-3 px-4">{row.timeframe}</td>
                                        <td className="py-3 px-4">{formatParams(row.params)}</td>
                                        <td className="py-3 px-4">{row.metrics.totalTrades}</td>
                                        <td className="py-3 px-4">{formatDuration(row.metrics.avgTradeDuration)}</td>
                                        <td className="py-3 px-4">
                        <span className={row.metrics.winRate >= 0.5 ? 'text-success' : 'text-danger'}>
                          {(row.metrics.winRate * 100).toFixed(2)}%
                        </span>
                                        </td>
                                        <td className="py-3 px-4">
                        <span className={row.metrics.totalPnL >= 0 ? 'text-success' : 'text-danger'}>
                          {row.metrics.totalPnL >= 0 ? '+' : ''}{row.metrics.totalPnL.toFixed(4)} $
                        </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Button className="text-black hover:scale-105 transition-all duration-250" color="primary" size="sm" onPress={() => onCopySetting(row)}>
                                                Copy Setting
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}

                        {!optimize && Array.isArray(result?.strategies) && result.strategies[0] && (
                            <table className="min-w-full text-sm text-center">
                                <thead>
                                <tr className="border-b border-default-200">
                                    {['Final','Trades','Win rate','PnL'].map((h) => (
                                        <th key={h} className="px-4 py-3 font-medium text-default-600">{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {(() => {
                                    const s = result.strategies[0];

                                    return (
                                        <tr>
                                            <td className="px-4 py-3">${s.metrics.finalBalance.toFixed(2)}</td>
                                            <td className="px-4 py-3">{s.metrics.totalTrades}</td>
                                            <td className="px-4 py-3">{(s.metrics.winRate * 100).toFixed(2)}%</td>
                                            <td className="px-4 py-3">${s.metrics.totalPnL.toFixed(2)}</td>
                                        </tr>
                                    );
                                })()}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
