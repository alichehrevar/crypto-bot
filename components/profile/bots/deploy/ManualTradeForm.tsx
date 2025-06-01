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

interface Currency {
  _id: string;
  symbol: string;
}

// Props (if you need to pass down any callbacks, etc.)
export interface ManualTradeFormProps {
  // e.g. callback once the user submits a trade
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

  // “currentPrice” would normally be fetched from some price feed.
  // For now, we’ll keep it as a placeholder state that you can update later.
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Mode toggle: "market" or "limit"
  const [mode, setMode] = useState<"market" | "limit">("market");

  // Common order fields
  const [quantity, setQuantity] = useState<string>(""); // user input
  const [percentQuickQty, setPercentQuickQty] = useState<number | null>(null);

  // If limit, we need a "price" field
  const [limitPrice, setLimitPrice] = useState<string>("");

  // TP/SL toggles + values
  // ← DEFAULT IS NOW true (switch starts ON)
  const [enableTPSL, setEnableTPSL] = useState<boolean>(true);
  const [takeProfitPct, setTakeProfitPct] = useState<string>("5"); // “5” means 5%
  const [stopLossPct, setStopLossPct] = useState<string>("5");

  // Calculated TP & SL prices
  const [estTPPrice, setEstTPPrice] = useState<number | null>(null);
  const [estSLPrice, setEstSLPrice] = useState<number | null>(null);

  //
  // ─── EFFECT: FETCH ACCOUNTS & BALANCE ─────────────────────────────────
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
  // ─── WHEN QUANTITY CHANGES VIA QUICK‐SELECT ───────────────────────────────
  //
  function handleQuickQty(percent: number) {
    if (!availableBalance || !currentPrice) return;
    // Quantity = (percent% of availableBalance) / currentPrice
    const qty = (availableBalance * (percent / 100)) / currentPrice;
    setQuantity(qty.toFixed(6)); // adjust decimals as needed
    setPercentQuickQty(percent);
  }

  //
  // ─── CALCULATE ESTIMATED TP/SL PRICES ────────────────────────────────────
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
  // ─── FORM SUBMISSION ─────────────────────────────────────────────────────
  //
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedAccountId) {
      addToast({ title: "Please select an account", color: "danger" });
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
    }

    // Build payload
    const side = (e.nativeEvent as any).submitter.value || "buy";

    const payload: any = {
      accountId: selectedAccountId.toString(),
      symbol: "BTC/USDT", // Adjust if you want to let user pick a symbol
      orderType: mode,    // "market" or "limit"
      side,               // "buy" or "sell"
      quantity: Number(quantity),
      ...(mode === "limit" && { price: Number(limitPrice) }),
      takeProfitPct: enableTPSL ? parseFloat(takeProfitPct) : 0,
      stopLossPct: enableTPSL ? parseFloat(stopLossPct) : 0,
    };

    try {
      // e.g. POST to /orders/place
      const res = await sendRequest(payload, "/orders/place");
      if (res.success) {
        addToast({ title: "Order placed!", color: "success" });
        if (onTradeExecuted) onTradeExecuted();
        // Optionally reset form:
        setQuantity("");
        setLimitPrice("");
        setPercentQuickQty(null);
      } else {
        addToast({ title: res.error || "Order failed", color: "danger" });
      }
    } catch {
      addToast({ title: "Error placing order!", color: "danger" });
    }
  };

  //
  // ─── RENDER FORM ──────────────────────────────────────────────────────────
  //
  return (
    <div className="py-4 px-2">
      {/* ── TAB SWITCH ───────────────────────────────────────────────────────── */}
      <div className="flex justify-start mb-4">
        <button
          type="button"
          className={`px-4 py-2 rounded‐t-xl ${
            mode === "market" ? "dark:text-white font-semibold" : " text-gray-300"
          }`}
          onClick={() => setMode("market")}
        >
          Market
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded‐t-xl ${
            mode === "limit" ? "dark:text-white font-semibold" : "text-gray-300"
          }`}
          onClick={() => setMode("limit")}
        >
          Limit
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* — Account Dropdown — */}
        <Autocomplete
          id="Account"
          isClearable={false}
          items={accounts}
          label="Account"
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

        <p className="text-sm text-gray-600">
          Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
        </p>

        {/* ── If “Limit” mode, show Price input ────────────────────────────────── */}
        {mode === "limit" && (
          <Input
            required
            label="Price (USDT)"
            type="number"
            min={0.0001}
            step="0.01"
            placeholder="e.g. 30,000"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
          />
        )}

        {/* ── Quantity Input ─────────────────────────────────────────────────── */}
        <Input
          required
          label="Quantity"
          type="number"
          min={0.000001}
          step="0.000001"
          placeholder="e.g. 0.01"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            setPercentQuickQty(null);
          }}
        />

        {/* ── Quick‐Select Percentage Buttons (qty) ───────────────────────────── */}
        <div className="flex items-center gap-2">
          {[10, 25, 50, 75, 100].map((p) => (
            <button
              key={p}
              type="button"
              className={`px-3 py-1 rounded-xl text-[12px] ${
                percentQuickQty === p
                  ? "bg-blue-600 text-white"
                  : "bg-default-200 text-gray-200"
              }`}
              onClick={() => handleQuickQty(p)}
            >
              {p}%
            </button>
          ))}
        </div>

        {/* ── TP/SL Toggle ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Switch
            color="success"
            size="sm"
            isSelected={enableTPSL}
            onValueChange={setEnableTPSL}
          />
          <span className="text-sm text-gray-700">TP/SL</span>
        </div>

        {/* ── TP / SL Inputs & Quick‐Select Buttons ───────────────────────────── */}
        <div className="space-y-2">
          <Input
            label="Take Profit (%)"
            type="number"
            min={0.01}
            max={500}
            step={0.01}
            placeholder="e.g. 5"
            value={takeProfitPct}
            onChange={(e) => setTakeProfitPct(e.target.value)}
            disabled={!enableTPSL}
            required={enableTPSL}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {[5, 10, 25, 50, 100, 150].map((p) => (
              <button
                key={p}
                type="button"
                className={`px-2 py-1 rounded-2xl text-[12px] ${
                  enableTPSL
                    ? "bg-default-200 text-gray-200"
                    : "bg-default-100 text-gray-400 cursor-not-allowed"
                }`}
                onClick={() => enableTPSL && setTakeProfitPct(String(p))}
                disabled={!enableTPSL}
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

          <Input
            label="Stop Loss (%)"
            type="number"
            min={0.01}
            max={500}
            step={0.01}
            placeholder="e.g. 5"
            value={stopLossPct}
            onChange={(e) => setStopLossPct(e.target.value)}
            disabled={!enableTPSL}
            required={enableTPSL}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {[20, 30, 40, 50, 60, 70].map((p) => (
              <button
                key={p}
                type="button"
                className={`px-2 py-1 rounded-2xl text-[12px] ${
                  enableTPSL
                    ? "bg-default-200 text-gray-200"
                    : "bg-default-100 text-gray-400 cursor-not-allowed"
                }`}
                onClick={() => enableTPSL && setStopLossPct(String(p))}
                disabled={!enableTPSL}
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

        {/* ── SUBMIT BUTTONS ───────────────────────────────────────────────────── */}
        <div className="flex gap-4 mt-4">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-2xl py-3"
            type="submit"
            value="buy"
          >
            Buy
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-2xl py-3"
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
