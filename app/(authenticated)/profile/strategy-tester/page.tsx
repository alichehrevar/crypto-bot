'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import {
  Autocomplete,
  AutocompleteItem,
  Input,
  Button,
  Switch, RadioGroup, Radio, DateRangePicker, RangeValue, DateValue
} from "@heroui/react";
import { getData } from '@/actions/get';
import { sendRequest } from '@/actions/post';
import type { BotProps } from '@/types/profile/bots/StrategyParams';
import { parseDate } from "@internationalized/date";
import { XIcon } from "@/utils/icons";
import LiveCandlestickChart from "@/components/shared/charts/LiveCandlestickChart";

interface IndicatorPair {
  indicator: string;
  timeframe: string;
}

export default function StrategyTesterPage() {
  //
  // ─── LOOKUPS & STATE ──────────────────────────────────────────────────────
  //
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');

  const [botProps, setBotProps] = useState<BotProps>({
    riskStrategyOptions: [],
    indicatorOptions: [],
    OptMethod: [],
    timeframeOptions: [],
    defaultStrategyParams: {},
  });

  // Date selection
  const [useRecent, setUseRecent] = useState<string>('recent-candles');
  const [recentCount, setRecentCount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeValue, setDateRangeValue] = React.useState<RangeValue<DateValue> | null>({
    start: parseDate("2024-04-01"),
    end: parseDate("2024-04-08"),
  });

  // Indicators / timeframes
  const [indicators, setIndicators] = useState<IndicatorPair[]>([
    { indicator: '', timeframe: '' },
  ]);

  // Optimize toggle + fields
  const [optimize, setOptimize] = useState(false);
  const [optMethod, setOptMethod] = useState<'grid'|'bayesian'|'ann'>('grid');
  const [minAccuracy, setMinAccuracy] = useState('5');
  const [minTrades, setMinTrades] = useState('10');

  // Risk toggle + fields
  const [useRisk, setUseRisk] = useState(false);
  const [investment, setInvestment] = useState('1000');
  const [leverage, setLeverage] = useState('1');
  const [takeProfit, setTakeProfit] = useState('5');
  const [stopLoss, setStopLoss] = useState('5');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  //
  // ─── FETCH SYMBOLS & BOT PROPS ────────────────────────────────────────────
  //
  useEffect(() => {
    getData('/currencies')
      .then(res => {
        if (res.success) setSymbols(res.data.map((c:any)=>c.symbol));
      })
      .catch(()=>{});
    getData('/bots/botProps')
      .then(res => {
        if (res.success) setBotProps(res.props);
      })
      .catch(()=>{});
  }, []);

  //
  // ─── HANDLERS ──────────────────────────────────────────────────────────────
  //
  const addIndicatorRow = () => {
    setIndicators(prev => [...prev, { indicator: '', timeframe: '' }]);
  };
  const removeIndicatorRow = (i:number) => {
    if (indicators.length>1) {
      setIndicators(prev=>prev.filter((_,idx)=>idx!==i));
    }
  };
  const updateIndicator = (i:number,val:string) => {
    setIndicators(prev=>{
      const c=[...prev]; c[i].indicator=val; return c;
    });
  };
  const updateTimeframe = (i:number,val:string) => {
    setIndicators(prev=>{
      const c=[...prev]; c[i].timeframe=val; return c;
    });
  };

  const handleSubmit = async (e:FormEvent) => {
    e.preventDefault();
    setError('');
    // basic validations...
    if (!selectedSymbol) return setError('Symbol required');
    for (let i=0;i<indicators.length;i++){
      if (!indicators[i].indicator||!indicators[i].timeframe){
        return setError(`Indicator #${i+1} and timeframe required`);
      }
    }
    if (useRecent){
      if (isNaN(+recentCount)||+recentCount<1) return setError('Recent candles must be ≥1');
    } else {
      if (!startDate||!endDate) return setError('Start and end date required');
      if (new Date(startDate)>=new Date(endDate)) return setError('Start must be before end');
    }
    if (optimize){
      if (isNaN(+minAccuracy)||+minAccuracy<0) return setError('Min accuracy ≥0');
      if (isNaN(+minTrades)||+minTrades<1) return setError('Min trades ≥1');
    }
    if (useRisk){
      if (isNaN(+investment)||+investment<=0) return setError('Investment >0');
      if (isNaN(+leverage)||+leverage<1) return setError('Leverage ≥1');
      if (isNaN(+takeProfit)||+takeProfit<0) return setError('TP ≥0');
      if (isNaN(+stopLoss)||+stopLoss<0) return setError('SL ≥0');
    }

    const payload:any = {
      symbol: selectedSymbol,
      mode: useRecent?'recent':'range',
      recentCount: useRecent?+recentCount:undefined,
      startDate: useRecent?undefined:startDate,
      endDate:   useRecent?undefined:endDate,
      indicators,
      optimize,
      optimizationMethod: optimize?optMethod:undefined,
      minAccuracy: optimize?+minAccuracy:undefined,
      minTrades: optimize?+minTrades:undefined,
      risk: useRisk?{
        investment:+investment,
        leverage:+leverage,
        takeProfitPct:+takeProfit,
        stopLossPct:+stopLoss
      }:undefined
    };

    setLoading(true);
    try {
      const body = Object.fromEntries(Object.entries(payload).map(
        ([k,v])=>[k,typeof v==='object'?JSON.stringify(v):String(v||'')]
      ));
      const res = await sendRequest(body,'/backtest/run');
      if (!res.success) setError(res.error||'Backtest failed');
      else console.log('backtest result',res.data);
    } catch {
      setError('Error running backtest');
    } finally {
      setLoading(false);
    }
  };

  //
  // ─── RENDER ────────────────────────────────────────────────────────────────
  //
  return (
    <div className="container mt-4 relative px-5 backtester-page">
      <div className="w-full flex items-start justify-center flex-col gap-6">
        <div className="flex items-center justify-between w-full border-b-1 border-default-200 pb-4">
          <Autocomplete
            id="symbol"
            variant="underlined"
            labelPlacement="outside-left"
            isClearable={false}
            onSelectionChange={v=>v&&setSelectedSymbol(v.toString())}
            selectedKey={selectedSymbol}
            className="w-auto"
          >
            {symbols.map(s=>(
              <AutocompleteItem key={s} textValue={s}>{s}</AutocompleteItem>
            ))}
          </Autocomplete>
          {/* Data Range */}
          <fieldset className="space-y-2 w-[30%]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start">
                <RadioGroup
                  size="sm"
                  color="default"
                  value={useRecent}
                  onValueChange={setUseRecent}
                  classNames={{
                    wrapper: 'flex flex-col gap-8'
                  }}
                >
                  <Radio value="recent-candles" className="text-nowrap">Recent candles</Radio>
                  <Radio value="time-range">Time Range</Radio>
                </RadioGroup>
              </div>

              <div className="flex items-start justify-center flex-col space-y-2">
                <Input
                  className="w-full"
                  type="number"
                  min={1}
                  step={1}
                  value={recentCount}
                  onChange={(e) => setRecentCount(e.target.value)}
                  disabled={useRecent !== 'recent-candles'}
                  label={null}
                  placeholder="Candles Count"
                />
                <DateRangePicker
                  color="default"
                  size="md"
                  isDisabled={useRecent === 'recent-candles'}
                  label=""
                  value={dateRangeValue} onChange={setDateRangeValue}
                />
              </div>
            </div>
          </fieldset>
        </div>
        <div className="w-full flex items-start justify-center gap-6">
          {/* ── LEFT: Chart + Symbol Selector ───────────────────── */}
          <div className="w-[70%] p-4">

            <div className="mt-4 h-[calc(100%-4rem)] bg-black rounded">
              <LiveCandlestickChart symbol="BTCUSDT" interval="1m" />
            </div>
          </div>

          {/* ── RIGHT: Form ────────────────────────────────────────── */}
          <div className="w-[30%] p-4 bg-default-50 rounded-2xl text-white overflow-auto h-full">
            {error && <p className="mb-4 text-red-400">{error}</p>}
            <form className="space-y-6" onSubmit={handleSubmit}>

              {/* Indicators */}
              <div className="space-y-2">
                <p className="font-medium">Indicators</p>
                {indicators.map((row,i)=>(
                  <div key={i} className="flex items-center space-x-2">
                    <Autocomplete
                      id={`ind-${i}`}
                      label="Indicator"
                      selectedKey={row.indicator}
                      onSelectionChange={v=>updateIndicator(i, v as string)}
                      className="flex-1"
                    >
                      {botProps.indicatorOptions.map(ind=>(
                        <AutocompleteItem key={ind} textValue={ind}>{ind}</AutocompleteItem>
                      ))}
                    </Autocomplete>
                    <Autocomplete
                      id={`tf-${i}`}
                      label="Timeframe"
                      isClearable={false}
                      selectedKey={row.timeframe}
                      onSelectionChange={v=>updateTimeframe(i, v as string)}
                      className="w-24"
                    >
                      {botProps.timeframeOptions.map(tf=>(
                        <AutocompleteItem key={tf} textValue={tf}>{tf}</AutocompleteItem>
                      ))}
                    </Autocomplete>
                    {indicators.length > 1 && (
                      <button
                        type="button"
                        onClick={()=>removeIndicatorRow(i)}
                        className="text-red-500 text-sm"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIndicatorRow}
                  className="text-blue-400 text-sm"
                >
                  + Add Indicator
                </button>
              </div>

              {/* Optimize */}
              <div>
                <div className="flex justify-between items-center">
                  <p className="font-medium">Optimize parameters</p>
                  <Switch
                    isSelected={optimize}
                    onValueChange={setOptimize}
                    color="success"
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 mt-4">
                  {['grid','bayesian','ann'].map(m=>(
                    <button
                      key={m}
                      type="button"
                      disabled={!optimize}
                      onClick={()=>setOptMethod(m as any)}
                      className={`px-3 py-3 w-[33%] text-[13px] font-bold rounded-xl border-1 bg-default-100 text-white ${
                        optMethod === m ? 'border-primary' : 'border-default-100'
                      }`}
                    >
                      {m.charAt(0).toUpperCase()+m.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex space-x-2 mt-2">
                  <Input
                    label="Min Accuracy (%)"
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={!optimize}
                    value={minAccuracy}
                    onChange={e=>setMinAccuracy(e.target.value)}
                    required
                  />
                  <Input
                    label="Min Trades"
                    type="number"
                    min={1}
                    step={1}
                    disabled={!optimize}
                    value={minTrades}
                    onChange={e=>setMinTrades(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Risk */}
              <div>
                <div className="flex justify-between items-center">
                  <p className="font-medium">Risk parameters</p>
                  <Switch
                    isSelected={useRisk}
                    onValueChange={setUseRisk}
                    color="success"
                    size="sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Input
                    label="Investment"
                    type="number"
                    min={0.01}
                    step={0.01}
                    disabled={!useRisk}
                    value={investment}
                    onChange={e=>setInvestment(e.target.value)}
                  />
                  <Input
                    label="Leverage"
                    type="number"
                    min={1}
                    step={1}
                    disabled={!useRisk}
                    value={leverage}
                    onChange={e=>setLeverage(e.target.value)}
                  />
                  <Input
                    label="Take Profit (%)"
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={!useRisk}
                    value={takeProfit}
                    onChange={e=>setTakeProfit(e.target.value)}
                  />
                  <Input
                    label="Stop Loss (%)"
                    type="number"
                    min={0}
                    step={0.1}
                    disabled={!useRisk}
                    value={stopLoss}
                    onChange={e=> setStopLoss(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full bg-white text-black font-bold rounded-xl h-[45px]"
                type="submit"
                isLoading={loading}
                disabled={loading}
              >
                Start Backtester
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
