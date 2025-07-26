'use client';

import type { BotProps } from "@/types/profile/bots/StrategyParams";

import React, { FormEvent, useEffect, useState } from "react";
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
  addToast
} from "@heroui/react";
import copy from "copy-to-clipboard";
import { parseDate } from "@internationalized/date";

import { getData } from "@/actions/get";
import { sendRequest } from "@/actions/post";
import { Cog8ToothIcon, XIcon } from "@/utils/icons";
import BacktestResultChart from "@/components/shared/charts/BacktestResultChart";
import TradingViewAdvancedChart from "@/components/shared/charts/TradingViewAdvancedChart";
import MarketStats from "@/components/profile/MarketStats";

// Helper functions
function formatDuration(mins: number) {
  if (!mins || mins < 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);

  return [h ? `${h}h` : null, m ? `${m}m` : null]
    .filter(Boolean)
    .join(" ") || "0m";
}

function formatParams(params: Record<string, any>) {
  return Object.entries(params)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

// Type definitions
interface IndicatorPair {
  indicator: string;
  timeframe: string;
}

interface OptimizedRow {
  indicator: string;
  timeframe: string;
  bestParam: Record<string, any>;
  simulatedTrades: number;
  avgTradeDuration: number;
  winRate: number;
  pnlUsd: number;
}

interface ChartData {
  candles: any[];
  trades: any[];
}

export default function StrategyTesterPage() {
  // State variables
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");
  const [botProps, setBotProps] = useState<BotProps>({
    riskStrategyOptions: [],
    indicatorOptions: [],
    OptMethod: [],
    timeframeOptions: [],
    defaultStrategyParams: {}
  });
  const [useRecent, setUseRecent] = useState<string>("recent-candles");
  const [recentCount, setRecentCount] = useState("1000");
  const [dateRangeValue, setDateRangeValue] = useState<RangeValue<DateValue> | null>({
    start: parseDate("2024-04-01"),
    end: parseDate("2024-04-08")
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [indicators, setIndicators] = useState<IndicatorPair[]>([
    { indicator: "RSI", timeframe: "30m" }
  ]);
  const [optimize, setOptimize] = useState(true);
  const [optMethod, setOptMethod] = useState<"grid" | "bayesian" | "ann">("grid");
  const [minAccuracy, setMinAccuracy] = useState("1");
  const [minTrades, setMinTrades] = useState("1");
  const [useRisk, setUseRisk] = useState(false);
  const [investment, setInvestment] = useState("100");
  const [leverage, setLeverage] = useState("1");
  const [takeProfit, setTakeProfit] = useState("2");
  const [stopLoss, setStopLoss] = useState("2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // Handlers & Effects
  const onCopySetting = (row: OptimizedRow) => {
    const payload = {
      indicators: [{
        indicator: row.indicator,
        timeframe: row.timeframe,
        params: row.bestParam
      }]
    };

    copy(JSON.stringify(payload, null, 2));
    addToast({ title: "Settings copied to clipboard!", color: "success" });
  };

  useEffect(() => {
    getData("/currencies").then(res => {
      if (res.success) setSymbols(res.data.map((c: any) => c.symbol));
    });
    getData("/bots/botProps").then(res => {
      if (res.success) setBotProps(res.props);
    });
  }, []);

  useEffect(() => {
    if (dateRangeValue?.start) setStartDate(dateRangeValue.start.toString());
    if (dateRangeValue?.end) setEndDate(dateRangeValue.end.toString());
  }, [dateRangeValue]);

  const addIndicatorRow = () => setIndicators(prev => [...prev, { indicator: "", timeframe: "" }]);
  const removeIndicatorRow = (i: number) => {
    if (indicators.length > 1) setIndicators(prev => prev.filter((_, idx) => idx !== i));
  };
  const updateIndicator = (i: number, v: string) => {
    setIndicators(prev => { const c = [...prev];

 c[i].indicator = v;

 return c; });
  };
  const updateTimeframe = (i: number, v: string) => {
    setIndicators(prev => { const c = [...prev];

 c[i].timeframe = v;

 return c; });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    setChartData(null);

    const payload: any = {
      symbol: selectedSymbol,
      mode: useRecent === "recent-candles" ? "recent" : "range",
      recentCount: useRecent === "recent-candles" ? +recentCount : undefined,
      startDate: useRecent === "time-range" ? startDate : undefined,
      endDate: useRecent === "time-range" ? endDate : undefined,
      indicators: indicators.map(i => ({
        indicator: i.indicator,
        timeframe: i.timeframe,
        params: botProps.defaultStrategyParams[i.indicator] || {}
      })),
      optimize,
      optimizationMethod: optimize ? optMethod : undefined,
      minAccuracy: optimize ? +minAccuracy : undefined,
      minTrades: optimize ? +minTrades : undefined,
      risk: useRisk ? { investment: +investment, leverage: +leverage, takeProfitPct: +takeProfit, stopLossPct: +stopLoss } : undefined
    };

    setLoading(true);
    try {
      const body = Object.fromEntries(
        Object.entries(payload)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, (k === 'indicators' || k === 'risk') ? JSON.stringify(v) : String(v)])
      );
      const res = await sendRequest(body, "/backtest/run");

      if (!res.success) {
        addToast({ title: res.error || "Backtest failed", color: "danger" });
      } else {
        setResult(res.result);
        addToast({ title: "Backtest complete!", color: "success" });

        if (res.backtestId) {
          const fullRunData = await getData(`/backtest/runs/${res.backtestId}`);

          if (fullRunData.success && fullRunData.run) {
            const formattedCandles = fullRunData.run.candles.map((c: any) => ({
              time: c.timestamp / 1000,
              open: c.open, high: c.high, low: c.low, close: c.close,
            }));
            const formattedTrades = fullRunData.run.trades.map((t: any) => ({
              ...t,
              entryTime: new Date(t.entryTime).getTime() / 1000,
              exitTime: new Date(t.exitTime).getTime() / 1000,
            }));

            setChartData({ candles: formattedCandles, trades: formattedTrades });
          }
        }
      }
    } catch (err: any) {
      addToast({ title: err.message || "Error running backtest", color: "danger" });
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="w-full mt-4 relative px-5 backtester-page">
      <div className="w-full flex flex-col gap-6">

        <MarketStats />

        {/* Main Content: Chart (Left) and Form (Right) */}
        <div className="w-full flex flex-col lg:flex-row items-start gap-6">

          {/* Left Column: Chart */}
          <div className="w-full lg:w-[70%]">
            <div className="bg-default-50 rounded-2xl p-2">
              {chartData ? (
                <BacktestResultChart candles={chartData.candles} height={550} trades={chartData.trades} />
              ) : (
                <div className="h-[480px]">
                  <TradingViewAdvancedChart />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="w-full lg:w-[30%] p-6 bg-default-50 rounded-2xl text-white">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 mb-4">
                <Cog8ToothIcon className="w-6 h-6" stroke="#60a5fa" />
                <h3 className="text-lg font-semibold text-white">Strategy Parameters</h3>
              </div>
              <div className="flex items-start justify-between flex-col-reverse gap-4 w-full border-b border-default-200 pb-4">
                <Autocomplete
                  className="w-full"
                  defaultItems={symbols.map(s => ({ label: s, value: s }))}
                  label="Symbol"
                  selectedKey={selectedSymbol}
                  variant="underlined"
                  onSelectionChange={(key) => setSelectedSymbol(key as string)}
                >
                  {(item: any) => <AutocompleteItem key={item.value}>{item.label}</AutocompleteItem>}
                </Autocomplete>
                <div className="flex items-start justify-between w-full gap-4">
                  <RadioGroup size="sm" orientation="vertical" value={useRecent} onValueChange={setUseRecent}>
                    <Radio value="recent-candles">Recent Candles</Radio>
                    <Radio value="time-range">Time Range</Radio>
                  </RadioGroup>
                  {useRecent === "recent-candles" ? (
                    <Input
                      className="w-28"
                      min={1}
                      placeholder="e.g., 1000"
                      type="number"
                      value={recentCount}
                      onChange={e => setRecentCount(e.target.value)}
                    />
                  ) : (
                    <DateRangePicker className="w-auto" value={dateRangeValue} onChange={setDateRangeValue} />
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {indicators.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Autocomplete className="flex-1" label="Indicator" selectedKey={row.indicator} onSelectionChange={v => updateIndicator(i, v as string)}>
                      {botProps.indicatorOptions.map(ind => <AutocompleteItem key={ind} textValue={ind}>{ind}</AutocompleteItem>)}
                    </Autocomplete>
                    <Autocomplete className="w-28" label="Timeframe" selectedKey={row.timeframe} onSelectionChange={v => updateTimeframe(i, v as string)}>
                      {botProps.timeframeOptions.map(tf => <AutocompleteItem key={tf} textValue={tf}>{tf}</AutocompleteItem>)}
                    </Autocomplete>
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
                    <RadioGroup size="sm" className="justify-between" classNames={{
                      wrapper: 'flex w-full gap-5'
                    }} orientation="horizontal" value={optMethod} onValueChange={(v) => setOptMethod(v as any)}>
                      <Radio value="grid">Grid</Radio>
                      <Radio value="bayesian">Bayesian</Radio>
                      <Radio value="ann">ANN</Radio>
                    </RadioGroup>
                    <div className="flex gap-4 mt-2">
                      <Input label="Min Accuracy (%)" min={0} type="number" value={minAccuracy} onChange={e => setMinAccuracy(e.target.value)} />
                      <Input label="Min Trades" min={1} type="number" value={minTrades} onChange={e => setMinTrades(e.target.value)} />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-lg">Risk Parameters</p>
                  <Switch color="success" isSelected={useRisk} onValueChange={setUseRisk} />
                </div>
                {useRisk && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Input label="Investment" min={0.01} type="number" value={investment} onChange={e => setInvestment(e.target.value)} />
                    <Input label="Leverage" min={1} type="number" value={leverage} onChange={e => setLeverage(e.target.value)} />
                    <Input label="Take Profit (%)" min={0} type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} />
                    <Input label="Stop Loss (%)" min={0} type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
                  </div>
                )}
              </div>

              <Button fullWidth color="primary" disabled={loading} isLoading={loading} size="lg" type="submit">
                Start Backtester
              </Button>
            </form>
          </div>
        </div>

        {/* Results Table Section */}
        {result && (
          <div className="overflow-x-auto bg-default-50 p-4 rounded-2xl my-4 w-full">
            {optimize && result.optimizedParams?.length > 0 && (
              <table className="min-w-full text-sm text-left">
                <thead>
                <tr className="border-b border-default-200">
                  {["Indicator", "Time frame", "Best parameter", "Simulated Trades", "Avg. Trade Duration", "Win ratio", "PnL", ""].map(h =>
                    <th key={h} className="py-3 px-4 font-medium text-default-600">{h}</th>)}
                </tr>
                </thead>
                <tbody>
                {result.optimizedParams.map((row: OptimizedRow, i: number) => (
                  <tr key={i} className="border-b border-default-100 hover:bg-default-100">
                    <td className="py-3 px-4">{row.indicator}</td>
                    <td className="py-3 px-4">{row.timeframe}</td>
                    <td className="py-3 px-4">{formatParams(row.bestParam)}</td>
                    <td className="py-3 px-4">{row.simulatedTrades}</td>
                    <td className="py-3 px-4">{formatDuration(row.avgTradeDuration)}</td>
                    <td className="py-3 px-4">
                        <span className={row.winRate >= 0.5 ? "text-success" : "text-danger"}>
                          {(row.winRate * 100).toFixed(2)}%
                        </span>
                    </td>
                    <td className="py-3 px-4">
                        <span className={row.pnlUsd >= 0 ? "text-success" : "text-danger"}>
                          {row.pnlUsd >= 0 ? "+" : ""}{row.pnlUsd.toFixed(4)} $
                        </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button size="sm" variant="bordered" onPress={() => onCopySetting(row)}>Copy Setting</Button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            )}
            {!optimize && result.summary && (
              <table className="min-w-full text-sm text-center">
                <thead>
                <tr className="border-b border-default-200">
                  {["Initial", "Final", "Trades", "Win rate", "PnL"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-default-600">{h}</th>
                  ))}
                </tr>
                </thead>
                <tbody>
                <tr>
                  <td className="px-4 py-3">${result.summary.initialBalance.toFixed(2)}</td>
                  <td className="px-4 py-3">${result.summary.finalBalance.toFixed(2)}</td>
                  <td className="px-4 py-3">{result.summary.totalTrades}</td>
                  <td className="px-4 py-3">{(result.summary.metrics.winRate * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3">${result.summary.metrics.totalPnL.toFixed(2)}</td>
                </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
