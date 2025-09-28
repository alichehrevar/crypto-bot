"use client";

import React, { FormEvent, Key, useEffect, useState } from "react";
import { addToast, Button, Switch, Tabs, Tab } from "@heroui/react";

import { getData } from "@/actions/get";
import { sendRequest } from "@/actions/post";
import { ExchangeAccount } from "@/types/profile/AccountType";
import { RawBalanceResponse } from "@/types/profile/WalletBalanceType";
import { BotProps } from "@/types/profile/bots/StrategyParams";
import Input from "@/components/shared/ui/Input";
import NumericInput from "@/components/shared/ui/NumericInput";
import Combobox from "@/components/shared/ui/Combobox";
import { MarketListItem } from "@/types/MarketList";

export interface GridConfigFormProps {
    selectedParentTab: "spot" | "futures", // This is now the primary determinant
    onCloseAction: () => void,
    selectedSymbol?: MarketListItem | null
}

export default function GridConfigForm({
                                           selectedParentTab,
                                           onCloseAction,
                                           selectedSymbol
                                       }: GridConfigFormProps) {
    //
    // ─── LOOKUPS & COMMON STATE ──────────────────────────────────────────────
    //
    const [botProps, setBotProps] = useState<BotProps>();
    const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<Key>();
    const [availableBalance, setAvailableBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    // Common Bot fields
    const [name, setName] = useState<string>("");

    //
    // ─── NEW UNIFIED & SPECIFIC GRID STATE ───────────────────────────────────
    //

    // Common Fields from Docs
    const [lowerPrice, setLowerPrice] = useState<string>("");
    const [upperPrice, setUpperPrice] = useState<string>("");
    const [gridCount, setGridCount] = useState<string>("20");
    const [gridMode, setGridMode] = useState<"Arithmetic" | "Geometric">("Arithmetic"); // [cite: 26]
    const [investment, setInvestment] = useState<string>(""); // Replaces baseFund for clarity

    // Stop Loss / Take Profit
    const [enableTPSL, setEnableTPSL] = useState<boolean>(false);
    const [takeProfitPrice, setTakeProfitPrice] = useState<string>(""); // Price-based, more flexible
    const [stopLossPrice, setStopLossPrice] = useState<string>("");   // Price-based

    // --- SPOT SPECIFIC STATE ---
    const [triggerPriceSpot, setTriggerPriceSpot] = useState<string>("");
    const [trailingUp, setTrailingUp] = useState<boolean>(false); // Grid-level trailing [cite: 253]
    const [sellBaseOnStop, setSellBaseOnStop] = useState<boolean>(true);

    // --- FUTURES SPECIFIC STATE ---
    const [direction, setDirection] = useState<"Neutral" | "Long" | "Short">("Neutral"); // [cite: 9]
    const [leverage, setLeverage] = useState<string>("5"); // [cite: 7]
    const [marginMode, setMarginMode] = useState<"Cross" | "Isolated">("Isolated"); // [cite: 14]
    const [openOnCreation, setOpenOnCreation] = useState<boolean>(false); // For Long/Short modes [cite: 10]

    // Validation
    const [priceRangeError, setPriceRangeError] = useState<string>("");
    const [investmentError, setInvestmentError] = useState<string>("");


    //
    // ─── EFFECTS & HANDLERS (Largely unchanged, but simplified) ──────────────
    //
    useEffect(() => {
        if (selectedSymbol) {
            setName(`${selectedSymbol.symbol} ${selectedParentTab === 'spot' ? 'Spot' : 'Futures'} Grid`);
        }
        // ... existing async calls to load accounts and botProps ...
    }, [selectedSymbol, selectedParentTab]);

    useEffect(() => {
        // Price range validation
        const lower = parseFloat(lowerPrice);
        const upper = parseFloat(upperPrice);

        if (!isNaN(lower) && !isNaN(upper) && upper <= lower) {
            setPriceRangeError("Upper price must be greater than lower price.");
        } else {
            setPriceRangeError("");
        }
    }, [lowerPrice, upperPrice]);

    useEffect(() => {
        // Investment validation
        const invest = parseFloat(investment);

        if (!isNaN(invest) && invest > availableBalance) {
            setInvestmentError("Investment cannot exceed available balance.");
        } else if (!isNaN(invest) && invest <= 0) {
            setInvestmentError("Investment must be a positive number.");
        } else {
            setInvestmentError("");
        }
    }, [investment, availableBalance]);


    async function handleAccountChange(accountId: Key | null) {
        setSelectedAccountId(accountId?.toString());
        if (!accountId) {
            setAvailableBalance(0);
            setInvestment("");

            return;
        }
        try {
            const res: RawBalanceResponse = await getData(`/accounts/${accountId}/balance`);
            const accountType = selectedParentTab === 'spot' ? 'spot' : 'usdtFuture'; // Match backend terminology
            const spotEntry = res.data?.find(b => b.accountType.toLowerCase() === accountType);
            const free = parseFloat(spotEntry?.usdtBalance ?? '0');

            setAvailableBalance(free);
            // Optionally auto-fill a percentage of balance
            // setInvestment((free * 0.5).toFixed(2));
        } catch {
            addToast({ title: "Failed to load balance", color: "danger" });
            setAvailableBalance(0);
        }
    }


    //
    // ─── UPDATED FORM SUBMISSION ─────────────────────────────────────────────
    //
    const handleDeploy = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (priceRangeError || investmentError) {
            addToast({ title: "Please fix the errors before deploying.", color: "danger" });

            return;
        }

        setLoading(true);

        let payload: any;

        if (selectedParentTab === 'spot') {
            payload = {
                botType: "grid",
                gridType: "spot",
                name: name.trim() || `${selectedSymbol?.symbol} Spot Grid`,
                accountId: selectedAccountId,
                symbol: selectedSymbol?.symbol,
                investment: parseFloat(investment),

                // Spot Grid Parameters
                range: {
                    lower: parseFloat(lowerPrice),
                    upper: parseFloat(upperPrice)
                },
                grids: parseInt(gridCount, 10),
                stepType: gridMode, // Arithmetic or Geometric [cite: 11]
                trailingUp: trailingUp, // [cite: 253]

                // Optional advanced params
                triggerPrice: triggerPriceSpot ? parseFloat(triggerPriceSpot) : null,
                stopLoss: enableTPSL && stopLossPrice ? parseFloat(stopLossPrice) : null,
                takeProfit: enableTPSL && takeProfitPrice ? parseFloat(takeProfitPrice) : null,
                sellBaseOnStop: sellBaseOnStop,
            };
        } else { // Futures
            payload = {
                botType: "grid",
                gridType: "futures",
                name: name.trim() || `${selectedSymbol?.symbol} Futures Grid`,
                accountId: selectedAccountId,
                symbol: selectedSymbol?.symbol,

                // Futures Grid Parameters
                direction: direction, // [cite: 9]
                leverage: parseInt(leverage, 10), // [cite: 7]
                marginMode: marginMode, // [cite: 14]
                investment: parseFloat(investment),

                range: {
                    lower: parseFloat(lowerPrice),
                    upper: parseFloat(upperPrice)
                },
                grids: parseInt(gridCount, 10),
                stepType: gridMode, // Arithmetic or Geometric [cite: 11]

                openOnCreation: (direction === 'Long' || direction === 'Short') ? openOnCreation : false, // [cite: 10]

                // Stops are different for Futures modes [cite: 36-39]
                stopLoss: enableTPSL && stopLossPrice ? parseFloat(stopLossPrice) : null,
                takeProfit: enableTPSL && takeProfitPrice ? parseFloat(takeProfitPrice) : null,
            };
        }

        try {
            // The sendRequest function might need adjustment if it doesn't handle nested objects
            const res = await sendRequest({ botConfig: JSON.stringify(payload) }, "/bots/deploy");

            if (res.success) {
                addToast({ title: "Grid Bot deployed!", color: "success" });
                onCloseAction();
            } else {
                addToast({ title: res.error || "Deploy failed", color: "danger" });
            }
        } catch {
            addToast({ title: "Error deploying grid bot!", color: "danger" });
        } finally {
            setLoading(false);
        }
    };


    //
    // ─── RENDER FORM (WITH CONDITIONAL UI) ──────────────────────────────────
    //
    return (
        <div className="py-4">
            <form className="space-y-4 overflow-x-hidden" onSubmit={handleDeploy}>
                {/* --- COMMON FIELDS --- */}
                <Input
                    id="bot-name"
                    placeholder="e.g., ETH Momentum Scalper"
                    title="Bot Name"
                />
                <Combobox
                    label="Account"
                    options={accounts.map(a => ({ id: a._id, name: a.name ?? a._id }))}
                    selected={selectedAccountId ? String(selectedAccountId) : ''}
                    setSelected={handleAccountChange}
                />
                <p className="text-sm text-gray-600">
                    Available balance: <b>{availableBalance.toFixed(4)} USDT</b>
                </p>

                {/* --- RENDER SPOT OR FUTURES UI --- */}
                {selectedParentTab === 'futures' && (
                    <div className="border-t border-default-100 pt-4 space-y-4">
                        <h3 className="font-semibold">Futures Configuration</h3>
                        <Tabs
                            aria-label="Futures Direction"
                            selectedKey={direction}
                            onSelectionChange={(key) => setDirection(key as any)}
                        >
                            <Tab key="Neutral" title="Neutral" />
                            <Tab key="Long" title="Long" />
                            <Tab key="Short" title="Short" />
                        </Tabs>

                        <div className="grid grid-cols-2 gap-4">
                            <NumericInput label="Leverage" max={125} min={1} step={1} unit="x" value={leverage} onChange={setLeverage} />
                            <Combobox label="Margin Mode" options={[{id: "Isolated", name: "Isolated"}, {id: "Cross", name: "Cross"}]} selected={marginMode} setSelected={(k) => k && setMarginMode(k as any)}/>
                        </div>
                        {(direction === "Long" || direction === "Short") && (
                            <div className="flex items-center justify-between flex-row-reverse gap-2">
                                <Switch color="success" isSelected={openOnCreation} onValueChange={setOpenOnCreation} />
                                <span className="text-sm text-gray-700">Open position on creation</span>
                            </div>
                        )}
                    </div>
                )}

                {/* --- GRID SETUP (COMMON TO BOTH) --- */}
                <div className="border-t border-default-100 pt-4 space-y-4">
                    <h3 className="font-semibold">Grid Strategy</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <NumericInput label="Lower Price (USDT)" max={0} min={0}
                                      placeholder="e.g., 50000" value={lowerPrice} onChange={setLowerPrice} />
                        <NumericInput label="Upper Price (USDT)" max={0} min={0}
                                      placeholder="e.g., 70000" value={upperPrice} onChange={setUpperPrice} />
                    </div>
                    {priceRangeError && <p className="text-[12px] text-red-500">{priceRangeError}</p>}

                    <div className="grid grid-cols-2 gap-4">
                        <NumericInput label="Number of Grids" max={200} min={2} step={1} value={gridCount} onChange={setGridCount}/>
                        <Combobox label="Grid Mode" options={[{id: "Arithmetic", name: "Arithmetic"}, {id: "Geometric", name: "Geometric"}]} selected={gridMode} setSelected={(k) => k && setGridMode(k as any)}/>
                    </div>
                    <NumericInput label="Total Investment (USDT)" max={availableBalance} min={0} value={investment} onChange={setInvestment} />
                    {investmentError && <p className="text-[12px] text-red-500">{investmentError}</p>}
                </div>

                {/* --- ADVANCED & STOPPABLE (SPOT) --- */}
                {selectedParentTab === 'spot' && (
                    <div className="border-t border-default-100 pt-4 space-y-4">
                        <h3 className="font-semibold">Advanced Spot Options</h3>
                        <div className="flex items-center justify-between flex-row-reverse gap-2">
                            <Switch color="success" isSelected={trailingUp} onValueChange={setTrailingUp} />
                            <span className="text-sm text-gray-700">Trailing Up</span>
                        </div>
                        <NumericInput label="Trigger Price" max={0}
                                      min={0} placeholder="Optional: Start bot when price is met" value={triggerPriceSpot} onChange={setTriggerPriceSpot} />
                    </div>
                )}

                {/* --- TP / SL (COMMON) --- */}
                <div className="border-t border-default-100 pt-4 space-y-4">
                    <div className="flex items-center justify-between flex-row-reverse gap-2">
                        <Switch color="success" isSelected={enableTPSL} onValueChange={setEnableTPSL} />
                        <span className="text-sm text-gray-700">Take Profit / Stop Loss</span>
                    </div>
                    {enableTPSL && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <NumericInput label="Take Profit Price" max={0}
                                              min={0} placeholder="e.g., 80000" value={takeProfitPrice} onChange={setTakeProfitPrice} />
                                <NumericInput label="Stop Loss Price" max={0} min={0}
                                              placeholder="e.g., 45000" value={stopLossPrice} onChange={setStopLossPrice} />
                            </div>
                            {selectedParentTab === 'spot' && (
                                <div className="flex items-center justify-between flex-row-reverse gap-2">
                                    <Switch color="success" isSelected={sellBaseOnStop} onValueChange={setSellBaseOnStop} />
                                    <span className="text-sm text-gray-700">Sell all base coins on stop</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* --- SUBMIT BUTTON --- */}
                <Button
                    className="w-full"
                    disabled={loading || !!priceRangeError || !!investmentError || parseFloat(investment) <= 0}
                    isLoading={loading}
                    type="submit"
                >
                    Deploy {selectedParentTab === 'spot' ? 'Spot' : 'Futures'} Bot
                </Button>
            </form>
        </div>
    );
}
