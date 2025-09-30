"use client";

import React, { FormEvent, Key, useEffect, useState } from "react";
import {addToast, Button} from "@heroui/react";

// Child Components
import { GridCommonFields } from "./GridCommonFields";
import { GridStrategySetup } from "./GridStrategySetup";
import { GridFuturesConfig } from "./GridFuturesConfig";
import { GridSpotAdvanced } from "./GridSpotAdvanced";
import { GridTPSL } from "./GridTPSL";

import { MarketListItem } from "@/types/MarketList";
import { ExchangeAccount } from "@/types/profile/AccountType";
import { BotProps } from "@/types/bots/StrategyParams";
import {RawBalanceResponse} from "@/types/profile/WalletBalanceType";
import {getData} from "@/actions/get";
import {sendRequest} from "@/actions/post";

export interface GridConfigFormProps {
    selectedParentTab: "spot" | "futures";
    onCloseAction: () => void;
    selectedSymbol?: MarketListItem | null;
}

export default function GridConfigForm({
   selectedParentTab,
   onCloseAction,
   selectedSymbol
}: GridConfigFormProps) {
    //
    // ─── STATE MANAGEMENT (Remains in the parent container) ──────────────────
    //
    const [botProps, setBotProps] = useState<BotProps>();
    const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<Key>();
    const [availableBalance, setAvailableBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    // Common Bot fields
    const [name, setName] = useState<string>("");

    // Grid State
    const [lowerPrice, setLowerPrice] = useState<string>("");
    const [upperPrice, setUpperPrice] = useState<string>("");
    const [gridCount, setGridCount] = useState<string>("20");
    const [gridMode, setGridMode] = useState<"Arithmetic" | "Geometric">("Arithmetic");
    const [investment, setInvestment] = useState<string>("");

    // Stop Loss / Take Profit
    const [enableTPSL, setEnableTPSL] = useState<boolean>(false);
    const [takeProfitPrice, setTakeProfitPrice] = useState<string>("");
    const [stopLossPrice, setStopLossPrice] = useState<string>("");

    // SPOT SPECIFIC STATE
    const [triggerPriceSpot, setTriggerPriceSpot] = useState<string>("");
    const [trailingUp, setTrailingUp] = useState<boolean>(false);
    const [sellBaseOnStop, setSellBaseOnStop] = useState<boolean>(true);

    // FUTURES SPECIFIC STATE
    const [direction, setDirection] = useState<"Neutral" | "Long" | "Short">("Neutral");
    const [leverage, setLeverage] = useState<string>("5");
    const [marginMode, setMarginMode] = useState<"Cross" | "Isolated">("Isolated");
    const [openOnCreation, setOpenOnCreation] = useState<boolean>(false);

    // Validation
    const [priceRangeError, setPriceRangeError] = useState<string>("");
    const [investmentError, setInvestmentError] = useState<string>("");

    //
    // ─── EFFECTS & HANDLERS (Remain in parent) ──────────────────────────────
    //
    useEffect(() => {
        if (selectedSymbol) {
            setName(`${selectedSymbol.symbol} ${selectedParentTab === 'spot' ? 'Spot' : 'Futures'} Grid`);
        }
        // ... existing async calls to load accounts and botProps ...
    }, [selectedSymbol, selectedParentTab]);

    useEffect(() => {
        const lower = parseFloat(lowerPrice);
        const upper = parseFloat(upperPrice);

        setPriceRangeError(!isNaN(lower) && !isNaN(upper) && upper <= lower ? "Upper price must be greater than lower price." : "");
    }, [lowerPrice, upperPrice]);

    useEffect(() => {
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
    // ─── RENDER (Composition of smaller components) ──────────────────────────
    //
    return (
        <div className="py-4">
            <form className="space-y-4 overflow-x-hidden" onSubmit={handleDeploy}>

                <GridCommonFields
                    accounts={accounts}
                    availableBalance={availableBalance}
                    loading={loading}
                    name={name}
                    selectedAccountId={selectedAccountId}
                    onAccountChange={handleAccountChange}
                    onNameChange={setName}
                />

                {selectedParentTab === 'futures' && (
                    <GridFuturesConfig
                        direction={direction}
                        leverage={leverage}
                        loading={loading}
                        marginMode={marginMode}
                        openOnCreation={openOnCreation}
                        onDirectionChange={setDirection}
                        onLeverageChange={setLeverage}
                        onMarginModeChange={setMarginMode}
                        onOpenOnCreationChange={setOpenOnCreation}
                    />
                )}

                <GridStrategySetup
                    availableBalance={availableBalance}
                    gridCount={gridCount}
                    gridMode={gridMode}
                    investment={investment}
                    investmentError={investmentError}
                    loading={loading}
                    lowerPrice={lowerPrice}
                    priceRangeError={priceRangeError}
                    upperPrice={upperPrice}
                    onGridCountChange={setGridCount}
                    onGridModeChange={setGridMode}
                    onInvestmentChange={setInvestment}
                    onLowerPriceChange={setLowerPrice}
                    onUpperPriceChange={setUpperPrice}
                />

                {selectedParentTab === 'spot' && (
                    <GridSpotAdvanced
                        loading={loading}
                        trailingUp={trailingUp}
                        triggerPriceSpot={triggerPriceSpot}
                        onTrailingUpChange={setTrailingUp}
                        onTriggerPriceSpotChange={setTriggerPriceSpot}
                    />
                )}

                <GridTPSL
                    enableTPSL={enableTPSL}
                    isSpot={selectedParentTab === 'spot'}
                    loading={loading}
                    sellBaseOnStop={sellBaseOnStop}
                    stopLossPrice={stopLossPrice}
                    takeProfitPrice={takeProfitPrice}
                    onEnableTPSLChange={setEnableTPSL}
                    onSellBaseOnStopChange={setSellBaseOnStop}
                    onStopLossPriceChange={setStopLossPrice}
                    onTakeProfitPriceChange={setTakeProfitPrice}
                />

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
