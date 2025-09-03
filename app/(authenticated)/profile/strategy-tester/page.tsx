'use client';

import type { BotProps } from '@/types/profile/bots/StrategyParams';

import React, { FormEvent, useEffect, useState } from 'react';
import {
    Button,
    DateRangePicker,
    RangeValue,
    DateValue,
    addToast, Spinner,
} from '@heroui/react';
import copy from 'copy-to-clipboard';
import { parseDate } from '@internationalized/date';
import {AnimatePresence, motion} from "framer-motion";

import { getData } from '@/actions/get';
import { sendRequest } from '@/actions/post';
import {OrderIcon} from '@/utils/icons';
import BacktestResultChart from '@/components/shared/charts/BacktestResultChart';
import MarketStats from '@/components/profile/MarketStats';
import { SymbolFilter, SymbolFilterResponse } from '@/types/profile/CurrencyType';
import MarketListWithSearch from "@/components/MarketListWithSearch";
import RealTimeCandlestickChart from "@/components/shared/charts/TradingViewLightweightChart";
import NumericInput from "@/components/shared/ui/NumericInput";
import {MAIN_INDICATOR_OPTIONS, STANDARD_INDICATOR_OPTIONS} from "@/utils/strategyPanelData";
import IndicatorsSection, {IndicatorItem} from "@/components/shared/ui/IndicatorsSection";
import Switcher from "@/components/shared/ui/Switcher";
import RadioGroup from "@/components/shared/ui/RadioGroup";

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

// ---------------- page ----------------
export default function StrategyTesterPage() {
    const [symbols, setSymbols] = useState<SymbolFilter[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string>('btc-bitcoin');
    const [selectedIndicators, setSelectedIndicators] = useState<IndicatorItem[]>([]);

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

    const sectionAnimationProps = {
        initial: {opacity: 0, height: 0},
        animate: {opacity: 1, height: 'auto'},
        exit: {opacity: 0, height: 0},
        transition: {type: "spring", stiffness: 300, damping: 30}
    };


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
                addToast({ title: res.error || "Backtest failed", color: "danger" });
            } else {
                setResult(res.result);
                addToast({ title: "Backtest complete!", color: "success" });

                const first = res?.result?.strategies?.[0];

                if (first) {
                    // backend sends ms; chart wants seconds
                    const formattedCandles = (first.candles || []).map((c: any) => ({
                        time: Math.floor(c.time / 1000),
                        open: c.open,
                        high: c.high,
                        low:  c.low,
                        close: c.close,
                    }));

                    const formattedTrades = (first.trades || []).map((t: any) => ({
                        ...t,
                        entryTime: Math.floor(new Date(t.entryTime).getTime() / 1000),
                        exitTime:  Math.floor(new Date(t.exitTime).getTime() / 1000),
                    }));

                    setChartData({
                        candles: formattedCandles,
                        trades: formattedTrades,
                        indicator: first.indicator,
                        params: first.params,
                    });
                } else {
                    setChartData(null);
                }
            }
        } catch (err: any) {
            addToast({ title: err.message || 'Error running backtest', color: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full mt-4 relative px-5 backtester-page overflow-y-auto h-full">
            <div className="w-full flex flex-col gap-2">
                <MarketStats symbolId={selectedSymbol ?? undefined} />

                {/* Main Content */}
                <div className="w-full flex flex-col lg:flex-row items-start gap-2 mt-4 lg:h-[650px]">
                    {/* Left: Chart */}
                    <div className="flex self-stretch w-full gap-2 lg:w-[76%] h-full">
                        <div className="w-1/3 h-full grid grid-cols-1">
                            {/* MarketList */}
                            <MarketListWithSearch />
                        </div>
                        <div className="bg-dark-gray rounded-lg p-0.5 w-2/3 h-full">
                            {/* RENDER THE NEW CHART WHENEVER WE HAVE chartData (even if candles are empty) */}
                            {chartData && chartData.candles.length > 0 ? (
                                <BacktestResultChart
                                    candles={chartData.candles}
                                    overlay={
                                        chartData.indicator === 'SMA_CROSS'
                                            ? { type: 'SMA_CROSS', fast: chartData.params?.fast, slow: chartData.params?.slow }
                                            : { type: 'NONE' }
                                    }
                                    trades={chartData.trades}
                                />
                            ) : (
                                <div className="h-full">
                                    <RealTimeCandlestickChart interval="1m" symbol="BTCUSDT" timeZone="local" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="w-full lg:w-[24%] h-full p-3 bg-dark-gray rounded-lg text-white overflow-y-auto">
                        <form className="space-y-6 py-2" onSubmit={handleSubmit}>
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-white">Strategy Parameters</h3>
                            </div>

                            <div className="flex items-start justify-between flex-col-reverse gap-4 w-full border-b border-default-200 pb-4">

                                <div className="flex flex-col items-start justify-between w-full gap-4">
                                    <RadioGroup
                                        options={[{ value: 'recent-candles', label: 'Recent Candles' }, { value: 'time-range', label: 'Time Range' }]}
                                        selectedValue={useRecent}
                                        onChange={(v) => setUseRecent(v as any)}
                                    />
                                    {useRecent === 'recent-candles' ? (
                                        <div className="w-full">
                                            <NumericInput
                                                max={1000}
                                                min={1}
                                                placeholder="e.g., 1000"
                                                step={0.0001}
                                                usePercentageStep={true}
                                                value={recentCount}
                                                onChange={(e) => setRecentCount(e)}
                                            />
                                        </div>
                                    ) : (
                                        <DateRangePicker className="w-full" radius="sm" value={dateRangeValue} variant="bordered" onChange={setDateRangeValue} />
                                    )}
                                </div>
                            </div>

                            <IndicatorsSection
                                defaultNewTimeframe="1h"
                                initialIndicators={[
                                    { id: 1, indicator: STANDARD_INDICATOR_OPTIONS[0], timeFrame: "1h" },
                                ]}
                                mainOptions={MAIN_INDICATOR_OPTIONS}
                                showAddIndicatorButton={true}
                                standardOptions={STANDARD_INDICATOR_OPTIONS}
                                onChange={setSelectedIndicators}
                            />

                            <div className="space-y-4">
                                <Switcher
                                    isEnabled={optimize}
                                    setIsEnabled={setOptimize}
                                    title="Optimize Parameters"
                                />
                                <AnimatePresence initial={false}>
                                    {optimize && (
                                        <motion.div {...sectionAnimationProps} className="pt-2">
                                            <>
                                                <RadioGroup
                                                    options={[{ value: 'grid', label: 'Grid' }, { value: 'bayesian', label: 'Bayesian' }, { value: 'ann', label: 'ANN' }]}
                                                    selectedValue={optMethod}
                                                    onChange={(v) => setOptMethod(v as any)}
                                                />
                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                    <NumericInput
                                                        label="Min Accuracy (%)"
                                                        max={100}
                                                        min={1}
                                                        usePercentageStep={true}
                                                        value={minAccuracy}
                                                        onChange={(e) => setMinAccuracy(e)}
                                                    />
                                                    <NumericInput
                                                        label="Min Trades"
                                                        max={100}
                                                        min={1}
                                                        usePercentageStep={true}
                                                        value={minTrades}
                                                        onChange={(e) => setMinTrades(e)}
                                                    />
                                                </div>
                                            </>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Button fullWidth className="text-black" color="primary" disabled={loading} isLoading={loading} size="lg" type="submit">
                                Start Backtester
                            </Button>
                        </form>
                    </div>
                </div>

                <div className="bg-dark-gray rounded-lg pt-4 px-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold mb-4">Backtest Result</h3>
                        </div>
                    </div>

                    {!result && loading && (
                        <div className="flex items-center justify-center flex-row-reverse gap-3 h-40 rounded-lg w-full pb-4">
                            <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
                            Backtest is running
                        </div>
                    )}

                    {!result && !loading && (
                        <div className="flex items-center justify-center flex-col w-full h-40 pb-4">
                            <OrderIcon className="w-[120px] h-[120px]" />
                            <span className="text-gray-600 text-sm">No Data</span>
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="overflow-x-auto bg-dark-gray pb-4 rounded-lg mb-4 w-full">

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
                                            <span className={row.metrics.winRate >= 0.5 ? 'text-[var(--text-green)]' : 'text-[var(--text-red)]'}>
                                              {(row.metrics.winRate * 100).toFixed(2)}%
                                            </span>
                                            </td>
                                            <td className="py-3 px-4">
                                            <span className={row.metrics.totalPnL >= 0 ? 'text-[var(--text-green)]' : 'text-[var(--text-red)]'}>
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
        </div>
    );
}
