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
import {SymbolFilter, SymbolFilterResponse} from '@/types/profile/CurrencyType';
import { RawBalanceResponse } from "@/types/profile/WalletBalanceType";
import { sendRequest } from '@/actions/post';
import { BotProps } from '@/types/profile/bots/StrategyParams';
import { DefaultBotConfigForm } from '@/types/profile/bots/defaultBotConfigForm';
import { PlusIcon } from '@/utils/icons';
import LabelTag from "@/components/shared/ui/Label";

export interface BotConfigFormProps {
  mode: 'default' | 'optimized' | 'dynamic';
  selectedParentTab: string;
  onCloseAction: () => void;
}

export default function BotConfigForm({ mode, selectedParentTab, onCloseAction }: BotConfigFormProps) {
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
  const [symbols, setSymbols] = useState<SymbolFilter[]>([]);
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

        if (!res.success) {
          addToast({ title: res.message || 'No currency symbols found !', color: "danger" })
        } else {
          setSymbols(res.data);
        }
      } catch {
        addToast({ title: 'Failed to load symbols', color: 'danger' });
      }
    })();

    (async () => {
      try {
        const res: AccountsResponse = await getData('/accounts');

        if (!res.accounts) {
          addToast({ title: 'No accounts found !', color: 'danger' });

          return;
        }
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
      const getBalance: RawBalanceResponse = await getData(`/accounts/${accountId}/balance?accountType=${selectedParentTab}`);

      if (!getBalance.success) {
        addToast({
          title: getBalance.error,
          color: "danger"
        })

        return
      }

      const spotEntry = selectedParentTab === 'spot' ? getBalance.data.find(b => b.accountType === 'spot') : getBalance.data.find(b => b.accountType === 'futures');
      const freeAmount = parseFloat(spotEntry?.usdtBalance ?? '0');

      setAvailableBalance(freeAmount);
      setBaseFund(freeAmount);
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
        className="space-y-4 overflow-x-hidden"
        onSubmit={handleDeploy}
      >
        {/* Bot Name */}
        <div className="space-y-2">
          <LabelTag id="botName" title="Bot Name" />
          <Input
            required
            className="mt-0"
            id="botName"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Account */}
        <div className="space-y-2">
          <LabelTag id="account" title="account" />
          <Autocomplete
            id="account"
            isClearable={false}
            items={accounts}
            onSelectionChange={(k: Key | null) => handleAccountChange(k)}
          >
            {accounts.map((acc, index) => (
              <React.Fragment key={index}>
                {acc._id &&
                  <AutocompleteItem key={acc._id} textValue={acc.name}>
                    {acc.name}
                  </AutocompleteItem>
                }
              </React.Fragment>
            ))}
          </Autocomplete>
        </div>

        {/* Symbol */}
        <div className="space-y-2">
          <LabelTag id="symbol" title="Symbol" />
          <Autocomplete
            defaultItems={symbols}
            id="symbol"
            isClearable={false}
            onSelectionChange={k => k && setSymbol(k.toString())}
          >
            {symbols.map(s => (
              <AutocompleteItem key={s.id} textValue={s.symbol}>
                {s.symbol}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>
        <p className="text-sm text-gray-600">
          Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
        </p>

        {/* Trade Fund % */}
        <div className="space-y-2">
          <LabelTag id="tradeFund" title="Trade Fund (%)" />
          <Input
            required
            id="tradeFund"
            max={100}
            min={1}
            type="number"
            value={tradeFund}
            onChange={e => setTradeFund(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            {[25, 50, 75, 100].map(p => (
              <button
                key={p}
                className="w-1/4 h-[30px] bg-default-100 rounded-xl text-sm"
                type="button"
                onClick={() => setTradeFund(String(p))}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div className="space-y-2">
          <LabelTag id="leverage" title="Leverage" />
          <Autocomplete
            allowsEmptyCollection={false}
            id="leverage"
            isClearable={false}
            onSelectionChange={k => k && setLeverage(Number(k.toString()))}
          >
            {leverageOptions.map(lv => (
              <AutocompleteItem key={lv} textValue={`${lv}x`}>
                {lv}x
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>

        {/* Risk Strategy */}
        <div className="space-y-2">
          <LabelTag id="riskStrategy" title="Risk Strategy" />
          <Autocomplete
            id="riskStrategy"
            isClearable={false}
            onSelectionChange={k => k && setRiskStrategy(k.toString())}
          >
            {botProps.riskStrategyOptions.map(rs => (
              <AutocompleteItem key={rs} textValue={rs}>
                {rs}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>

        {/* Compound sizing */}
        <Checkbox
          defaultSelected={compoundSizing}
          onChange={e => setCompoundSizing(e.target.checked)}
        >
          Use compound position sizing
        </Checkbox>

        {/* TP/SL */}
        <div className="space-y-2">
          <LabelTag id="takeProfit" title="Take Profit" />
          <Input
            id="takeProfit"
            step="0.01"
            type="number"
            value={takeProfit.toString()}
            onChange={e => setTakeProfit(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <LabelTag id="stopLoss" title="Stop Loss" />
          <Input
            id="stopLoss"
            step="0.01"
            type="number"
            value={stopLoss.toString()}
            onChange={e => setStopLoss(Number(e.target.value))}
          />
        </div>

        {/* Primary Indicator + Timeframe */}
        <div className="flex items-center gap-4">
          <div className="space-y-2 flex flex-col w-2/3">
            <LabelTag id="indicator" title="Indicator" />
            <Autocomplete
              id="indicator"
              isClearable={false}
              onSelectionChange={k => k && setIndicator(k.toString())}
            >
              {botProps.indicatorOptions.map(ind => (
                <AutocompleteItem key={ind} textValue={ind}>
                  {ind}
                </AutocompleteItem>
              ))}
            </Autocomplete>
          </div>
          <div className="space-y-2 flex flex-col w-1/3">
            <LabelTag id="timeframe" title="Timeframe" />
            <Autocomplete
              id="Timeframe"
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
        </div>

        {/* Additional Indicators */}
        {additional.map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="space-y-2 flex flex-col w-2/3">
              <LabelTag id={`indicator${i}`} title="Indicator" />
              <Autocomplete
                id={`indicator${i}`}
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
            </div>
            <div className="space-y-2 flex flex-col w-1/3">
              <LabelTag id={`timeframe${i}`} title="Timeframe" />
              <Autocomplete
                id={`timeframe${i}`}
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
            <div className="space-y-2">
              <LabelTag id="optimizationMethod" title="Optimization Method" />
              <Autocomplete
                required
                id="optimizationMethod"
                isClearable={false}
                onSelectionChange={k => k && setOptMethod(k.toString())}
              >
                {botProps.OptMethod.map(m => (
                  <AutocompleteItem key={m} textValue={m}>
                    <span className="capitalize">{m}</span>
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            </div>

            <div className="space-y-2">
              <LabelTag id="minimumOptimizationAccuracy" title="Minimum optimization accuracy (%)" />
              <Input
                required
                id="minimumOptimizationAccuracy"
                min={1}
                step={1}
                type="number"
                value={minOptAccuracy.toString()}
                onChange={(e) => setMinOptAccuracy(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <LabelTag id="minimumSimulatedTrades" title="Minimum Simulated Trades" />
              <Input
                required
                id="minimumSimulatedTrades"
                min={1}
                type="number"
                value={minSimTrades.toString()}
                onChange={(e) => setMinSimTrades(Number(e.target.value))}
              />
            </div>
          </>
        )}

        {/* --- dynamic-only block --- */}
        {mode === 'dynamic' && (
          <div className="space-y-2">
            <LabelTag id="minimumBotAccuracy" title="Minimum bot accuracy (%)" />
            <Input
              required
              id="minimumBotAccuracy"
              min={1}
              type="number"
              value={minBotAccuracy.toString()}
              onChange={(e) => setMinBotAccuracy(Number(e.target.value))}
            />
          </div>
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
