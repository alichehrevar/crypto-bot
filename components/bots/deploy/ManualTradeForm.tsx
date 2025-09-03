// app/components/ManualTradeForm.tsx

"use client";

import React, {FormEvent, Key, useEffect, useState} from "react";
import {
    addToast,
    Input,
    Button,
    Switch, Tab, Tabs,
} from "@heroui/react";

import {getData} from "@/actions/get";
import {sendRequest} from "@/actions/post";
import {ExchangeAccount} from "@/types/profile/AccountType";
import {WalletBalance} from "@/types/profile/WalletBalanceType";
import {SymbolFilter, SymbolFilterResponse} from "@/types/profile/CurrencyType";
import LabelTag from "@/components/shared/ui/Label";
import {parentTabs} from "@/utils/BotType";
import Combobox from "@/components/shared/ui/Combobox";
import SearchableCombobox from "@/components/shared/ui/SearchableCombobox";
import NumericInput from "@/components/shared/ui/NumericInput";
import Switcher from "@/components/shared/ui/Switcher";
import {AnimatePresence, motion} from "framer-motion";
import IndicatorsSection from "@/components/shared/ui/IndicatorsSection";
import {MAIN_INDICATOR_OPTIONS, STANDARD_INDICATOR_OPTIONS} from "@/utils/strategyPanelData";

interface Currency {
    _id: string;
    symbol: string;
}

export interface ManualTradeFormProps {
    onTradeExecuted?: () => void;
}

export default function ManualTradeForm({
                                            onTradeExecuted,
                                        }: ManualTradeFormProps) {
    //
    // ─── LOOKUPS & COMMON STATE ────────────────────────────────────────────
    //
    const [selectedParentTab, setSelectedParentTab] = useState("spot");
    const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<Key>();
    const [availableBalance, setAvailableBalance] = useState<number>(0);

    // Symbols list for dropdown
    const [symbols, setSymbols] = useState<SymbolFilter[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");

    // Placeholder for live price; wire this up later to your WebSocket/REST feed
    const [currentPrice, setCurrentPrice] = useState<number>(0);

    // Mode toggle: "market" or "limit"
    const [mode, setMode] = useState<"market" | "limit">("market");

    // Order fields
    const [quantity, setQuantity] = useState<string>("");
    const [percentQuickQty, setPercentQuickQty] = useState<number | null>(null);
    const [limitPrice, setLimitPrice] = useState<string>("");

    // TP/SL toggles + values (default ON)
    const [enableTPSL, setEnableTPSL] = useState<boolean>(true);
    const [takeProfitPct, setTakeProfitPct] = useState<string>("5");
    const [stopLossPct, setStopLossPct] = useState<string>("5");

    // Computed TP/SL prices
    const [estTPPrice, setEstTPPrice] = useState<number | null>(null);
    const [estSLPrice, setEstSLPrice] = useState<number | null>(null);

    // Validation error for Limit cost
    const [costError, setCostError] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);

    const sectionAnimationProps = {
        initial: {opacity: 0, height: 0},
        animate: {opacity: 1, height: 'auto'},
        exit: {opacity: 0, height: 0},
        transition: {type: "spring", stiffness: 300, damping: 30}
    };

    //
    // ─── EFFECT TO LOAD ACCOUNTS & SYMBOLS ─────────────────────────────────
    //
    useEffect(() => {
        // 1) Load user’s exchange accounts
        (async () => {
            try {
                const res = await getData("/accounts");

                if (!res.accounts) {
                    addToast({title: "No accounts found!", color: "danger"});

                    return;
                }
                const arr: ExchangeAccount[] = Object.entries(res.accounts).map(
                    ([exchange, acc]: any) => ({
                        ...acc,
                        _id: acc._id!,
                        userId: acc.userId!,
                        apiKey: acc.apiKey!,
                        secretKey: acc.secretKey!,
                        name: exchange,
                        createdAt: acc.createdAt ?? new Date().toISOString(),
                        __v: acc.__v ?? 0,
                    })
                );

                setAccounts(arr);
            } catch {
                addToast({title: "Failed to load accounts", color: "danger"});
            }
        })();

        // 2) Load available currency symbols
        (async () => {
            try {
                const res: SymbolFilterResponse = await getData("/currencies");

                if (!res.success) {
                    addToast({title: res.message || "No symbols found!", color: "danger"});
                } else {
                    setSymbols(res.data);
                }
            } catch {
                addToast({title: "Failed to load symbols", color: "danger"});
            }
        })();
    }, []);

    //
    // ─── WHEN USER CHANGES ACCOUNT ───────────────────────────────────────────
    //
    async function handleAccountChange(accountId: Key | null) {
        setSelectedAccountId(accountId?.toString());
        if (!accountId) {
            setAvailableBalance(0);

            return;
        }
        try {
            const res = await getData(`/accounts/${accountId}/balance`);

            if (res.balance) {
                const usdtBal: WalletBalance | undefined = res.balance.find(
                    (b: WalletBalance) => b.asset === "USDT"
                );
                const free = usdtBal ? parseFloat(usdtBal.free) : 0;

                setAvailableBalance(free);
            } else {
                addToast({title: res.error || "Unable to load balance", color: "danger"});
                setAvailableBalance(0);
            }
        } catch {
            addToast({title: "Failed to load balance", color: "danger"});
            setAvailableBalance(0);
        }
    }

    //
    // ─── QUICK‐SELECT QUANTITY HANDLER ────────────────────────────────────────
    //
    function handleQuickQty(percent: number) {
        if (!availableBalance || !currentPrice) return;
        // quantity = (percent% of availableBalance) / currentPrice
        const qty = (availableBalance * (percent / 100)) / currentPrice;

        setQuantity(qty.toFixed(6));
        setPercentQuickQty(percent);
    }

    //
    // ─── COMPUTE ESTIMATED TP/SL PRICES ─────────────────────────────────────
    //
    useEffect(() => {
        if (!enableTPSL || !currentPrice) {
            setEstTPPrice(null);
            setEstSLPrice(null);

            return;
        }
        const tpNum = parseFloat(takeProfitPct);
        const slNum = parseFloat(stopLossPct);

        if (!isNaN(tpNum)) {
            setEstTPPrice(Number((currentPrice * (1 + tpNum / 100)).toFixed(2)));
        } else {
            setEstTPPrice(null);
        }

        if (!isNaN(slNum)) {
            setEstSLPrice(Number((currentPrice * (1 - slNum / 100)).toFixed(2)));
        } else {
            setEstSLPrice(null);
        }
    }, [enableTPSL, takeProfitPct, stopLossPct, currentPrice]);

    //
    // ─── VALIDATE LIMIT ORDER COST AGAINST AVAILABLE BALANCE ────────────────
    //
    useEffect(() => {
        if (mode !== "limit") {
            setCostError("");

            return;
        }
        // Only validate if both quantity and limitPrice are valid numbers
        const qtyNum = parseFloat(quantity);
        const priceNum = parseFloat(limitPrice);

        if (isNaN(qtyNum) || isNaN(priceNum) || qtyNum <= 0 || priceNum <= 0) {
            setCostError("");

            return;
        }
        const totalCost = qtyNum * priceNum;

        if (totalCost > availableBalance) {
            setCostError("Insufficient USDT balance for this limit order.");
        } else {
            setCostError("");
        }
    }, [mode, quantity, limitPrice, availableBalance]);

    //
    // ─── FORM SUBMISSION ─────────────────────────────────────────────────────
    //
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!selectedAccountId) {
            addToast({title: "Please select an account", color: "danger"});

            return;
        }
        if (!selectedSymbol) {
            addToast({title: "Please select a symbol", color: "danger"});

            return;
        }
        if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
            addToast({title: "Please enter a valid quantity", color: "danger"});

            return;
        }
        if (mode === "limit") {
            if (!limitPrice || isNaN(Number(limitPrice)) || Number(limitPrice) <= 0) {
                addToast({title: "Please enter a valid limit price", color: "danger"});

                return;
            }
            if (costError) {
                addToast({title: costError, color: "danger"});

                return;
            }
        }

        setLoading(true);

        // Determine side from clicked button ("buy" or "sell")
        const side = ((e.nativeEvent as any).submitter?.value as string) || "buy";

        // Build payload to send to /orders/place
        const payload: any = {
            accountId: selectedAccountId.toString(),
            symbol: selectedSymbol,
            orderType: mode,         // "market" or "limit"
            side,                    // "buy" or "sell"
            quantity: Number(quantity),
            ...(mode === "limit" && {price: Number(limitPrice)}),
            takeProfitPct: enableTPSL ? parseFloat(takeProfitPct) : 0,
            stopLossPct: enableTPSL ? parseFloat(stopLossPct) : 0,
        };

        try {
            const res = await sendRequest(payload, "/orders/place");

            if (res.success) {
                addToast({title: "Order placed!", color: "success"});
                if (onTradeExecuted) onTradeExecuted();
                // Reset
                setQuantity("");
                setLimitPrice("");
                setPercentQuickQty(null);
            } else {
                addToast({title: res.error || "Order failed", color: "danger"});
            }
        } catch {
            addToast({title: "Error placing order!", color: "danger"});
        } finally {
            setLoading(false);
        }
    };

    //
    // ─── RENDER FORM ──────────────────────────────────────────────────────────
    //
    return (
        <div className="py-4 px-2 h-full">
            <Tabs
                fullWidth
                aria-label="Options"
                className="mb-4"
                classNames={{
                    cursor: "w-full",
                    tab: "h-10 px-0",
                }}
                selectedKey={selectedParentTab}
                variant="underlined"
                onSelectionChange={(k) => setSelectedParentTab(k as string)}
            >
                {parentTabs.map(({ key, title }) => (
                    <Tab key={key} title={title} />
                ))}
            </Tabs>
            {/* ── MARKET / LIMIT TAB SWITCH ──────────────────────────────────────── */}
            <div className="flex justify-start mb-4 gap-4">
                <button
                    className={`py-2 rounded-t-xl ${
                        mode === "market" ? "text-white font-semibold" : " text-gray-300"
                    }`}
                    type="button"
                    onClick={() => setMode("market")}
                >
                    Market
                </button>
                <button
                    className={`py-2 rounded-t-xl ${
                        mode === "limit" ? "text-white font-semibold" : " text-gray-300"
                    }`}
                    type="button"
                    onClick={() => setMode("limit")}
                >
                    Limit
                </button>
            </div>

            <form className="space-y-4 overflow-y-auto h-full" onSubmit={handleSubmit}>
                {/* Account */}
                <Combobox
                    label="Account"
                    options={accounts.map(a => ({
                        id: a._id,
                        name: a.name ?? a._id,
                    }))}
                    placeholder="Select Account"
                    selected={selectedAccountId ? String(selectedAccountId) : ''}
                    setSelected={(k: Key | null) => handleAccountChange(k)}
                />

                <p className="text-sm text-gray-600">
                    Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
                </p>

                {/* Symbol */}
                <SearchableCombobox
                    id="symbol"
                    label="Symbol"
                    options={symbols.map(a => ({
                        id: a._id,
                        name: a ? `${a.name} - ${a.symbol}` : '',
                    }))}
                    placeholder="Select Symbol"
                    selected={selectedSymbol ? String(selectedSymbol) : ''}
                    setSelected={k => k && setSelectedSymbol(k.toString())}
                />

                {/* ── LIMIT PRICE (only if mode="limit") ─────────────────────────────── */}
                {mode === "limit" && (
                    <NumericInput
                        label="Price (USDT)"
                        max={availableBalance}
                        min={0.01}
                        placeholder="e.g. 30,000"
                        step={0.01}
                        usePercentageStep={true}
                        value={limitPrice}
                        onChange={e => setLimitPrice(e)}
                    />
                )}

                {/* ── QUANTITY INPUT ─────────────────────────────────────────────────── */}
                <NumericInput
                    label="Quantity"
                    max={100}
                    min={0.000001}
                    placeholder="e.g. 0.01"
                    step={0.000001}
                    usePercentageStep={true}
                    value={quantity}
                    onChange={(e) => {
                        setQuantity(e);
                        setPercentQuickQty(null);
                    }}
                />

                {/* ── QUICK‐SELECT PERCENTAGE BUTTONS ────────────────────────────────── */}
                <div className="flex items-center gap-2">
                    {[10, 25, 50, 75, 100].map((p) => (
                        <button
                            key={p}
                            className={`flex flex-1 items-center justify-center px-3 py-1 rounded-lg text-[12px] ${
                                percentQuickQty === p
                                    ? "bg-blue-600 text-white"
                                    : "bg-default-200 text-gray-200"
                            }`}
                            type="button"
                            onClick={() => handleQuickQty(p)}
                        >
                            {p}%
                        </button>
                    ))}
                </div>

                {/* ── TP/SL SWITCH ───────────────────────────────────────────────────── */}
                <Switcher
                    isEnabled={enableTPSL}
                    setIsEnabled={setEnableTPSL}
                    title="TP/SL"
                />

                {/* ── TP & SL INPUTS + QUICK‐SELECT BUTTONS ──────────────────────────── */}
                <AnimatePresence initial={false}>
                    {enableTPSL && (
                        <motion.div {...sectionAnimationProps} className="pt-2">
                            <div className="space-y-2">
                                {/* Take Profit */}
                                <NumericInput
                                    label="Take Profit (%)"
                                    max={500}
                                    min={0.01}
                                    placeholder="e.g. 5"
                                    step={0.01}
                                    usePercentageStep={true}
                                    value={takeProfitPct}
                                    onChange={(e) => setTakeProfitPct(e)}
                                />
                                <div className="flex items-center gap-2 flex-wrap">
                                    {[5, 10, 25, 50, 100, 150].map((p) => (
                                        <button
                                            key={p}
                                            className={`flex flex-1 items-center justify-center px-2 py-1 rounded-lg text-[12px] ${
                                                enableTPSL
                                                    ? "bg-default-200 text-gray-200"
                                                    : "bg-default-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                            disabled={!enableTPSL}
                                            type="button"
                                            onClick={() => enableTPSL && setTakeProfitPct(String(p))}
                                        >
                                            {p}%
                                        </button>
                                    ))}
                                </div>
                                {estTPPrice !== null && enableTPSL && (
                                    <p className="text-sm text-green-400">
                                        Est. TP Price: <b>{estTPPrice.toLocaleString()} USDT</b>
                                    </p>
                                )}

                                {/* Stop Loss */}
                                <NumericInput
                                    label="Quantity"
                                    max={500}
                                    min={0.01}
                                    placeholder="e.g. 5"
                                    step={0.01}
                                    usePercentageStep={true}
                                    value={stopLossPct}
                                    onChange={(e) => setStopLossPct(e)}
                                />
                                <div className="flex items-center gap-2 flex-wrap">
                                    {[20, 30, 40, 50, 60, 70].map((p) => (
                                        <button
                                            key={p}
                                            className={`flex flex-1 items-center justify-center px-2 py-1 rounded-lg text-[12px] ${
                                                enableTPSL
                                                    ? "bg-default-200 text-gray-200"
                                                    : "bg-default-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                            disabled={!enableTPSL}
                                            type="button"
                                            onClick={() => enableTPSL && setStopLossPct(String(p))}
                                        >
                                            {p}%
                                        </button>
                                    ))}
                                </div>
                                {estSLPrice !== null && enableTPSL && (
                                    <p className="text-sm text-red-400">
                                        Est. SL Price: <b>{estSLPrice.toLocaleString()} USDT</b>
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── BUY / SELL BUTTONS ─────────────────────────────────────────────── */}
                <div className="flex gap-4 mt-4">
                    <Button
                        className="flex-1 bg-success hover:bg-success-400 text-white rounded-lg py-3"
                        disabled={loading || Boolean(costError)}
                        isLoading={loading}
                        type="submit"
                        value="buy"
                    >
                        Buy
                    </Button>
                    <Button
                        className="flex-1 bg-danger hover:bg-danger-400 text-white rounded-lg py-3"
                        disabled={loading || Boolean(costError)}
                        isLoading={loading}
                        type="submit"
                        value="sell"
                    >
                        Sell
                    </Button>
                </div>
            </form>
        </div>
    );
}
