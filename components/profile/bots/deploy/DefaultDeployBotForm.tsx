'use client';

import React, { Key, useEffect, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  addToast,
  Input,
  Checkbox, Button
} from "@heroui/react";

import { getData } from "@/actions/get";
import { AccountsResponse, ExchangeAccount } from "@/types/profile/AccountType";
import { SymbolFilterResponse } from "@/types/profile/CurrencyType";
import { WalletBalance } from "@/types/profile/WalletBalanceType";
import { DefaultBotConfigForm } from "@/types/profile/bots/defaultBotConfigForm";
import { PlusIcon } from "@/utils/icons";
import { sendRequest } from "@/actions/post";
import { BotProps } from "@/types/profile/bots/StrategyParams";

/**
 * Currency represents this symbol list struct
 */
interface Currency {
  _id: string;
  symbol: string;
}

export default function DefaultDeployBotForm(props: {onOpenChange: () => void}) {

  // strategy & indicator metadata
  const [botProps, setBotProps] = useState<BotProps>({
    riskStrategyOptions: [],
    indicatorOptions: [],
    OptMethod: [],
    timeframeOptions: [],
    defaultStrategyParams: {}
  });

  // form state
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<Key>();
  const [availableBalance, setAvailableBalance] = useState<number>(0);

  const [baseFund, setBaseFund] = useState(0);
  const [tradeFund, setTradeFund] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(1);
  const [leverageOptions, setLeverageOptions] = useState<number[]>([]);
  const [riskStrategy, setRiskStrategy] = useState<string>('KellyCriterionStrategy');
  const [compoundPositionSizing, setCompoundPositionSizing] = useState(true);
  const [takeProfit, setTakeProfit] = useState(1.02);
  const [stopLoss, setStopLoss] = useState(0.98);
  const [indicator, setIndicator] = useState<string>('RSI');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [additionalIndicators, setAdditionalIndicators] = useState<
    Array<{ indicator: string; timeframe: string }>
  >([]);
  const [symbols, setSymbols] = useState<Currency[]>([]);
  const [loading, setLoading] = useState<boolean>(false)

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
    (async () => {
      try {
        const botPropsResponse = await getData('/bots/botProps');
        if (botPropsResponse.success) {
          setBotProps(botPropsResponse.props);
        } else {
          addToast({
            title: 'Failed to load bot properties',
            color: "danger",
          });
        }
      } catch {
        addToast({
          title: 'Error fetching bot properties',
          color: "danger",
        });
      }
    })()
  }, []);

  // whenever account or symbol changes, fetch leverage‐options
  useEffect(() => {
    if (!selectedAccountId || !symbol) return;
    (async () => {
      try {
        console.log(selectedAccountId)
        const url = `/accounts/${selectedAccountId}/leverage-options?symbol=${encodeURIComponent(
          symbol
        )}`;
        const { success, leverages } = await getData(url);
        if (success) {
          setLeverageOptions(leverages)
        } else {
          addToast({
            title: "No Leverage",
            color: "danger",
          });
        }
      } catch {
        // fallback 1–100
        setLeverageOptions(Array.from({ length: 100 }, (_, i) => i + 1));
      }
    })();
  }, [selectedAccountId, symbol]);

  // Handler for bot deployment.
  const handleBotDeploy = async (config: DefaultBotConfigForm) => {

    // Convert config to a valid `{ [key: string]: string | File }` object
    const stringifierConfig: { [key: string]: string } = {
      ...Object.fromEntries(
        Object.entries(config).map(([key, value]) => [
          key,
          typeof value === 'object' ? JSON.stringify(value) : String(value)
        ])
      )
    };

    return await sendRequest(stringifierConfig, '/bots/deploy');
  };

  // fetch balance when account changes
  async function handleAccountChange(accountId: Key | null) {
    setSelectedAccountId(accountId || 0);
    console.log(accountId)
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
    setTradeFund(pct.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast({
        title: 'Bot name is required',
        color: "warning",
      });
    }
    if (!symbol.trim()) {
      addToast({
        title: 'Symbol is required',
        color: "warning",
      });
    }

    // format symbol
    let formatted = symbol.toUpperCase();

    if (!formatted.includes('/')) {
      if (formatted.endsWith('USDT')) formatted = formatted.replace(/USDT$/, '/USDT');
      else if (formatted.endsWith('USDC')) formatted = formatted.replace(/USDC$/, '/USDC');
    }

    setLoading(true)
    handleBotDeploy({
      name: name.trim(),
      accountId: selectedAccountId?.toString() ?? '0',
      symbol: formatted,
      baseFund,
      tradeFund: parseFloat(tradeFund),
      leverage,
      riskStrategy,
      compoundPositionSizing,
      takeProfit,
      stopLoss,
      indicator,
      timeframe,
      additionalIndicators,
      strategy: indicator,
      strategyParams: botProps.defaultStrategyParams[indicator] || {}
    })
      .then((response) => {
        if (response.success) {
          addToast({
            title: "Bot deployed successfully",
            color: "success",
          });
          props.onOpenChange()
        } else {
          addToast({
            title: response.error || 'Failed to deploy bot',
            description: 'Try again later !',
            color: "danger",
          });
        }
      }).catch(() => {
        addToast({
          title: "An unexpected error occurred while deploying the bot",
          description: 'Try again later !',
          color: "danger",
        });
      })
      .finally(() => {
        setLoading(false)
      });
  };

  return (
    <div className="py-4">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Account */}
        <div>
          <Input
            required
            className="mb-4"
            label="Bot Name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Autocomplete
            isClearable={false}
            items={accounts}
            label="Account"
            placeholder="Select an account"
            onSelectionChange={(selectedKey: Key | null) => handleAccountChange(selectedKey)}
          >
            {accounts.map((acc, index) => {
              return (
                <React.Fragment key={index}>
                  {acc._id &&
                    <AutocompleteItem key={acc._id} className="capitalize" textValue={acc.name}>
                      <span className="capitalize">
                        {acc.name}
                      </span>
                    </AutocompleteItem>
                  }
                </React.Fragment>
              )
            })}
          </Autocomplete>
        </div>

        {/* Symbol & Balance */}
        <div>
          <Autocomplete
            defaultItems={symbols}
            isClearable={false}
            label="Symbol"
            placeholder="Select a symbol"
            onSelectionChange={(e) => e !== null ? setSymbol(e.toString()) : 'BTC/USDT'}
          >
            {symbols.map((s, index) => {
              return (
                <React.Fragment key={index}>
                  {s._id &&
                    <AutocompleteItem key={s.symbol} className="capitalize" textValue={s.symbol}>
                      <span className="capitalize">
                        {s.symbol}
                      </span>
                    </AutocompleteItem>
                  }
                </React.Fragment>
              )
            })}
          </Autocomplete>
          <p className="mt-1 text-sm text-gray-600">
            Available balance: <strong>{availableBalance.toFixed(2)} USDT</strong>
          </p>
        </div>

        {/* Trade Fund */}
        <div>
          <Input
            required
            label="Trade Fund (%)"
            maxLength={100}
            minLength={1}
            type="number"
            value={tradeFund}
            onChange={e => setTradeFund(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2 gap-3">
            {[25,50,75,100].map(p => (
              <button
                key={p}
                className="w-1/4 py-2 rounded-2xl bg-default-100 text-[13px]"
                type="button"
                onClick={() => pickTradeFund(p)}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div>
          <Autocomplete
            allowsEmptyCollection={false}
            isClearable={false}
            label="Leverage"
            onSelectionChange={e => e !== null ? setLeverage(Number(e.toString())) : 1}
          >
            {leverageOptions.map((lv) => {
              return (
                <AutocompleteItem key={lv} className="capitalize" textValue={lv.toString() + 'x'}>
                  {lv}x
                </AutocompleteItem>
              )
            })}
          </Autocomplete>
        </div>

        {/* Risk Strategy */}
        <div>
          <Autocomplete
            isClearable={false}
            label="Risk Strategy"
            onSelectionChange={e => e !== null ? setRiskStrategy(e.toString()) : 'KellyCriterionStrategy'}
          >
            {botProps.riskStrategyOptions.map((rs: string) => {
              return (
                <AutocompleteItem key={rs} className="capitalize" textValue={rs}>
                  {rs}
                </AutocompleteItem>
              )
            })}
          </Autocomplete>
        </div>

        {/* Compound Toggle */}
        <div className="flex items-center">
          <Checkbox
            defaultSelected
            color="primary"
            onChange={e => setCompoundPositionSizing(e.target.checked)}
          >
            Use compound position sizing
          </Checkbox>
        </div>

        {/* Take Profit */}
        <div>
          <Input
            defaultValue={takeProfit.toString()}
            label="Take Profit"
            step={0.01}
            type="number"
            onChange={e => setTakeProfit(Number(e.target.value))}
          />
        </div>

        {/* Stop Loss */}
        <div>
          <Input
            defaultValue={stopLoss.toString()}
            label="Stop Loss"
            step={0.01}
            type="number"
            onChange={e => setStopLoss(Number(e.target.value))}
          />
        </div>

        {/* Primary Indicator & Timeframe */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Autocomplete
              isClearable={false}
              label="Indicator"
              onSelectionChange={e => e !== null ? setIndicator(e.toString()) : 'RSI'}
            >
              {botProps.indicatorOptions.map((ind: string) => {
                return (
                  <AutocompleteItem key={ind} className="capitalize" textValue={ind}>
                    {ind}
                  </AutocompleteItem>
                )
              })}
            </Autocomplete>
          </div>
          <div>
            <Autocomplete
              isClearable={false}
              label="Timeframe"
              onSelectionChange={e => e !== null ? setTimeframe(e.toString()) : '1h'}
            >
              {botProps.timeframeOptions.map((tf: string) => {
                return (
                  <AutocompleteItem key={tf} className="capitalize" textValue={tf}>
                    {tf}
                  </AutocompleteItem>
                )
              })}
            </Autocomplete>
          </div>
        </div>

        {/* Additional Indicators */}
        <div>
          {additionalIndicators.map((ai, i) => (
            <div key={i} className="grid grid-cols-2 gap-4 mb-4">
              <Autocomplete
                isClearable={false}
                label="Indicator"
                onChange={e =>
                  setAdditionalIndicators(list => {
                    const nxt = [...list];

                    nxt[i].indicator = e.target.value;

                    return nxt;
                  })
                }
              >
                {botProps.indicatorOptions.map((ind: string) => {
                  return (
                    <AutocompleteItem key={ind} className="capitalize" textValue={ind}>
                      {ind}
                    </AutocompleteItem>
                  )
                })}
              </Autocomplete>
              <Autocomplete
                isClearable={false}
                label="Timeframe"
                onChange={e =>
                  setAdditionalIndicators(list => {
                    const nxt = [...list];

                    nxt[i].timeframe = e.target.value;

                    return nxt;
                  })
                }
              >
                {botProps.timeframeOptions.map((tf: string) => {
                  return (
                    <AutocompleteItem key={tf} className="capitalize" textValue={tf}>
                      {tf}
                    </AutocompleteItem>
                  )
                })}
              </Autocomplete>
            </div>
          ))}
          <div className="flex justify-between items-center mb-2">
            <button
              className="flex items-center gap-3"
              type="button"
              onClick={() =>
                setAdditionalIndicators([
                  ...additionalIndicators,
                  { indicator: 'RSI', timeframe: '1m' }
                ])
              }
            >
              <div className="rounded-full w-6 h-6 bg-default-100 flex items-center justify-center my-4">
                <PlusIcon strokeWidth={'2.5'} />
              </div>
              <span className="text-[14px]">Add Indicator</span>
            </button>
          </div>
        </div>

        {/* Deploy button */}
        <div>
          <Button
            className="w-full px-4 dark:bg-white dark:hover:bg-gray-200 transition-all duration-300 dark:text-black font-semibold rounded-2xl text-[14px] py-3"
            disabled={loading}
            isLoading={loading}
            type="submit"
          >
            Start a Bot
          </Button>
        </div>
      </form>
    </div>
  );
}
