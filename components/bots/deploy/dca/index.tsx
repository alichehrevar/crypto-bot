"use client";

import React, { FormEvent, Key, useEffect, useState } from "react";
import {addToast, Button, Checkbox, Spinner} from "@heroui/react";

import { MarketListItem } from "@/types/MarketList";
import {AccountsResponse, ExchangeAccount} from "@/types/profile/AccountType";
import {RawBalanceResponse} from "@/types/profile/WalletBalanceType";
import {getData} from "@/actions/get";
import {sendRequest} from "@/actions/post";
import Combobox from "@/components/shared/ui/Combobox";
import NumericInput from "@/components/shared/ui/NumericInput";
import AccordionItem from "@/components/shared/ui/AccordionItem";

export interface DcaConfigFormProps {
    onCloseAction: () => void;
    selectedSymbol?: MarketListItem | null;
}

export default function DcaConfigForm({
       onCloseAction,
       selectedSymbol
   }: DcaConfigFormProps) {
    //
    // ─── STATE MANAGEMENT (Remains in the parent container) ──────────────────
    //
    const [isOpen, setIsOpen] = useState(false)

    const [accounts, setAccounts] = useState<ExchangeAccount[]>([]);
    const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string>();
    const [availableBalance, setAvailableBalance] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    // Common Bot fields
    const [priceDeviation, setPriceDeviation] = useState<number>(1);
    const [takeProfit, setTakeProfit] = useState<number>(1.5);
    const [baseOrderVolume, setBaseOrderVolume] = useState<number>();
    const [safetyOrderVolume, setSafetyOrderVolume] = useState<number>();
    const [maxSafetyOrders, setMaxSafetyOrders] = useState<number>();
    const [triggerPrice, setTriggerPrice] = useState<number>();
    const [stepScale, setStepScale] = useState<number>();
    const [volumeScale, setVolumeScale] = useState<number>();
    const [lowerPrice, setLowerPrice] = useState<number>();
    const [upperPrice, setUpperPrice] = useState<number>();
    const [stopLoss, setStopLoss] = useState<number>();
    const [terminateOnStopLoss, setTerminateOnStopLoss] = useState<boolean>(false);


    //
    // ─── EFFECTS & HANDLERS (Remain in parent) ──────────────────────────────
    //
    useEffect(() => {
        // This is where you would fetch your accounts data
        const fetchAccounts = async () => {
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
        };

        fetchAccounts();
    }, [selectedSymbol]);

    async function handleAccountChange(accountId: Key | null) {
        setBalanceLoading(true)
        setSelectedAccountId(accountId?.toString());
        if (!accountId) {
            setAvailableBalance(0);

            return;
        }
        try {
            const res: RawBalanceResponse = await getData(`/accounts/${accountId}/balance`);
            const spotEntry = res.data?.find(b => b.accountType.toLowerCase() === 'spot');
            const free = parseFloat(spotEntry?.usdtBalance ?? '0');

            setAvailableBalance(free);
            // Optionally auto-fill a percentage of balance
            // setInvestment((free * 0.5).toFixed(2));
        } catch {
            addToast({ title: "Failed to load balance", color: "danger" });
            setAvailableBalance(0);
        } finally {
            setBalanceLoading(false);
        }
    }

    //
    // ─── UPDATED FORM SUBMISSION ─────────────────────────────────────────────
    //
    const handleDeploy = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setLoading(true);

        // Find the selected account to determine the exchange name
        const selectedAccount = accounts.find(acc => acc._id === selectedAccountId);

        if (!selectedAccount) {
            addToast({ title: "Please select an account.", color: "danger" });
            setLoading(false);

            return;
        }


        const payload: any = {
            accountId: selectedAccountId,
            accountType: selectedAccount.name, // e.g., 'bingx'
            symbol: selectedSymbol?.id,

            priceDeviation,
            takeProfit,
            baseOrderVolume,
            safetyOrderVolume,
            maxSafetyOrders,
            triggerPrice,
            stepScale,
            volumeScale,
            lowerPrice,
            upperPrice,
            stopLoss,
            terminateOnStopLoss,
        };

        try {
            // Send the raw payload object to the new endpoint
            const res = await sendRequest(payload, "/bots/dca");

            if (res.success) {
                addToast({ title: "DCA Bot deployed!", color: "success" });
                onCloseAction();
            } else {
                addToast({ title: res.error || "Deploy failed", color: "danger" });
            }
        } catch {
            addToast({ title: "Error deploying dca bot!", color: "danger" });
        } finally {
            setLoading(false);
        }
    };

    //
    // ─── RENDER (Composition of smaller components) ──────────────────────────
    //
    return (
        <div className="py-4">
            <form className="space-y-4 overflow-x-hidden px-2" onSubmit={handleDeploy}>

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

                <div className="text-sm flex items-center text-blue-400/80">
                    Available balance:
                    {balanceLoading
                        ? <span className="inline h-3 -mt-10 ms-3">
                            <Spinner color="primary" size="sm" variant="wave" />
                        </span>
                        : <span className="ms-1">{availableBalance.toFixed(2)} USDT</span>
                    }
                </div>

                <NumericInput
                    label="Price Deviation"
                    max={30}
                    min={0.2}
                    step={0.01}
                    unit="%"
                    usePercentageStep={true}
                    value={priceDeviation?.toString()}
                    onChange={e => setPriceDeviation(Number(e))}
                />

                <NumericInput
                    label="Take Profit (%)"
                    max={200}
                    min={0.5}
                    step={0.1}
                    usePercentageStep={true}
                    value={takeProfit.toString()}
                    onChange={e => setTakeProfit(Number(e))}
                />

                <NumericInput
                    label="Base Order Size"
                    min={0}
                    unit="USDT"
                    usePercentageStep={true}
                    value={baseOrderVolume?.toString()}
                    onChange={e => setBaseOrderVolume(Number(e))}
                />

                <NumericInput
                    label="DCA Order Size"
                    min={0}
                    step={0.1}
                    unit="USDT"
                    usePercentageStep={true}
                    value={safetyOrderVolume?.toString()}
                    onChange={e => setSafetyOrderVolume(Number(e))}
                />

                <NumericInput
                    label="Max DCA Orders"
                    min={0}
                    usePercentageStep={true}
                    value={maxSafetyOrders?.toString()}
                    onChange={e => setMaxSafetyOrders(Number(e))}
                />

                <AccordionItem
                    isOpen={isOpen}
                    title="Advanced (Optional)"
                    onToggle={() => setIsOpen(!isOpen)}
                >
                    <NumericInput
                        label="Trigger Price"
                        min={0}
                        usePercentageStep={true}
                        value={triggerPrice?.toString()}
                        onChange={e => setTriggerPrice(Number(e))}
                    />
                    <NumericInput
                        label="Price deviation multiplier"
                        max={10}
                        min={0.1}
                        step={0.1}
                        usePercentageStep={true}
                        value={stepScale?.toString()}
                        onChange={e => setStepScale(Number(e))}
                    />
                    <NumericInput
                        label="DCA order size multiplier"
                        max={10}
                        min={0.1}
                        step={0.1}
                        usePercentageStep={true}
                        value={volumeScale?.toString()}
                        onChange={e => setVolumeScale(Number(e))}
                    />
                    <div className="grid grid-cols-11">
                        <div className="col-span-5">
                            <NumericInput
                                label="Lower Price"
                                max={10}
                                min={0.1}
                                step={0.1}
                                usePercentageStep={true}
                                value={lowerPrice?.toString()}
                                onChange={e => setLowerPrice(Number(e))}
                            />
                        </div>
                        <div className="col-span-1 h-full flex items-end justify-center pb-2 text-gray-500/50">-</div>
                        <div className="col-span-5">
                            <NumericInput
                                label="Upper Price"
                                max={10}
                                min={0.1}
                                step={0.1}
                                usePercentageStep={true}
                                value={upperPrice?.toString()}
                                onChange={e => setUpperPrice(Number(e))}
                            />
                        </div>
                    </div>
                    <NumericInput
                        label="Stop Loss"
                        min={0.1}
                        unit="%"
                        usePercentageStep={true}
                        value={stopLoss?.toString()}
                        onChange={e => setStopLoss(Number(e))}
                    />
                    <Checkbox
                        defaultSelected={terminateOnStopLoss}
                        size="sm"
                        onChange={e => setTerminateOnStopLoss(e.target.checked)}
                    >
                        <small>End the bot once stop loss is triggered</small>
                    </Checkbox>
                </AccordionItem>

                <Button
                    className="w-full"
                    disabled={loading}
                    isLoading={loading}
                    type="submit"
                >
                    Deploy DCA Bot
                </Button>
            </form>
        </div>
    );
}
