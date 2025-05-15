'use client';

import React, { FormEvent, Key, useEffect, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  addToast,
  Input,
  Checkbox,
  Button,
} from '@heroui/react';
import { getData } from '@/actions/get';
import { ExchangeAccount, AccountsResponse } from '@/types/profile/AccountType';
import { SymbolFilterResponse } from '@/types/profile/CurrencyType';
import { WalletBalance } from '@/types/profile/WalletBalanceType';
import { sendRequest } from '@/actions/post';
import { BotProps } from '@/types/profile/bots/StrategyParams';
import { DefaultBotConfigForm } from '@/types/profile/bots/defaultBotConfigForm';
import { PlusIcon } from '@/utils/icons';

interface Currency {
  _id: string;
  symbol: string;
}

export interface BotConfigFormProps {
  mode: 'default' | 'optimized' | 'dynamic';
  onCloseAction: () => void;
}

export default function BotConfigForm({ mode, onCloseAction }: BotConfigFormProps) {
  // strategy & indicator metadata
  const [botProps, setBotProps] = useState<BotProps>({
    riskStrategyOptions: [],
    indicatorOptions: [],
    OptMethod: [],
    timeframeOptions: [],
    defaultStrategyParams: {},
  });

  // common form state
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<Key>();
  const [availableBalance, setAvailableBalance] = useState(0);
  const [leverageOptions, setLeverageOptions] = useState<number[]>([]);

  const [baseFund, setBaseFund] = useState(0);
  const [tradeFund, setTradeFund] = useState<string>('50');
  const [leverage, setLeverage] = useState(1);
  const [riskStrategy, setRiskStrategy] = useState<string>('');
  const [compoundSizing, setCompoundSizing] = useState(true);
  const [takeProfit, setTakeProfit] = useState(1.02);
  const [stopLoss, setStopLoss] = useState(0.98);
  const [indicator, setIndicator] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('');
  const [additional, setAdditional] = useState<
    Array<{ indicator: string; timeframe: string }>
  >([]);
  const [symbols, setSymbols] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);

  // optimized-dynamic state
  const [optMethod, setOptMethod] = useState<string>('');
  const [minOptAccuracy, setMinOptAccuracy] = useState(5);
  const [minSimTrades, setMinSimTrades] = useState(5);

  // dynamic‐only state
  const [minBotAccuracy, setMinBotAccuracy] = useState(5);

  // fetch lookups on mount
  useEffect(() => {
    (async () => {
      try {
        const res: SymbolFilterResponse = await getData('/currencies');
        if (!res.success) throw new Error(res.message || 'no data');
        setSymbols(res.data);
      } catch {
        addToast({ title: 'Failed to load symbols', color: 'danger' });
      }
    })();

    (async () => {
      try {
        const res: AccountsResponse = await getData('/accounts');
        if (!res.accounts) throw new Error('no accounts');
        const arr = Object.entries(res.accounts).map(([exchange, acc]) => ({
          ...acc,
          _id: acc._id!,
          userId: acc.userId!,
          apiKey: acc.apiKey!,
          secretKey: acc.secretKey!,
          name: exchange,
          createdAt: acc.createdAt ?? new Date().toISOString(),
          __v: acc.__v ?? 0,
        }));
        setAccounts(arr);
      } catch {
        addToast({ title: 'Failed to load accounts', color: 'danger' });
      }
    })();

    (async () => {
      try {
        const res = await getData('/bots/botProps');
        addToast({
          title: res.toString(),
          color: "danger",
        });
        if (!res.success) {
          addToast({
            title: "Error getting bot parameters",
            color: "danger",
          });
        } else {
          setBotProps(res.props);
          // seed defaults
          setRiskStrategy(res.props.riskStrategyOptions[0] || '');
          setIndicator(res.props.indicatorOptions[0] || '');
          setTimeframe(res.props.timeframeOptions[0] || '');
        }
      } catch {
        addToast({ title: 'Failed to load bot parameters', color: 'danger' });
      }
    })();
  }, []);

  // fetch leverage‐options whenever account or symbol changes
  useEffect(() => {
    if (!selectedAccountId || !symbol) return;
    (async () => {
      try {
        const { success, leverages } = await getData(`/accounts/${selectedAccountId}/leverage-options?symbol=${encodeURIComponent(symbol)}`);
        if (success) {
          setLeverageOptions(leverages);
        } else {
          setLeverageOptions(Array.from({ length: 100 }, (_, i) => i + 1));
        }
      } catch {
        // fallback
        setLeverageOptions(Array.from({ length: 100 }, (_, i) => i + 1));
      }
    })();
  }, [selectedAccountId, symbol]);

  // fetch balance when account changes
  async function handleAccountChange(accountId: Key | null) {
    setSelectedAccountId(accountId?.toString())
    try {
      const getBalance = await getData(`/accounts/${accountId}/balance`);

      if (getBalance.balance) {
        const usdtBal: WalletBalance = getBalance.balance.find((b: WalletBalance) => b.asset === 'USDT');
        const free = usdtBal ? parseFloat(usdtBal.free) : 0;

        setAvailableBalance(free);
        setBaseFund(free);
      } else {
        addToast({
          title: getBalance.error,
          color: "danger",
        });
        setAvailableBalance(0);
        setBaseFund(0);
      }
    } catch {
      addToast({
        title: 'Failed to load balance',
        color: "danger",
      });
      setAvailableBalance(0);
      setBaseFund(0);
    }
  }

  /** POST to deploy */
  const handleDeploy = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const payload: DefaultBotConfigForm = {
      name,
      accountId: selectedAccountId?.toString() || '',
      symbol,
      baseFund,
      tradeFund: parseFloat(tradeFund),
      leverage,
      riskStrategy,
      compoundPositionSizing: compoundSizing,
      takeProfit,
      stopLoss,
      indicator,
      timeframe,
      additionalIndicators: additional,
      strategy: mode,
      strategyParams: botProps.defaultStrategyParams[indicator] || {},
      // optimized extras:
      ...((mode === 'optimized' || mode === 'dynamic') && {
        optimizationMethod: optMethod,
        minOptimizationAccuracy: minOptAccuracy,
      }),
      // dynamic extras:
      ...(mode === 'dynamic' && {
        minSimulatedTrades: minBotAccuracy,
      }),
    };

    // stringify all fields
    const body = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])
    );

    try {
      const res = await sendRequest(body, '/bots/deploy');

      if (res.success) {
        addToast({ title: 'Bot deployed!', color: 'success' });
      } else {
        addToast({ title: res.error || 'Deploy failed', color: 'danger' });
      }
    } catch {
      addToast({ title: 'Error deploying bot !', color: 'danger' });
    } finally {
      setLoading(false);
      onCloseAction()
    }

  };

  return (
    <div className="py-4">
      <form
        className="space-y-4"
        onSubmit={handleDeploy}
      >
        {/* Bot Name */}
        <Input
          label="Bot Name"
          required
          value={name}
          onChange={e => setName(e.target.value)}
        />

        {/* Account */}
        <Autocomplete
          label="Account"
          isClearable={false}
          items={accounts}
          onSelectionChange={(k: Key | null) => handleAccountChange(k)}
        >
          {accounts.map(acc => (
            <AutocompleteItem key={acc._id} textValue={acc.name}>
              {acc.name}
            </AutocompleteItem>
          ))}
        </Autocomplete>

        {/* Symbol */}
        <Autocomplete
          label="Symbol"
          isClearable={false}
          defaultItems={symbols}
          onSelectionChange={k => k && setSymbol(k.toString())}
        >
          {symbols.map(s => (
            <AutocompleteItem key={s.symbol} textValue={s.symbol}>
              {s.symbol}
            </AutocompleteItem>
          ))}
        </Autocomplete>
        <p className="text-sm text-gray-600">
          Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
        </p>

        {/* Trade Fund % */}
        <Input
          label="Trade Fund (%)"
          type="number"
          required
          min={1}
          max={100}
          value={tradeFund}
          onChange={e => setTradeFund(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          {[25, 50, 75, 100].map(p => (
            <button
              key={p}
              type="button"
              className="w-1/4 py-1.5 bg-default-100 text-[14px] rounded-2xl"
              onClick={() => setTradeFund(String(p))}
            >
              {p}%
            </button>
          ))}
        </div>

        {/* Leverage */}
        <Autocomplete
          label="Leverage"
          isClearable={false}
          allowsEmptyCollection={false}
          onSelectionChange={k => k && setLeverage(Number(k.toString()))}
        >
          {leverageOptions.map(lv => (
            <AutocompleteItem key={lv} textValue={`${lv}x`}>
              {lv}x
            </AutocompleteItem>
          ))}
        </Autocomplete>

        {/* Risk Strategy */}
        <Autocomplete
          label="Risk Strategy"
          isClearable={false}
          onSelectionChange={k => k && setRiskStrategy(k.toString())}
        >
          {botProps.riskStrategyOptions.map(rs => (
            <AutocompleteItem key={rs} textValue={rs}>
              {rs}
            </AutocompleteItem>
          ))}
        </Autocomplete>

        {/* Compound sizing */}
        <Checkbox
          defaultSelected={compoundSizing}
          onChange={e => setCompoundSizing(e.target.checked)}
        >
          Use compound position sizing
        </Checkbox>

        {/* TP/SL */}
        <Input
          label="Take Profit"
          type="number"
          step="0.01"
          value={takeProfit.toString()}
          onChange={e => setTakeProfit(Number(e.target.value))}
        />
        <Input
          label="Stop Loss"
          type="number"
          step="0.01"
          value={stopLoss.toString()}
          onChange={e => setStopLoss(Number(e.target.value))}
        />

        {/* Primary Indicator + Timeframe */}
        <div className="grid grid-cols-2 gap-4">
          <Autocomplete
            label="Indicator"
            isClearable={false}
            onSelectionChange={k => k && setIndicator(k.toString())}
          >
            {botProps.indicatorOptions.map(ind => (
              <AutocompleteItem key={ind} textValue={ind}>
                {ind}
              </AutocompleteItem>
            ))}
          </Autocomplete>
          <Autocomplete
            label="Timeframe"
            isClearable={false}
            onSelectionChange={k => k && setTimeframe(k.toString())}
          >
            {botProps.timeframeOptions.map(tf => (
              <AutocompleteItem key={tf} textValue={tf}>
                {tf}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>

        {/* Additional Indicators */}
        {additional.map((ai, i) => (
          <div key={i} className="grid grid-cols-2 gap-4">
            <Autocomplete
              label="Indicator"
              isClearable={false}
              onSelectionChange={k => {
                const nxt = [...additional];
                nxt[i].indicator = k!.toString();
                setAdditional(nxt);
              }}
            >
              {botProps.indicatorOptions.map(ind => (
                <AutocompleteItem key={ind} textValue={ind}>
                  {ind}
                </AutocompleteItem>
              ))}
            </Autocomplete>
            <Autocomplete
              label="Timeframe"
              isClearable={false}
              onSelectionChange={k => {
                const nxt = [...additional];
                nxt[i].timeframe = k!.toString();
                setAdditional(nxt);
              }}
            >
              {botProps.timeframeOptions.map(tf => (
                <AutocompleteItem key={tf} textValue={tf}>
                  {tf}
                </AutocompleteItem>
              ))}
            </Autocomplete>
          </div>
        ))}

        <button
          className="flex items-center gap-3"
          type="button"
          onClick={() =>
            setAdditional([...additional, { indicator: 'RSI', timeframe: '1m' }])
          }
        >
          <div className="rounded-full w-6 h-6 bg-default-100 flex items-center justify-center my-4">
            <PlusIcon strokeWidth={'2.5'} />
          </div>
          <span className="text-[14px]">Add Indicator</span>
        </button>

        {/* optimized-only fields */}
        {(mode === 'optimized' || mode === 'dynamic') && (
          <>
            <Autocomplete
              label="Optimization Method"
              isClearable={false}
              required
              onSelectionChange={k => k && setOptMethod(k.toString())}
            >
              {botProps.OptMethod.map(m => (
                <AutocompleteItem key={m} textValue={m}>
                  <span className="capitalize">{m}</span>
                </AutocompleteItem>
              ))}
            </Autocomplete>

            <Input
              label="Minimum optimization accuracy (%)"
              type="number"
              min={1}
              step={1}
              value={minOptAccuracy.toString()}
              required
              onChange={(e) => setMinOptAccuracy(Number(e.target.value))}
            />

            <Input
              label="Minimum simulated trades"
              type="number"
              min={1}
              value={minSimTrades.toString()}
              required
              onChange={(e) => setMinSimTrades(Number(e.target.value))}
            />
          </>
        )}

        {/* --- dynamic-only block --- */}
        {mode === 'dynamic' && (
          <>
            <Input
              label="Minimum bot accuracy (%)"
              type="number"
              min={1}
              required
              value={minBotAccuracy.toString()}
              onChange={(e) => setMinBotAccuracy(Number(e.target.value))}
            />
          </>
        )}

        {/* submit */}
        <Button
          className="w-full px-4 dark:bg-white dark:hover:bg-gray-200 transition-all duration-300 dark:text-black font-semibold rounded-2xl text-[14px] py-3"
          disabled={loading}
          isLoading={loading}
          type="submit"
        >
          {mode === 'optimized' ? 'Optimize & Deploy' : 'Start a Bot'}
        </Button>
      </form>
    </div>
  );
}
