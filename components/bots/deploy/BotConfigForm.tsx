'use client';

import React, {FormEvent, Key, useEffect, useState} from "react";
import {
    addToast,
    Button, Checkbox, Spinner,
} from '@heroui/react';

import Input from '@/components/shared/ui/Input'
import {getData} from '@/actions/get';
import {ExchangeAccount, AccountsResponse} from '@/types/profile/AccountType';
import {RawBalanceResponse} from "@/types/profile/WalletBalanceType";
import {sendRequest} from '@/actions/post';
import {BotProps} from '@/types/bots/StrategyParams';
import NumericInput from "@/components/shared/ui/NumericInput";
import Combobox from "@/components/shared/ui/Combobox";
import IndicatorsSection, {IndicatorItem} from "@/components/shared/ui/IndicatorsSection";
import {MAIN_INDICATOR_OPTIONS, STANDARD_INDICATOR_OPTIONS} from "@/utils/strategyPanelData";
import SecurityIndicator from "@/components/shared/ui/SecurityIndicator";
import MarginModal from "@/components/shared/modals/MarginModal";
import {ChevronRightIcon} from "@/utils/icons";
import PositionLeverageModal from "@/components/shared/modals/PositionLeverageModal";
import Switcher from "@/components/shared/ui/Switcher";

export interface BotConfigFormProps {
    mode: 'default' | 'optimized' | 'dynamic',
    selectedParentTab: string,
    onCloseAction: () => void,
    selectedSymbol?: string | undefined
}

export default function BotConfigForm({mode, selectedParentTab, onCloseAction, selectedSymbol}: BotConfigFormProps) {
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
    const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>();
    const [availableBalance, setAvailableBalance] = useState(0);
    const [leverageOptions, setLeverageOptions] = useState<number[]>([]);

    const [marginType, setMarginType] = useState('Isolated');
    const [positionMode, setPositionMode] = useState('Single');
    const [singleModeSide, setSingleModeSide] = useState('Long');
    const [leverageLong, setLeverageLong] = useState(50);
    const [leverageShort, setLeverageShort] = useState(50);

    const [baseFund, setBaseFund] = useState(0);
    const [tradeFund, setTradeFund] = useState<string>('50');
    // const [leverage, setLeverage] = useState(1);
    // const [compoundSizing, setCompoundSizing] = useState(true);
    const [takeProfit, setTakeProfit] = useState<number>(10);
    const [stopLoss, setStopLoss] = useState<number>(10);
    const [positionTakeProfit, setPositionTakeProfit] = useState<number>(10);
    const [positionStopLoss, setPositionStopLoss] = useState<number>(10);
    const [indicator, setIndicator] = useState<string>('');
    const [selectedIndicators, setSelectedIndicators] = useState<IndicatorItem[]>([{id: 1, indicator: STANDARD_INDICATOR_OPTIONS[0], timeFrame: "1h"}]);
    const [isPaperTrade, setIsPaperTrade] = useState(true);
    const [shareWithCommunity, setShareWithCommunity] = useState(false);
    const [loading, setLoading] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);

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
                    setIndicator(res.props.indicatorOptions[0] || '');
                }
            } catch {
                addToast({title: 'Failed to load bot parameters', color: 'danger'});
            }
        })();
    }, []);

    // fetch leverage‐options whenever account or symbol changes
    useEffect(() => {
        if (!selectedAccountId || !selectedSymbol) return;
        (async () => {
            try {
                const {
                    success,
                    leverages
                } = await getData(`/accounts/${selectedAccountId}/leverage-options?symbol=${encodeURIComponent(selectedSymbol)}`);

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
    }, [selectedAccountId, selectedSymbol]);

    // fetch balance when account changes
    async function handleAccountChange(accountId: Key | null) {
        setBalanceLoading(true)
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
        } finally {
            setBalanceLoading(false)
        }
    }

    /** POST to deploy */
    const handleDeploy = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const payload: {
            name: string;
            accountId: string;
            symbol: string | undefined;
            baseFund: number;
            tradeFund: number;
            // leverage: number;
            compoundPositionSizing: boolean;
            takeProfit: number;
            stopLoss: number;
            positionTakeProfit: number;
            positionStopLoss: number;
            indicators: IndicatorItem[];
            // Include the values from the modals
            marginType: string,         // e.g., 'Isolated' or 'Cross'
            positionMode: string,       // e.g., 'Single' or 'Hedge'
            leverageLong: number,
            leverageShort: number,
            singleModeSide: string,     // e.g., 'Long', 'Short', or 'Both'
            strategy: "default" | "optimized" | "dynamic";
            strategyParams: any,
            optimizationMethod?: string;
            minOptimizationAccuracy?: number;
            minSimulatedTrades?: number;
            minBotAccuracy?: number;
            mode: string; // paper or live trade
            share: boolean;
        } = {
            name,
            accountId: selectedAccountId?.toString() || '',
            symbol: selectedSymbol,
            baseFund,
            tradeFund: parseFloat(tradeFund),
            // leverage: 1,
            compoundPositionSizing: false,
            takeProfit,
            stopLoss,
            positionTakeProfit,
            positionStopLoss,
            indicators: selectedIndicators,
            strategy: mode,

            // Include the values from the modals
            marginType,         // e.g., 'Isolated' or 'Cross'
            positionMode,       // e.g., 'Single' or 'Hedge'
            leverageLong,
            leverageShort,
            singleModeSide,     // e.g., 'Long', 'Short', or 'Both'
            mode: isPaperTrade ? 'paper' : 'live',
            share: shareWithCommunity,

            strategyParams: botProps.defaultStrategyParams[indicator] || {},
            // optimized extras:
            ...((mode === 'optimized' || mode === 'dynamic') && {
                optimizationMethod: optMethod,
                minOptimizationAccuracy: minOptAccuracy,
                minSimulatedTrades: minSimTrades,
            }),
            // dynamic extras:
            ...(mode === 'dynamic' && {
                minBotAccuracy: minBotAccuracy,
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
        <div>
            {selectedParentTab === 'futures' &&
                <div className="flex items-center justify-start w-full mb-3 gap-3">
                    <MarginModal
                        selectedValue={marginType ?? 'Isolated'}
                        onChange={setMarginType}
                    />
                    <ChevronRightIcon className="size-3" />
                    <PositionLeverageModal
                        leverageLong={leverageLong}
                        leverageShort={leverageShort}
                        positionMode={positionMode}
                        setLeverageLong={setLeverageLong}
                        setLeverageShort={setLeverageShort}
                        setPositionMode={setPositionMode}
                        setSingleModeSide={setSingleModeSide}
                        singleModeSide={singleModeSide}
                    />
                </div>
            }
            <form
                className="space-y-4 overflow-x-hidden"
                onSubmit={handleDeploy}
            >
                {/* Bot Name */}
                <Input
                    id="bot-name"
                    placeholder="e.g., ETH Momentum Scalper"
                    title="Technical Bot Name"
                    onChange={setName}
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

                <div className="text-sm text-gray-600 flex items-center">
                    Available balance:
                    {balanceLoading
                        ? <span className="inline h-3 -mt-10 ms-3">
                            <Spinner color="primary" size="sm" variant="wave" />
                        </span>
                        : <b className="ms-1">{availableBalance.toFixed(2)} USDT</b>
                    }
                </div>

                {/* Trade Fund % */}
                <NumericInput
                    label="Investment"
                    max={availableBalance}
                    min={1}
                    step={0.1}
                    usePercentageStep={true}
                    value={tradeFund}
                    onChange={e => setTradeFund(e)}
                />
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        {[25, 50, 75, 100].map(p => (
                            <button
                                key={p}
                                className="w-1/4 h-[30px] bg-default-100 rounded-lg text-sm"
                                type="button"
                                onClick={() => setTradeFund(String(Number(availableBalance * p) / 100))}
                            >
                                {p}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* Compound sizing */}
                {/*<Checkbox*/}
                {/*    defaultSelected={compoundSizing}*/}
                {/*    onChange={e => setCompoundSizing(e.target.checked)}*/}
                {/*>*/}
                {/*    Use compound position sizing*/}
                {/*</Checkbox>*/}

                {/* TP/SL */}
                <div className="grid grid-cols-2 gap-2">
                    <NumericInput
                        label="Bot Take Profit (%)"
                        min={0}
                        usePercentageStep={true}
                        value={takeProfit.toString()}
                        onChange={e => setTakeProfit(Number(e))}
                    />
                    <NumericInput
                        label="Bot Stop Loss (%)"
                        min={0}
                        usePercentageStep={true}
                        value={stopLoss.toString()}
                        onChange={e => setStopLoss(Number(e))}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <NumericInput
                        label="Position Take Profit (%)"
                        min={0}
                        usePercentageStep={true}
                        value={positionTakeProfit.toString()}
                        onChange={e => setPositionTakeProfit(Number(e))}
                    />
                    <NumericInput
                        label="Position Stop Loss (%)"
                        min={0}
                        usePercentageStep={true}
                        value={positionStopLoss.toString()}
                        onChange={e => setPositionStopLoss(Number(e))}
                    />
                </div>

                <IndicatorsSection
                    defaultNewTimeframe="1h"
                    initialIndicators={[
                        {id: 1, indicator: STANDARD_INDICATOR_OPTIONS[0], timeFrame: "1h"},
                    ]}
                    mainOptions={MAIN_INDICATOR_OPTIONS}
                    showAddIndicatorButton={true}
                    standardOptions={STANDARD_INDICATOR_OPTIONS}
                    onChange={setSelectedIndicators}
                />

                <SecurityIndicator onChange={setSelectedIndicators}/>

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

                <Switcher
                    isEnabled={isPaperTrade}
                    setIsEnabled={setIsPaperTrade}
                    title="Paper Trade"
                />

                <Checkbox
                    defaultSelected={shareWithCommunity}
                    onChange={e => setShareWithCommunity(e.target.checked)}
                >
                    Share this Bot with Community
                </Checkbox>

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
