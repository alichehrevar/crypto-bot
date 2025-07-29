// app/components/ManualTradeForm.tsx

"use client";

import React, { FormEvent, Key, useEffect, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  addToast,
  Input,
  Button,
  Switch,
} from "@heroui/react";

import { getData } from "@/actions/get";
import { sendRequest } from "@/actions/post";
import { ExchangeAccount } from "@/types/profile/AccountType";
import { WalletBalance } from "@/types/profile/WalletBalanceType";
import { SymbolFilterResponse } from "@/types/profile/CurrencyType";
import LabelTag from "@/components/shared/ui/Label";

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
  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<Key>();
  const [availableBalance, setAvailableBalance] = useState<number>(0);

  // Symbols list for dropdown
  const [symbols, setSymbols] = useState<Currency[]>([]);
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

  //
  // ─── EFFECT TO LOAD ACCOUNTS & SYMBOLS ─────────────────────────────────
  //
  useEffect(() => {
    // 1) Load user’s exchange accounts
    (async () => {
      try {
        const res = await getData("/accounts");

        if (!res.accounts) {
          addToast({ title: "No accounts found!", color: "danger" });

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
        addToast({ title: "Failed to load accounts", color: "danger" });
      }
    })();

    // 2) Load available currency symbols
    (async () => {
      try {
        const res: SymbolFilterResponse = await getData("/currencies");

        if (!res.success) {
          addToast({ title: res.message || "No symbols found!", color: "danger" });
        } else {
          setSymbols(res.data);
        }
      } catch {
        addToast({ title: "Failed to load symbols", color: "danger" });
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
        addToast({ title: res.error || "Unable to load balance", color: "danger" });
        setAvailableBalance(0);
      }
    } catch {
      addToast({ title: "Failed to load balance", color: "danger" });
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
      addToast({ title: "Please select an account", color: "danger" });

      return;
    }
    if (!selectedSymbol) {
      addToast({ title: "Please select a symbol", color: "danger" });

      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      addToast({ title: "Please enter a valid quantity", color: "danger" });

      return;
    }
    if (mode === "limit") {
      if (!limitPrice || isNaN(Number(limitPrice)) || Number(limitPrice) <= 0) {
        addToast({ title: "Please enter a valid limit price", color: "danger" });

        return;
      }
      if (costError) {
        addToast({ title: costError, color: "danger" });

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
      ...(mode === "limit" && { price: Number(limitPrice) }),
      takeProfitPct: enableTPSL ? parseFloat(takeProfitPct) : 0,
      stopLossPct: enableTPSL ? parseFloat(stopLossPct) : 0,
    };

    try {
      const res = await sendRequest(payload, "/orders/place");

      if (res.success) {
        addToast({ title: "Order placed!", color: "success" });
        if (onTradeExecuted) onTradeExecuted();
        // Reset
        setQuantity("");
        setLimitPrice("");
        setPercentQuickQty(null);
      } else {
        addToast({ title: res.error || "Order failed", color: "danger" });
      }
    } catch {
      addToast({ title: "Error placing order!", color: "danger" });
    } finally {
      setLoading(false);
    }
  };

  //
  // ─── RENDER FORM ──────────────────────────────────────────────────────────
  //
  return (
    <div className="py-4 px-2 h-full">
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
        {/* — Account Dropdown — */}
        <div className="space-y-2">
          <LabelTag id="account" title="Account" />
          <Autocomplete
            id="account"
            isClearable={false}
            items={accounts}
            onSelectionChange={(k: Key | null) => handleAccountChange(k)}
          >
            {accounts.map((acc) => (
              <React.Fragment key={acc._id}>
                <AutocompleteItem key={acc._id} textValue={acc.name}>
                  {acc.name}
                </AutocompleteItem>
              </React.Fragment>
            ))}
          </Autocomplete>
        </div>

        <p className="text-sm text-gray-600">
          Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
        </p>

        {/* — Symbol Dropdown — */}
        <div className="space-y-2">
          <LabelTag id="symbol" title="Symbol" />
          <Autocomplete
            defaultItems={symbols}
            id="symbol"
            isClearable={false}
            onSelectionChange={(k) => k && setSelectedSymbol(k.toString())}
          >
            {symbols.map((s) => (
              <AutocompleteItem key={s.symbol} textValue={s.symbol}>
                {s.symbol}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>

        {/* ── LIMIT PRICE (only if mode="limit") ─────────────────────────────── */}
        {mode === "limit" && (
          <div className="space-y-2">
            <LabelTag id="price" title="Price (USDT)" />
            <Input
              required
              id="price"
              min={0.0001}
              placeholder="e.g. 30,000"
              step="0.01"
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
            />
            {costError && (
              <p className="text-red-500 text-sm">{costError}</p>
            )}
          </div>
        )}

        {/* ── QUANTITY INPUT ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <LabelTag id="quantity" title="Quantity" />
          <Input
            required
            id="quantity"
            min={0.000001}
            placeholder="e.g. 0.01"
            step="0.000001"
            type="number"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setPercentQuickQty(null);
            }}
          />
        </div>

        {/* ── QUICK‐SELECT PERCENTAGE BUTTONS ────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {[10, 25, 50, 75, 100].map((p) => (
            <button
              key={p}
              className={`flex flex-1 items-center justify-center px-3 py-1 rounded-xl text-[12px] ${
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
        <div className="flex items-center justify-between flex-row-reverse">
          <Switch
            color="success"
            isSelected={enableTPSL}
            size="sm"
            onValueChange={setEnableTPSL}
          />
          <span className="text-sm text-gray-700">TP/SL</span>
        </div>

        {/* ── TP & SL INPUTS + QUICK‐SELECT BUTTONS ──────────────────────────── */}
        <div className="space-y-2">
          {/* Take Profit */}
          <div className="space-y-2">
            <LabelTag id="takeProfit" title="Take Profit (%)" />
            <Input
              disabled={!enableTPSL}
              id="takeProfit"
              max={500}
              min={0.01}
              placeholder="e.g. 5"
              required={enableTPSL}
              step={0.01}
              type="number"
              value={takeProfitPct}
              onChange={(e) => setTakeProfitPct(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[5, 10, 25, 50, 100, 150].map((p) => (
              <button
                key={p}
                className={`flex flex-1 items-center justify-center px-2 py-1 rounded-2xl text-[12px] ${
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
          <div className="space-y-2">
            <LabelTag id="stopLoss" title="Stop Loss (%)" />
            <Input
              disabled={!enableTPSL}
              id="stopLoss"
              max={500}
              min={0.01}
              placeholder="e.g. 5"
              required={enableTPSL}
              step={0.01}
              type="number"
              value={stopLossPct}
              onChange={(e) => setStopLossPct(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[20, 30, 40, 50, 60, 70].map((p) => (
              <button
                key={p}
                className={`flex flex-1 items-center justify-center px-2 py-1 rounded-2xl text-[12px] ${
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

        {/* ── BUY / SELL BUTTONS ─────────────────────────────────────────────── */}
        <div className="flex gap-4 mt-4">
          <Button
            className="flex-1 bg-success hover:bg-success-400 text-white rounded-2xl py-3"
            disabled={loading || Boolean(costError)}
            isLoading={loading}
            type="submit"
            value="buy"
          >
            Buy
          </Button>
          <Button
            className="flex-1 bg-danger hover:bg-danger-400 text-white rounded-2xl py-3"
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
