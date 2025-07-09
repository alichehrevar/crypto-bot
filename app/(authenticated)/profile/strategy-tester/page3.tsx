"use client";

import React, { FormEvent, useEffect, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  DateRangePicker,
  DateValue,
  Input,
  Radio,
  RadioGroup,
  RangeValue,
  Switch,
  addToast,
} from "@heroui/react";
import copy from "copy-to-clipboard";
import { parseDate } from "@internationalized/date";
import { getData } from "@/actions/get";
import { sendRequest } from "@/actions/post";
import type { BotProps } from "@/types/profile/bots/StrategyParams";
import { XIcon } from "@/utils/icons";
import TradingViewAdvancedChart from "@/components/shared/charts/TradingViewAdvancedChart";

// helper to turn minutes into “Xh Ym”
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

export default function StrategyTesterPage() {
  // ─── LOOKUPS & STATE ──────────────────────────────────────────────────────
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");
  const [botProps, setBotProps] = useState<BotProps>({
    riskStrategyOptions: [],
    indicatorOptions: [],
    OptMethod: [],
    timeframeOptions: [],
    defaultStrategyParams: {},
  });

  // Date selection
  const [useRecent, setUseRecent] = useState<"recent-candles" | "time-range" | string>("recent-candles");
  const [recentCount, setRecentCount] = useState("1000");
  const [dateRangeValue, setDateRangeValue] = useState<RangeValue<DateValue> | null>({
    start: parseDate("2024-04-01"),
    end: parseDate("2024-04-08"),
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Indicators / timeframes
  const [indicators, setIndicators] = useState<IndicatorPair[]>([
    { indicator: "RSI", timeframe: "30m" },
  ]);

  // Optimize toggle + fields
  const [optimize, setOptimize] = useState(true);
  const [optMethod, setOptMethod] = useState<"grid" | "bayesian" | "ann">("grid");
  const [minAccuracy, setMinAccuracy] = useState("1");
  const [minTrades, setMinTrades] = useState("1");

  // Risk toggle + fields
  const [useRisk, setUseRisk] = useState(false);
  const [investment, setInvestment] = useState("100");
  const [leverage, setLeverage] = useState("1");
  const [takeProfit, setTakeProfit] = useState("2");
  const [stopLoss, setStopLoss] = useState("2");

  // API & result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // =================================================================
  // │ 1. FIXED: onCopySetting now uses the best parameters │
  // =================================================================
  const onCopySetting = (row: OptimizedRow) => {
    const payload = {
      indicators: [{
        indicator: row.indicator,
        timeframe: row.timeframe,
        params: row.bestParam, // Use the 'bestParam' object from the results row
      }],
    };
    copy(JSON.stringify(payload, null, 2));
    addToast({ title: "Settings copied to clipboard!", color: "success" });
  };

  // ─── DATA FETCHING ────────────────────────────────────────────────────────
  useEffect(() => {
    getData("/currencies")
      .then(res => {
        if (res.success) setSymbols(res.data.map((c: any) => c.symbol));
      });
    getData("/bots/botProps")
      .then(res => {
        if (res.success) setBotProps(res.props);
      });
  }, []);

  // ─── SYNC DATE RANGE PICKER TO STRINGS ────────────────────────────────────
  useEffect(() => {
    if (dateRangeValue?.start) {
      setStartDate(dateRangeValue.start.toString());
    }
    if (dateRangeValue?.end) {
      setEndDate(dateRangeValue.end.toString());
    }
  }, [dateRangeValue]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const addIndicatorRow = () => {
    setIndicators(prev => [...prev, { indicator: "", timeframe: "" }]);
  };

  const removeIndicatorRow = (i: number) => {
    if (indicators.length > 1) {
      setIndicators(prev => prev.filter((_, idx) => idx !== i));
    }
  };

  const updateIndicator = (i: number, v: string) => {
    setIndicators(prev => {
      const c = [...prev];
      c[i].indicator = v;
      return c;
    });
  };

  const updateTimeframe = (i: number, v: string) => {
    setIndicators(prev => {
      const c = [...prev];
      c[i].timeframe = v;
      return c;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const payload = {
      symbol: selectedSymbol,
      mode: useRecent,
      recentCount: useRecent === "recent-candles" ? recentCount : undefined,
      startDate: useRecent === "time-range" ? startDate : undefined,
      endDate: useRecent === "time-range" ? endDate : undefined,
      indicators: indicators.map(ind => ({
        ...ind,
        params: botProps.defaultStrategyParams[ind.indicator] || {},
      })),
      optimize,
      optimizationMethod: optMethod,
      minAccuracy,
      minTrades,
      risk: {
        use: useRisk,
        investment,
        leverage,
        takeProfit,
        stopLoss,
      },
    };

    try {
      const body = Object.fromEntries(
        Object.entries(payload)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, (k === 'indicators' || k === 'risk') ? JSON.stringify(v) : String(v)])
      );
      const res = await sendRequest(body, "/backtest/run");
      if (res.success) {
        setResult(res.data);
        addToast({ title: "Backtest complete!", color: "success" });
      } else {
        addToast({ title: "Error", description: res.message, color: "danger" });
      }
    } catch (error: any) {
      addToast({ title: "Request Failed", description: error.message || "An unknown error occurred.", color: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Settings Panel */}
      <form onSubmit={handleSubmit} className="col-span-12 lg:col-span-3 bg-content1 rounded-lg p-4 space-y-6">
        <h2 className="text-xl font-bold">Strategy Parameters</h2>

        {/* Symbol */}
        <Autocomplete label="Symbol" selectedKey={selectedSymbol} onSelectionChange={(k) => setSelectedSymbol(k as string)} allowsCustomValue>
          {symbols.map(s => <AutocompleteItem key={s}>{s}</AutocompleteItem>)}
        </Autocomplete>

        {/* Data Range */}
        <RadioGroup label="Data Range" value={useRecent} onValueChange={setUseRecent}>
          <Radio value="recent-candles">Recent Candles</Radio>
          <Radio value="time-range">Time Range</Radio>
        </RadioGroup>

        {useRecent === "recent-candles" ? (
          <Input label="Number of Candles" value={recentCount} onValueChange={setRecentCount} />
        ) : (
          <DateRangePicker label="Date Range" value={dateRangeValue} onChange={setDateRangeValue} />
        )}

        {/* Indicators */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Indicators</h3>
          {indicators.map((ind, i) => (
            <div key={i} className="flex items-center gap-2">
              <Autocomplete label="Indicator" className="flex-1" selectedKey={ind.indicator} onSelectionChange={(k) => updateIndicator(i, k as string)} allowsCustomValue>
                {botProps.indicatorOptions.map(opt => <AutocompleteItem key={opt}>{opt}</AutocompleteItem>)}
              </Autocomplete>
              <Autocomplete label="Timeframe" className="flex-1" selectedKey={ind.timeframe} onSelectionChange={(k) => updateTimeframe(i, k as string)} allowsCustomValue>
                {botProps.timeframeOptions.map(opt => <AutocompleteItem key={opt}>{opt}</AutocompleteItem>)}
              </Autocomplete>
              <Button isIconOnly variant="light" onPress={() => removeIndicatorRow(i)} className="mt-6" isDisabled={indicators.length <= 1}>
                <XIcon />
              </Button>
            </div>
          ))}
          <Button variant="bordered" onPress={addIndicatorRow}>Add Indicator</Button>
        </div>

        {/* Optimization */}
        <div className="space-y-4">
          <Switch isSelected={optimize} onValueChange={setOptimize}>Optimize Parameters</Switch>
          {optimize && (
            <div className="pl-2 space-y-4 border-l-2 border-default-200">
              <RadioGroup label="Method" value={optMethod} onValueChange={(v) => setOptMethod(v as any)} orientation="horizontal">
                {botProps.OptMethod.map(m => <Radio key={m} value={m}>{m}</Radio>)}
              </RadioGroup>
              <Input label="Minimum Accuracy (%)" value={minAccuracy} onValueChange={setMinAccuracy} />
              <Input label="Minimum Trades" value={minTrades} onValueChange={setMinTrades} />
            </div>
          )}
        </div>

        {/* Risk Management */}
        <div className="space-y-4">
          <Switch isSelected={useRisk} onValueChange={setUseRisk}>Use Risk Management</Switch>
          {useRisk && (
            <div className="pl-2 space-y-4 border-l-2 border-default-200">
              <Input label="Investment ($)" value={investment} onValueChange={setInvestment} />
              <Input label="Leverage" value={leverage} onValueChange={setLeverage} />
              <Input label="Take Profit (%)" value={takeProfit} onValueChange={setTakeProfit} />
              <Input label="Stop Loss (%)" value={stopLoss} onValueChange={setStopLoss} />
            </div>
          )}
        </div>

        <Button type="submit" color="primary" className="w-full" isLoading={loading}>
          Run Backtest
        </Button>
      </form>

      {/* Results Panel */}
      <div className="col-span-12 lg:col-span-9 bg-content1 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Results</h2>
        {loading && <div className="flex justify-center items-center h-96">Loading results...</div>}
        {!loading && !result && (
          <div className="flex flex-col justify-center items-center h-96 text-default-500">
            <p>Run a backtest to see the results here.</p>
            <p className="text-sm">Configure your settings on the left and click "Run Backtest".</p>
          </div>
        )}
        {result && (
          <div className="space-y-6">
            <div className="h-[400px]">
              <TradingViewAdvancedChart />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-content2 p-3 rounded-md">
                <p className="text-sm text-default-500">Initial Balance</p>
                <p className="text-lg font-semibold">${result.summary.initialBalance.toLocaleString()}</p>
              </div>
              <div className="bg-content2 p-3 rounded-md">
                <p className="text-sm text-default-500">Final Balance</p>
                <p className="text-lg font-semibold">${result.summary.finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className={`bg-content2 p-3 rounded-md ${result.summary.metrics.totalPnL >= 0 ? "text-success" : "text-danger"}`}>
                <p className="text-sm">Total PnL</p>
                <p className="text-lg font-semibold">${result.summary.metrics.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Optimized Parameters Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-default-200">
                <thead className="bg-content2">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Indicator</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Timeframe</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Best Params</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Trades</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Avg. Duration</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Win Rate</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">PnL (USD)</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-default-200">
                {result.optimizedParams.map((row: OptimizedRow, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2 whitespace-nowrap">{row.indicator}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.timeframe}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">{formatParams(row.bestParam)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.simulatedTrades}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDuration(row.avgTradeDuration)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{(row.winRate * 100).toFixed(1)}%</td>
                    <td className={`px-4 py-2 whitespace-nowrap font-medium ${row.pnlUsd >= 0 ? "text-success" : "text-danger"}`}>
                      ${row.pnlUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Button size="sm" variant="flat" onPress={() => onCopySetting(row)}>Copy</Button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
