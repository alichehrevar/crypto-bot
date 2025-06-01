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
import { SymbolFilterResponse } from "@/types/profile/CurrencyType";
import { WalletBalance } from "@/types/profile/WalletBalanceType";
import { BotProps } from "@/types/profile/bots/StrategyParams";

interface Currency {
  _id: string;
  symbol: string;
}

// Props for this form: which grid‐tab is active, and a callback for closing
export interface GridConfigFormProps {
  mode: "standard" | "infinity" | "dynamic";
  onCloseAction: () => void;
}

export default function GridConfigForm({
                                         mode,
                                         onCloseAction,
                                       }: GridConfigFormProps) {
  //
  // ─── LOOKUPS & COMMON STATE ────────────────────────────────────────────
  //
  const [botProps, setBotProps] = useState<BotProps>({
    riskStrategyOptions: [],
    indicatorOptions: [],
    OptMethod: [],
    timeframeOptions: [],
    defaultStrategyParams: {},
  });

  const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<Key>();
  const [availableBalance, setAvailableBalance] = useState<number>(0);

  const [symbols, setSymbols] = useState<Currency[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");

  // Common Bot fields
  const [name, setName] = useState<string>("");
  const [riskStrategy, setRiskStrategy] = useState<string>("");

  //
  // ─── GRID‐SPECIFIC STATE ───────────────────────────────────────────────
  //

  // Base Fund (USDT) — must not exceed availableBalance
  const [baseFund, setBaseFund] = useState<string>("");
  const [baseFundError, setBaseFundError] = useState<string>(""); // for validation

  const [gridCount, setGridCount] = useState<string>("10"); // number of grid lines

  // Percentage / Fixed
  const [usePercentage, setUsePercentage] = useState<boolean>(true);
  const [investmentAmount, setInvestmentAmount] = useState<string>(""); // % if percentage mode

  // TP/SL toggles + values (common to all modes)
  const [enableTPSL, setEnableTPSL] = useState<boolean>(true);
  const [takeProfitPct, setTakeProfitPct] = useState<string>("5"); // e.g. “5” means 5%
  const [stopLossPct, setStopLossPct] = useState<string>("5"); // e.g. 5%

  // Trailing TP/SL toggle (common to all) – default true
  const [enableTrailing, setEnableTrailing] = useState<boolean>(true);

  // For “Infinity” mode only: Bollinger toggle (default true)
  const [useBollinger, setUseBollinger] = useState<boolean>(true);

  // “Dynamic” (AI‐driven) only: modelPath and retrain frequency
  const [retrainInterval, setRetrainInterval] = useState<string>("3600000"); // ms

  const [loading, setLoading] = useState<boolean>(false);

  //
  // ─── EFFECT TO LOAD LOOKUPS ─────────────────────────────────────────────
  //
  useEffect(() => {
    // 1) Load currency symbols
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

    // 2) Load user’s exchange accounts
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

    // 3) Load risk strategies (so user can choose)
    (async () => {
      try {
        const res = await getData("/bots/botProps");
        if (!res.success) {
          addToast({ title: "Error getting bot parameters", color: "danger" });
        } else {
          setBotProps(res.props);
          // Pick a default risk strategy
          setRiskStrategy(res.props.riskStrategyOptions[0] || "");
        }
      } catch {
        addToast({ title: "Failed to load bot parameters", color: "danger" });
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
      setBaseFund("");
      setBaseFundError("");
      return;
    }
    try {
      const res = await getData(`/accounts/${accountId}/balance`);
      if (res.balance) {
        const usdtBal: WalletBalance = res.balance.find(
          (b: WalletBalance) => b.asset === "USDT"
        );
        const free = usdtBal ? parseFloat(usdtBal.free) : 0;
        setAvailableBalance(free);
        setBaseFund(free.toString());
        setBaseFundError("");
      } else {
        addToast({ title: res.error || "Unable to load balance", color: "danger" });
        setAvailableBalance(0);
        setBaseFund("");
        setBaseFundError("");
      }
    } catch {
      addToast({ title: "Failed to load balance", color: "danger" });
      setAvailableBalance(0);
      setBaseFund("");
      setBaseFundError("");
    }
  }

  //
  // ─── VALIDATE BASE FUND INPUT ────────────────────────────────────────────
  //
  function onBaseFundChange(val: string) {
    setBaseFund(val);

    // Validate: must be ≤ availableBalance
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setBaseFundError("Base Fund must be a positive number");
    } else if (num > availableBalance) {
      setBaseFundError("Base Fund cannot exceed available balance");
    } else {
      setBaseFundError("");
    }
  }

  //
  // ─── FORM SUBMISSION ─────────────────────────────────────────────────────
  //
  const handleDeploy = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent submission if validation error
    if (baseFundError) {
      addToast({ title: baseFundError, color: "danger" });
      return;
    }

    setLoading(true);

    // Build payload matching backend BotModel for a grid bot
    //
    const payload: any = {
      name: name.trim() || `${selectedSymbol} Grid Bot`,
      accountId: selectedAccountId?.toString() || "",
      symbol: selectedSymbol,

      // Set marketInfo.baseFund based on Base Fund input
      baseFund: parseFloat(baseFund) || 0,

      // tradeFund can default to 0 or be omitted
      tradeFund: 0,

      riskStrategy,
      botType: "grid",

      // Bot “strategy” maps to:
      //  - standard → "default"
      //  - infinity → "dynamic"
      //  - dynamic  → "optimized"
      strategy:
        mode === "standard"
          ? "default"
          : mode === "infinity"
            ? "dynamic"
            : "optimized",

      // For grid, send “gridConfig”
      gridConfig: {
        lowerPrice: null,
        upperPrice: null,

        gridCount: parseInt(gridCount, 10) || 0,

        gridType:
          mode === "infinity"
            ? "infinite"
            : usePercentage
              ? "percentage"
              : "fixed",

        gridStepPercentage: usePercentage
          ? parseFloat(investmentAmount) / 100 || 0.01
          : 0.01,

        takeProfitPct: enableTPSL ? parseFloat(takeProfitPct) : 0,
        stopLossPct: enableTPSL ? parseFloat(stopLossPct) : 0,

        // In “standard” mode: volatilityBasedSL = false
        // In infinity/dynamic: volatilityBasedSL = true
        volatilityBasedSL: mode !== "standard",

        trailingStop: enableTrailing,
        ATRMultiplier: 3,
      },
    };

    // If Dynamic (AI) mode, attach AI model parameters
    if (mode === "dynamic") {
      payload.aiModel = {
        retrainInterval: parseInt(retrainInterval, 10) || 3600000,
      };
    }

    // Stringify nested objects
    const body = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [
        k,
        typeof v === "object" ? JSON.stringify(v) : String(v),
      ])
    );

    try {
      const res = await sendRequest(body, "/bots/deploy");
      if (res.success) {
        addToast({ title: "Grid Bot deployed!", color: "success" });
      } else {
        addToast({ title: res.error || "Deploy failed", color: "danger" });
      }
    } catch {
      addToast({ title: "Error deploying grid bot!", color: "danger" });
    } finally {
      setLoading(false);
      onCloseAction();
    }
  };

  //
  // ─── RENDER FORM ──────────────────────────────────────────────────────────
  //
  return (
    <div className="py-4">
      <form className="space-y-4 overflow-x-hidden" onSubmit={handleDeploy}>
        {/* — Bot Name — */}
        <Input
          required
          label="Bot Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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

        {/* — Symbol Dropdown — */}
        <Autocomplete
          defaultItems={symbols}
          id="Symbol"
          isClearable={false}
          label="Symbol"
          onSelectionChange={(k) => k && setSelectedSymbol(k.toString())}
        >
          {symbols.map((s) => (
            <AutocompleteItem key={s.symbol} textValue={s.symbol}>
              {s.symbol}
            </AutocompleteItem>
          ))}
        </Autocomplete>
        <p className="text-sm text-gray-600">
          Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
        </p>

        {/* — Base Fund — */}
        <Input
          required
          label="Base Fund (USDT)"
          type="number"
          min={0}
          max={availableBalance}
          step="0.01"
          value={baseFund}
          onChange={(e) => onBaseFundChange(e.target.value)}
        />
        {baseFundError && (
          <p className="text-[12px] text-red-500">{baseFundError}</p>
        )}

        {/* — Risk Strategy Dropdown — */}
        <Autocomplete
          id="RiskStrategy"
          isClearable={false}
          label="Risk Strategy"
          onSelectionChange={(k) => k && setRiskStrategy(k.toString())}
        >
          {botProps.riskStrategyOptions.map((rs) => (
            <AutocompleteItem key={rs} textValue={rs}>
              {rs}
            </AutocompleteItem>
          ))}
        </Autocomplete>

        {/* ── GRID CONFIGURATION SECTION ── */}
        <div className="border-t border-default-100 pt-4 space-y-4">
          {/* — Number of Grids — */}
          <Input
            required
            label="Number of Grids"
            type="number"
            min={1}
            step={1}
            value={gridCount}
            onChange={(e) => setGridCount(e.target.value)}
          />

          {/* — Percentage / Fixed Toggle — */}
          <div className="flex items-center justify-between flex-row-reverse gap-2">
            <Switch
              color="success"
              size="sm"
              isSelected={usePercentage}
              onValueChange={setUsePercentage}
            />
            <span className="text-sm text-gray-700">Percentage Grids</span>
          </div>

          {/* — Investment (%) — disabled if Percentage is off — */}
          <Input
            label="Investment (%)"
            type="number"
            min={1}
            max={100}
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            disabled={!usePercentage}
            required={usePercentage}
          />

          {/* — TP/SL Toggle — */}
          <div className="flex items-center justify-between flex-row-reverse gap-2 pt-2">
            <Switch
              color="success"
              size="sm"
              isSelected={enableTPSL}
              onValueChange={setEnableTPSL}
            />
            <span className="text-sm text-gray-700">Bot TP/SL</span>
          </div>

          {/* — Take Profit and Stop Loss inputs; disabled if TP/SL is off — */}
          <Input
            label="Take Profit (%)"
            type="number"
            min={0.1}
            max={500}
            step={0.1}
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
                    ? "bg-default-200"
                    : "bg-default-100 text-gray-400 cursor-not-allowed"
                }`}
                onClick={() => enableTPSL && setTakeProfitPct(String(p))}
                disabled={!enableTPSL}
              >
                {p}%
              </button>
            ))}
          </div>

          <Input
            label="Stop Loss (%)"
            type="number"
            min={0.1}
            max={500}
            step={0.1}
            value={stopLossPct}
            onChange={(e) => setStopLossPct(e.target.value)}
            disabled={!enableTPSL}
            required={enableTPSL}
          />
          <div className="flex items-center justify-between gap-2">
            {[20, 30, 40, 50, 60, 70].map((p) => (
              <button
                key={p}
                type="button"
                className={`px-2 py-1 rounded-2xl text-[12px] ${
                  enableTPSL
                    ? "bg-default-200"
                    : "bg-default-100 text-gray-400 cursor-not-allowed"
                }`}
                onClick={() => enableTPSL && setStopLossPct(String(p))}
                disabled={!enableTPSL}
              >
                {p}%
              </button>
            ))}
          </div>

          {/* — Trailing TP/SL Toggle — */}
          <div className="flex items-center justify-between flex-row-reverse gap-2 pt-2">
            <Switch
              color="success"
              size="sm"
              isSelected={enableTrailing}
              onValueChange={setEnableTrailing}
            />
            <span className="text-sm text-gray-700">Trailing TP/SL</span>
          </div>

          {/* — Infinity‐Only: Bollinger Bands Toggle — */}
          {mode === "infinity" && (
            <div className="flex items-center gap-2 pt-2">
              <Switch
                color="success"
                size="sm"
                isSelected={useBollinger}
                onValueChange={setUseBollinger}
              />
              <span className="text-sm text-gray-700">Use Bollinger Bands</span>
            </div>
          )}

          {/* — Dynamic‐Only: AI Model Path & Retrain Frequency — */}
          {mode === "dynamic" && (
            <>
              <Input
                required
                label="Retrain Interval (ms)"
                type="number"
                min={60000}
                step={60000}
                value={retrainInterval}
                onChange={(e) => setRetrainInterval(e.target.value)}
              />
            </>
          )}
        </div>

        {/* ── SUBMIT BUTTON ───────────────────────────────────────────────── */}
        <Button
          className="w-full px-4 dark:bg-white dark:hover:bg-gray-200 transition-all duration-300 dark:text-black font-semibold rounded-2xl text-[14px] py-3"
          disabled={
            loading ||
            !!baseFundError || // disable if baseFund is invalid
            parseFloat(baseFund) <= 0 // require a positive baseFund
          }
          isLoading={loading}
          type="submit"
        >
          {mode === "dynamic" ? "Optimize & Deploy" : "Start a Bot"}
        </Button>
      </form>
    </div>
  );
}
