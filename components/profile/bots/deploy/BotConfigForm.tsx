'use client';

import React, { useEffect, useState } from 'react';
import { getData } from "@/actions/get";
import {Select, SelectItem} from "@heroui/react";
import { AccountsResponse, ExchangeAccount } from "@/types/profile/AccountType";
import { SymbolFilterResponse } from "@/types/profile/CurrencyType";
import { addToast } from "@heroui/react";
import { WalletBalance, WalletBalanceResponse } from "@/types/profile/WalletBalanceType";
import { DefaultBotConfigForm } from "@/types/profile/bots/defaultBotConfigForm";

/**
 * Currency represents this symbol list struct
 */
interface Currency {
  _id: string;
  symbol: string;
}

interface BotConfigFormProps {
  onDeploy: (config: DefaultBotConfigForm) => void;
}

export default function BotConfigForm({ onDeploy }: BotConfigFormProps) {
  // form state
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [availableBalance, setAvailableBalance] = useState<number>(0);

  const [baseFund, setBaseFund] = useState(0);
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
  const [symbols, setSymbols] = useState<Currency[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // defaults & options
  const riskStrategyOptions = [
    'KellyCriterionStrategy',
    'MartingaleStrategy',
    'MirroredMartingaleStrategy',
    'SimpleStrategy'
  ];
  const indicatorOptions = [
    'RSI','MACD','MA_Crossover','Donchian','Volume',
    'Heikin_Ashi','Combined_RSI_MACD','Bollinger_Bands','Stochastic_RSI'
  ];
  const timeframeOptions = ['1m','5m','15m','30m','1h','4h','1d','1w'];
  const leverageOptions = Array.from({ length: 100 }, (_, i) => i + 1);

  const defaultStrategyParams: Record<string, object> = {
    RSI: { period: 14, overbought: 70, oversold: 30 },
    MACD: { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 },
    MA_Crossover: { shortPeriod: 5, longPeriod: 20 },
    Donchian: { period: 20 },
    Volume: { period: 14 },
    Heikin_Ashi: {},
    Combined_RSI_MACD: { parameters: { confirmation_window: 6 } },
    Bollinger_Bands: { period: 20, stdDev: 2 },
    Stochastic_RSI: { period: 14, kPeriod: 3, dPeriod: 3 }
  };

  // fetch symbols & accounts on mount
  useEffect(() => {
    (async () => {
      try {
        const currenciesResponse: SymbolFilterResponse = await getData('/currencies')
        if (currenciesResponse.success) {
          setSymbols(currenciesResponse.data)
        } else {
          addToast({
            title: 'Failed to fetch currencies',
            color: "danger",
          });
        }
      } catch {
        addToast({
          title: 'Error fetching currencies !',
          color: "danger",
        });
      }

      try {
        const accountsResponse: AccountsResponse = await getData('/accounts')
        if (accountsResponse.accounts) {
          // accountsResponse.accounts is a map: { exchangeName: accountObj, … }
          console.log(accountsResponse.accounts);
          // turn it into an array, and carry exchange name too if you like
          const accsArray: ExchangeAccount[] = Object.entries(accountsResponse.accounts).map(
            ([exchange, acc]) => ({
              ...acc,
              _id:   acc._id!,
              userId: acc.userId!,
              apiKey: acc.apiKey!,
              secretKey: acc.secretKey!,
              name:  exchange,
              createdAt: acc.createdAt ?? new Date().toISOString(),
              __v: acc.__v ?? 0
            })
          );
          setAccounts(accsArray);
        } else {
          addToast({
            title: 'Failed to fetch currencies',
            color: "danger",
          });
        }
      } catch {
        addToast({
          title: 'Error fetching currencies !',
          color: "danger",
        });
      }
    })();
  }, []);

  // fetch balance when account changes
  async function handleAccountChange(accountId: string) {
    setSelectedAccountId(accountId);
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

  // quick-pick handlers for Trade Fund
  const pickTradeFund = (pct: number) => {
    setTradeFund(pct);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!name.trim()) return setError('Bot name is required.');
    if (!symbol.trim()) return setError('Symbol is required.');

    // format symbol
    let formatted = symbol.toUpperCase();
    if (!formatted.includes('/')) {
      if (formatted.endsWith('USDT')) formatted = formatted.replace(/USDT$/, '/USDT');
      else if (formatted.endsWith('USDC')) formatted = formatted.replace(/USDC$/, '/USDC');
    }

    onDeploy({
      name: name.trim(),
      symbol: formatted,
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
      strategy: indicator,
      strategyParams: defaultStrategyParams[indicator] || {}
    });
  };

  return (
    <div className="p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Deploy New Bot</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account */}
        <div>
          <Select
            className="max-w-xs"
            label="Select an account"
            selectedKeys={[selectedAccountId]}
            onChange={e => handleAccountChange(e.target.value)}
          >
            {accounts.map(acc => {
              return (
                <React.Fragment key={acc.name}>
                  {acc._id &&
                    <SelectItem key={acc._id}>
                      <span className="capitalize">
                        {acc.name}
                      </span>
                    </SelectItem>
                  }
                </React.Fragment>
              )
            })}
          </Select>
        </div>

        {/* Symbol & Balance */}
        <div>
          <label className="block mb-1 font-semibold">Symbol</label>
          <select
            className="w-full p-2 border rounded"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
          >
            {symbols.map(s => (
              <option key={s._id} value={s.symbol}>{s.symbol}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-600">
            Available balance: <strong>{availableBalance.toFixed(2)} USDT</strong>
          </p>
        </div>

        {/* Trade Fund */}
        <div>
          <label className="block mb-1 font-semibold">Trade Fund (%)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            min={0} max={100}
            value={tradeFund}
            onChange={e => setTradeFund(Number(e.target.value))}
            required
          />
          <div className="flex space-x-2 mt-2">
            {[25,50,75,100].map(p => (
              <button
                key={p}
                type="button"
                className="px-3 py-1 rounded"
                onClick={() => pickTradeFund(p)}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div>
          <label className="block mb-1 font-semibold">Leverage</label>
          <select
            className="w-full p-2 border rounded"
            value={leverage}
            onChange={e => setLeverage(Number(e.target.value))}
          >
            {leverageOptions.map(lv => (
              <option key={lv} value={lv}>{lv}x</option>
            ))}
          </select>
        </div>

        {/* Risk Strategy */}
        <div>
          <label className="block mb-1 font-semibold">Risk Strategy</label>
          <select
            className="w-full p-2 border rounded"
            value={riskStrategy}
            onChange={e => setRiskStrategy(e.target.value)}
          >
            {riskStrategyOptions.map(rs => (
              <option key={rs} value={rs}>{rs}</option>
            ))}
          </select>
        </div>

        {/* Compound Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={compoundPositionSizing}
            onChange={e => setCompoundPositionSizing(e.target.checked)}
          />
          <label>Use compound position sizing</label>
        </div>

        {/* Take Profit */}
        <div>
          <label className="block mb-1 font-semibold">Take Profit</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            step="0.01"
            value={takeProfit}
            onChange={e => setTakeProfit(Number(e.target.value))}
            required
          />
        </div>

        {/* Stop Loss */}
        <div>
          <label className="block mb-1 font-semibold">Stop Loss</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            step="0.01"
            value={stopLoss}
            onChange={e => setStopLoss(Number(e.target.value))}
            required
          />
        </div>

        {/* Primary Indicator & Timeframe */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold">Indicator</label>
            <select
              className="w-full p-2 border rounded"
              value={indicator}
              onChange={e => setIndicator(e.target.value)}
            >
              {indicatorOptions.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Timeframe</label>
            <select
              className="w-full p-2 border rounded"
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
            >
              {timeframeOptions.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional Indicators */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold">Additional Indicators</span>
            <button
              type="button"
              className="text-blue-600"
              onClick={() =>
                setAdditionalIndicators([
                  ...additionalIndicators,
                  { indicator: 'RSI', timeframe: '1m' }
                ])
              }
            >+ Add</button>
          </div>
          {additionalIndicators.map((ai, i) => (
            <div key={i} className="grid grid-cols-2 gap-4 mb-2">
              <select
                className="p-2 border rounded"
                value={ai.indicator}
                onChange={e =>
                  setAdditionalIndicators(list => {
                    const nxt = [...list];
                    nxt[i].indicator = e.target.value;
                    return nxt;
                  })
                }
              >
                {indicatorOptions.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <select
                className="p-2 border rounded"
                value={ai.timeframe}
                onChange={e =>
                  setAdditionalIndicators(list => {
                    const nxt = [...list];
                    nxt[i].timeframe = e.target.value;
                    return nxt;
                  })
                }
              >
                {timeframeOptions.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Deploy button */}
        <div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Deploy Bot
          </button>
        </div>
      </form>
    </div>
  );
}
