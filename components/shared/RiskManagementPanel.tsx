'use client';

import React, { useState } from 'react';

import NumericInput from "@/components/shared/ui/NumericInput";
import Combobox from "@/components/shared/ui/Combobox";
import {DropdownOption} from "@/types/ui/DropdownOption";

// =====================================================================
// --- MOCK DATA & CONSTANTS ---
// =====================================================================

const STRATEGIES: DropdownOption[] = [
    {name: 'Fixed Fractional (Standard)'},
    {name: 'Kelly Criterion'},
    {name: 'Volatility-Based'}
];

// =====================================================================
// --- MAIN COMPONENT ---
// =====================================================================

export default function RiskManagementPanel() {
    const [investment, setInvestment] = useState('1000');
    const [investmentPerTrade, setInvestmentPerTrade] = useState('1');
    const [maxSuccessiveLoss, setMaxSuccessiveLoss] = useState('5');
    const [botTakeProfit, setBotTakeProfit] = useState('10');
    const [botStopLoss, setBotStopLoss] = useState('5');
    const [positionTakeProfit, setPositionTakeProfit] = useState('2');
    const [positionStopLoss, setPositionStopLoss] = useState('1');
    const [riskStrategy, setRiskStrategy] = useState(STRATEGIES[0].name);

    return (
        <div className="bg-dark-gray text-white p-8 rounded-xl shadow-2xl flex flex-col justify-center" style={{ width: '576px', height: '360px' }}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                <NumericInput label="Investment" max={1000000} min={100} placeholder="e.g., 1000" step={0.1} unit="USDT" usePercentageStep={true} value={investment} onChange={setInvestment} />
                <NumericInput label="Investment Per Trade" max={100} min={0.1} placeholder="e.g., 1" step={0.1} unit="%" value={investmentPerTrade} onChange={setInvestmentPerTrade} />
                <Combobox label="Risk Strategy" options={STRATEGIES} selected={riskStrategy} setSelected={setRiskStrategy} />
                <NumericInput label="Maximum Successive Loss" max={100} min={1} placeholder="e.g., 5" step={1} unit="Trades" value={maxSuccessiveLoss} onChange={setMaxSuccessiveLoss} />
                <NumericInput label="Position Take Profit" max={300} min={1} placeholder="e.g., 1.5" step={1} unit="%" value={positionTakeProfit} onChange={setPositionTakeProfit} />
                <NumericInput label="Position Stop Loss" max={100} min={0} placeholder="e.g., 0.5" step={1} unit="%" value={positionStopLoss} onChange={setPositionStopLoss} />
                <NumericInput label="Bot Take Profit" max={300} min={1} placeholder="e.g., 10" step={5} unit="%" value={botTakeProfit} onChange={setBotTakeProfit} />
                <NumericInput label="Bot Stop Loss" max={100} min={0} placeholder="e.g., 2" step={5} unit="%" value={botStopLoss} onChange={setBotStopLoss} />
            </div>
        </div>
    );
};
