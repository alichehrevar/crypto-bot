'use client';

import React, {FormEvent, Key, useEffect, useState} from "react";
import {
    addToast,
    Checkbox,
    Button,
} from '@heroui/react';

import Input from '@/components/shared/ui/Input'
import {getData} from '@/actions/get';
import {ExchangeAccount, AccountsResponse} from '@/types/profile/AccountType';
import {SymbolFilter, SymbolFilterResponse} from '@/types/profile/CurrencyType';
import {RawBalanceResponse} from "@/types/profile/WalletBalanceType";
import {sendRequest} from '@/actions/post';
import {BotProps} from '@/types/profile/bots/StrategyParams';
import LabelTag from "@/components/shared/ui/Label";
import NumericInput from "@/components/shared/ui/NumericInput";
import Combobox from "@/components/shared/ui/Combobox";
import IndicatorsSection, {IndicatorItem} from "@/components/shared/ui/IndicatorsSection";
import {MAIN_INDICATOR_OPTIONS, STANDARD_INDICATOR_OPTIONS} from "@/utils/strategyPanelData";
import SecurityIndicator from "@/components/shared/ui/SecurityIndicator";
import Slider from "@/components/shared/ui/Slider";
import SearchableCombobox from "@/components/shared/ui/SearchableCombobox";

export interface BotConfigFormProps {
    mode: 'default' | 'optimized' | 'dynamic';
    selectedParentTab: string;
    onCloseAction: () => void;
}

export default function BotConfigForm({mode, selectedParentTab, onCloseAction}: BotConfigFormProps) {
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
    const [selectedAccountId, setSelectedAccountId] = useState<string>();
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
    const [selectedIndicators, setSelectedIndicators] = useState<IndicatorItem[]>([]);
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
                    addToast({title: res.message || 'No currency symbols found !', color: "danger"})
                } else {
                    setSymbols(res.data);
                }
            } catch {
                addToast({title: 'Failed to load symbols', color: 'danger'});
            }
        })();

        (async () => {
            try {
                const res: AccountsResponse = await getData('/accounts');

                if (!res.accounts) {
                    addToast({title: 'No accounts found !', color: 'danger'});

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
                addToast({title: 'Failed to load accounts', color: 'danger'});
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
                }
            } catch {
                addToast({title: 'Failed to load bot parameters', color: 'danger'});
            }
        })();
    }, []);

    // fetch leverage‐options whenever account or symbol changes
    useEffect(() => {
        if (!selectedAccountId || !symbol) return;
        (async () => {
            try {
                const {
                    success,
                    leverages
                } = await getData(`/accounts/${selectedAccountId}/leverage-options?symbol=${encodeURIComponent(symbol)}`);

                if (success) {
                    setLeverageOptions(leverages);
                } else {
                    setLeverageOptions(Array.from({length: 100}, (_, i) => i + 1));
                }
            } catch {
                // fallback
                setLeverageOptions(Array.from({length: 100}, (_, i) => i + 1));
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

        const payload: {
            name: string;
            accountId: string;
            symbol: string;
            baseFund: number;
            tradeFund: number;
            leverage: number;
            riskStrategy: string;
            compoundPositionSizing: boolean;
            takeProfit: number;
            stopLoss: number;
            indicator: string;
            strategy: "default" | "optimized" | "dynamic";
            strategyParams: any
        } = {
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
                addToast({title: 'Bot deployed!', color: 'success'});
            } else {
                addToast({title: res.error || 'Deploy failed', color: 'danger'});
            }
        } catch {
            addToast({title: 'Error deploying bot !', color: 'danger'});
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
                <Input
                    id="bot-name"
                    placeholder="e.g., ETH Momentum Scalper"
                    title="Bot Name"
                />

                {/* Account */}
                <Combobox
                    label="Account"
                    options={accounts.map(a => ({
                        id: a._id,
                        name: a.name ?? a._id,
                    }))}
                    placeholder="Select Account"
                    selected={selectedAccountId ?? ''}
                    setSelected={(k: Key | null) => handleAccountChange(k)}
                />

                <p className="text-sm text-gray-600">
                    Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
                </p>

                {/* Trade Fund % */}
                <NumericInput
                    label="Trade Fund (%)"
                    max={100}
                    min={1}
                    step={0.1}
                    usePercentageStep={true}
                    value={tradeFund}
                    onChange={e => setTradeFund(e)}
                />
                <div className="space-y-2">
                    <LabelTag id="tradeFund" title="Trade Fund (%)"/>
                    <div className="flex items-center justify-between gap-2">
                        {[25, 50, 75, 100].map(p => (
                            <button
                                key={p}
                                className="w-1/4 h-[30px] bg-default-100 rounded-lg text-sm"
                                type="button"
                                onClick={() => setTradeFund(String(p))}
                            >
                                {p}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* Leverage */}
                <Slider
                    colorClass="text-green-500"
                    label="Leverage"
                    max={leverageOptions.length}
                    simple={true}
                    value={leverage}
                    onChange={k => k && setLeverage(Number(k.toString()))}
                />

                {/* Risk Strategy */}
                <Combobox
                    label="Risk Strategy"
                    options={botProps.riskStrategyOptions.map(a => ({
                        name: a.toString(),
                    }))}
                    selected={riskStrategy.toString()}
                    setSelected={k => k && setRiskStrategy(k.toString())}
                />

                {/* Compound sizing */}
                <Checkbox
                    defaultSelected={compoundSizing}
                    onChange={e => setCompoundSizing(e.target.checked)}
                >
                    Use compound position sizing
                </Checkbox>

                {/* TP/SL */}
                <NumericInput
                    label="Take Profit"
                    max={100}
                    min={1}
                    step={0.1}
                    usePercentageStep={true}
                    value={takeProfit.toString()}
                    onChange={e => setTakeProfit(Number(e))}
                />
                <NumericInput
                    label="Stop Loss"
                    max={100}
                    min={1}
                    step={0.1}
                    usePercentageStep={true}
                    value={stopLoss.toString()}
                    onChange={e => setStopLoss(Number(e))}
                />

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

                <SecurityIndicator onChange={setSelectedIndicators} />

                {/* optimized-only fields */}
                {(mode === 'optimized' || mode === 'dynamic') && (
                    <>
                        <Combobox
                            label="Optimization Method"
                            options={botProps.OptMethod.map(a => ({
                                name: a.toString(),
                            }))}
                            selected={optMethod.toString()}
                            setSelected={k => k && setOptMethod(k.toString())}
                        />

                        <NumericInput
                            label="Minimum optimization accuracy (%)"
                            max={100}
                            min={1}
                            step={0.1}
                            usePercentageStep={true}
                            value={minOptAccuracy.toString()}
                            onChange={(e) => setMinOptAccuracy(Number(e))}
                        />

                        <NumericInput
                            label="Minimum Simulated Trades"
                            max={100}
                            min={1}
                            step={0.1}
                            usePercentageStep={true}
                            value={minSimTrades.toString()}
                            onChange={(e) => setMinSimTrades(Number(e))}
                        />
                    </>
                )}

                {/* --- dynamic-only block --- */}
                {mode === 'dynamic' && (
                    <NumericInput
                        label="Minimum bot accuracy (%)"
                        max={100}
                        min={1}
                        step={0.1}
                        usePercentageStep={true}
                        value={minBotAccuracy.toString()}
                        onChange={(e) => setMinBotAccuracy(Number(e))}
                    />
                )}

                {/* submit */}
                <Button
                    className="w-full px-4 dark:bg-white dark:hover:bg-gray-200 transition-all duration-300 dark:text-black font-semibold rounded-lg text-[14px] py-3"
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
