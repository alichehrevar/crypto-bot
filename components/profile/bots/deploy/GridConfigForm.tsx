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
import {SymbolFilter, SymbolFilterResponse} from "@/types/profile/CurrencyType";
import { RawBalanceResponse } from "@/types/profile/WalletBalanceType";
import { BotProps } from "@/types/profile/bots/StrategyParams";
import LabelTag from "@/components/shared/ui/Label";

// Props for this form: which grid‐tab is active, and a callback for closing
export interface GridConfigFormProps {
  mode: "standard" | "infinity" | "dynamic";
  selectedParentTab: string;
  onCloseAction: () => void;
}

export default function GridConfigForm({
   mode,
   selectedParentTab,
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

  const [symbols, setSymbols] = useState<SymbolFilter[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC/USDT");

  // Common Bot fields
  const [name, setName] = useState<string>("");
  const [riskStrategy, setRiskStrategy] = useState<string>("");

  //
  // ─── GRID‐SPECIFIC STATE ───────────────────────────────────────────────
  //

  // Lower and Upper Price (required for Standard & Dynamic)
  const [lowerPrice, setLowerPrice] = useState<string>("");
  const [upperPrice, setUpperPrice] = useState<string>("");
  const [priceRangeError, setPriceRangeError] = useState<string>("");

  // Base Fund (USDT) — must not exceed availableBalance
  const [baseFund, setBaseFund] = useState<string>("");
  const [baseFundError, setBaseFundError] = useState<string>("");

  const [gridCount, setGridCount] = useState<string>("10"); // number of grid lines

  // Percentage / Fixed
  const [usePercentage, setUsePercentage] = useState<boolean>(true);
  const [investmentAmount, setInvestmentAmount] = useState<string>(""); // % if percentage mode

  // TP/SL toggles + values (common to all modes)
  const [enableTPSL, setEnableTPSL] = useState<boolean>(true);
  const [takeProfitPct, setTakeProfitPct] = useState<string>("5");
  const [stopLossPct, setStopLossPct] = useState<string>("5");

  // Trailing TP/SL toggle
  const [enableTrailing, setEnableTrailing] = useState<boolean>(true);

  // For “Infinity” mode only: Bollinger toggle
  const [useBollinger, setUseBollinger] = useState<boolean>(true);

  // “Dynamic” (AI‐driven) only: retrain frequency
  const [retrainInterval, setRetrainInterval] = useState<string>("3600000");

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

    // 3) Load risk strategies (bots/botProps)
    (async () => {
      try {
        const res = await getData("/bots/botProps");

        if (!res.success) {
          addToast({ title: "Error getting bot parameters", color: "danger" });
        } else {
          setBotProps(res.props);
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
      const res: RawBalanceResponse = await getData(`/accounts/${accountId}/balance`);

      if (!res.success) {
        addToast({
          title: res.error,
          color: "danger"
        })

        return
      }

      if (res.data) {
        const spotEntry = selectedParentTab === 'spot' ? res.data.find(b => b.accountType === 'spot') : res.data.find(b => b.accountType === 'futures');
        const free = parseFloat(spotEntry?.usdtBalance ?? '0');

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
  // ─── VALIDATE LOWER/UPPER PRICE ─────────────────────────────────────────
  //
  function onPriceRangeChange(
    newLower: string,
    newUpper: string
  ) {
    setLowerPrice(newLower);
    setUpperPrice(newUpper);

    const low = parseFloat(newLower);
    const high = parseFloat(newUpper);

    if (isNaN(low) || isNaN(high)) {
      setPriceRangeError("Both prices must be valid numbers");
    } else if (low <= 0 || high <= 0) {
      setPriceRangeError("Prices must be positive");
    } else if (low >= high) {
      setPriceRangeError("Lower Price must be less than Upper Price");
    } else {
      setPriceRangeError("");
    }
  }

  //
  // ─── VALIDATE BASE FUND INPUT ────────────────────────────────────────────
  //
  function onBaseFundChange(val: string) {
    setBaseFund(val);

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

    // Validate errors
    if ((mode === "standard" || mode === "dynamic") && priceRangeError) {
      addToast({ title: priceRangeError, color: "danger" });

      return;
    }
    if (baseFundError) {
      addToast({ title: baseFundError, color: "danger" });

      return;
    }

    setLoading(true);

    const payload: any = {
      name: name.trim() || `${selectedSymbol} Grid Bot`,
      accountId: selectedAccountId?.toString() || "",
      symbol: selectedSymbol,

      // marketInfo.baseFund
      baseFund: parseFloat(baseFund) || 0,

      tradeFund: 0,
      riskStrategy,
      botType: "grid",

      strategy:
        mode === "standard"
          ? "default"
          : mode === "infinity"
            ? "dynamic"
            : "optimized",

      gridConfig: {
        // Only send LP/UP in Standard & Dynamic
        lowerPrice:
          mode === "standard" || mode === "dynamic"
            ? parseFloat(lowerPrice) || 0
            : null,
        upperPrice:
          mode === "standard" || mode === "dynamic"
            ? parseFloat(upperPrice) || 0
            : null,

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

        volatilityBasedSL: mode !== "standard",
        trailingStop: enableTrailing,
        ATRMultiplier: 3,
      },
    };

    if (mode === "dynamic") {
      payload.aiModel = {
        retrainInterval: parseInt(retrainInterval, 10) || 3600000,
      };
    }

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
        <div className="space-y-2">
          <LabelTag id="botName" title="Bot Name" />
          <Input
            required
            id="botName"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
              <AutocompleteItem key={s.id} textValue={s.symbol}>
                {s.symbol}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>
        <p className="text-sm text-gray-600">
          Available balance: <b>{availableBalance.toFixed(2)} USDT</b>
        </p>

        {/* — Base Fund — */}
        <div className="space-y-2">
          <LabelTag id="baseFund" title="Base Fund (USDT)" />
          <Input
            required
            id="baseFund"
            max={availableBalance}
            min={0}
            step="0.01"
            type="number"
            value={baseFund}
            onChange={(e) => onBaseFundChange(e.target.value)}
          />
          {baseFundError && (
            <p className="text-[12px] text-red-500">{baseFundError}</p>
          )}
        </div>

        {/* — Risk Strategy Dropdown — */}
        <div className="space-y-2">
          <LabelTag id="riskStrategy" title="Risk Strategy" />
          <Autocomplete
            id="riskStrategy"
            isClearable={false}
            onSelectionChange={(k) => k && setRiskStrategy(k.toString())}
          >
            {botProps.riskStrategyOptions.map((rs) => (
              <AutocompleteItem key={rs} textValue={rs}>
                {rs}
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>

        {/* ── GRID CONFIGURATION SECTION ── */}
        <div className="border-t border-default-100 pt-4 space-y-4">
          {/* — Lower & Upper Price (Standard & Dynamic) — */}
          {(mode === "standard" || mode === "dynamic") && (
            <>
              <div className="space-y-2">
                <LabelTag id="lowerPrice" title="Lower Price (USDT)" />
                <Input
                  required
                  id="lowerPrice"
                  step="0.01"
                  type="number"
                  value={lowerPrice}
                  onChange={(e) =>
                    onPriceRangeChange(e.target.value, upperPrice)
                  }
                />
              </div>
              <div className="space-y-2">
                <LabelTag id="upperPrice" title="Upper Price (USDT)" />
                <Input
                  required
                  id="upperPrice"
                  step="0.01"
                  type="number"
                  value={upperPrice}
                  onChange={(e) =>
                    onPriceRangeChange(lowerPrice, e.target.value)
                  }
                />
                {priceRangeError && (
                  <p className="text-[12px] text-red-500">{priceRangeError}</p>
                )}
              </div>
            </>
          )}

          {/* — Number of Grids — */}
          <div className="space-y-2">
            <LabelTag id="numberOfGrids" title="Number of Grids" />
            <Input
              required
              id="numberOfGrids"
              min={1}
              step={1}
              type="number"
              value={gridCount}
              onChange={(e) => setGridCount(e.target.value)}
            />
          </div>

          {/* — Percentage / Fixed Toggle — */}
          <div className="flex items-center justify-between flex-row-reverse gap-2">
            <Switch
              color="success"
              isSelected={usePercentage}
              size="sm"
              onValueChange={setUsePercentage}
            />
            <span className="text-sm text-gray-700">Percentage Grids</span>
          </div>

          {/* — Investment (%) — disabled if Percentage is off — */}
          <div className="space-y-2">
            <LabelTag id="investment" title="Investment (%)" />
            <Input
              disabled={!usePercentage}
              id="investment"
              max={100}
              min={1}
              required={usePercentage}
              type="number"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
            />
          </div>

          {/* — TP/SL Toggle — */}
          <div className="flex items-center justify-between flex-row-reverse gap-2 pt-2">
            <Switch
              color="success"
              isSelected={enableTPSL}
              size="sm"
              onValueChange={setEnableTPSL}
            />
            <span className="text-sm text-gray-700">Bot TP/SL</span>
          </div>

          {/* — Take Profit and Stop Loss inputs; disabled if TP/SL is off — */}
          <div className="space-y-2">
            <LabelTag id="takeProfit" title="Take Profit (%)" />
            <Input
              disabled={!enableTPSL}
              id="takeProfit"
              max={500}
              min={0.1}
              required={enableTPSL}
              step={0.1}
              type="number"
              value={takeProfitPct}
              onChange={(e) => setTakeProfitPct(e.target.value)}
            />
            <div className="flex items-center gap-2 flex-nowrap">
              {[5, 10, 25, 50, 100, 150].map((p) => (
                <button
                  key={p}
                  className={`px-2 py-1 flex-1 rounded-2xl text-[12px] ${
                    enableTPSL
                      ? "bg-default-200"
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
          </div>

          <div className="space-y-2">
            <LabelTag id="stopLoss" title="Stop Loss (%)" />
            <Input
              disabled={!enableTPSL}
              id="stopLoss"
              max={500}
              min={0.1}
              required={enableTPSL}
              step={0.1}
              type="number"
              value={stopLossPct}
              onChange={(e) => setStopLossPct(e.target.value)}
            />
            <div className="flex items-center flex-nowrap gap-2">
              {[20, 30, 40, 50, 60, 70].map((p) => (
                <button
                  key={p}
                  className={`px-2 py-1 flex-1 rounded-2xl text-[12px] ${
                    enableTPSL
                      ? "bg-default-200"
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
          </div>

          {/* — Trailing TP/SL Toggle — */}
          <div className="flex items-center justify-between flex-row-reverse gap-2 pt-2">
            <Switch
              color="success"
              isSelected={enableTrailing}
              size="sm"
              onValueChange={setEnableTrailing}
            />
            <span className="text-sm text-gray-700">Trailing TP/SL</span>
          </div>

          {/* — Infinity‐Only: Bollinger Bands Toggle — */}
          {mode === "infinity" && (
            <div className="flex items-center gap-2 pt-2">
              <Switch
                color="success"
                isSelected={useBollinger}
                size="sm"
                onValueChange={setUseBollinger}
              />
              <span className="text-sm text-gray-700">Use Bollinger Bands</span>
            </div>
          )}

          {/* — Dynamic‐Only: Retrain Interval — */}
          {mode === "dynamic" && (
            <div className="space-y-2">
              <LabelTag id="retrainInterval" title="Retrain Interval (ms)" />
              <Input
                required
                id="retrainInterval"
                min={60000}
                step={60000}
                type="number"
                value={retrainInterval}
                onChange={(e) => setRetrainInterval(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* ── SUBMIT BUTTON ───────────────────────────────────────────────── */}
        <Button
          className="w-full px-4 dark:bg-white dark:hover:bg-gray-200 transition-all duration-300 dark:text-black font-semibold rounded-2xl text-[14px] py-3"
          disabled={
            loading ||
            (mode !== "infinity" && priceRangeError !== "") || // require valid LP/UP
            !!baseFundError ||
            parseFloat(baseFund) <= 0
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
