'use client';

import React, { useState } from 'react';

import Input from '@/components/shared/ui/Input'
import SearchableCombobox from "@/components/shared/ui/SearchableCombobox";
import Combobox from "@/components/shared/ui/Combobox";
import {DropdownOption} from "@/types/ui/DropdownOption";
import RadioGroup from "@/components/shared/ui/RadioGroup";
import Slider from "@/components/shared/ui/Slider";

// =====================================================================
// --- MOCK DATA ---
// In a real application, this would be fetched from an API.
// =====================================================================

const BROKERS: DropdownOption[] = [
    { name: 'Binance', logo: 'https://img.icons8.com/color/48/binance.png' },
    { name: 'ByBit', logo: 'https://img.icons8.com/color/48/000000/bybit.png' },
    { name: 'OKX', logo: 'https://img.icons8.com/color/48/okx.png' },
    { name: 'Coinbase', logo: 'https://img.icons8.com/color/48/coinbase.png' },
    { name: 'Kraken', logo: 'https://img.icons8.com/color/48/kraken.png' },
];

const SYMBOLS: DropdownOption[] = [
    { name: 'BTCUSDT', logo: 'https://img.icons8.com/color/48/bitcoin.png' },
    { name: 'ETHUSDT', logo: 'https://img.icons8.com/color/48/ethereum.png' },
    { name: 'SOLUSDT', logo: 'https://img.icons8.com/color/48/solana.png' },
    { name: 'XRPUSDT', logo: 'https://img.icons8.com/color/48/xrp.png' },
    { name: 'DOGEUSDT', logo: 'https://img.icons8.com/color/48/dogecoin.png' },
];

// =====================================================================
// --- REUSABLE SUB-COMPONENTS ---
// =====================================================================






// --- MAIN COMPONENT ---
export default function CreatorsHubPanel() {
    const [account, setAccount] = useState(BROKERS[0].name);
    const [symbol, setSymbol] = useState(SYMBOLS[0].name);
    const [marginType, setMarginType] = useState('Isolated');
    const [positionMode, setPositionMode] = useState('Single');
    const [singleModeSide, setSingleModeSide] = useState('Long');
    const [leverageLong, setLeverageLong] = useState(50);
    const [leverageShort, setLeverageShort] = useState(50);

    const showLongLeverage = positionMode === 'Hedge' || (positionMode === 'Single' && (singleModeSide === 'Long' || singleModeSide === 'Both'));
    const showShortLeverage = positionMode === 'Hedge' || (positionMode === 'Single' && (singleModeSide === 'Short' || singleModeSide === 'Both'));
    const isDualLeverage = showLongLeverage && showShortLeverage;

    return (
        <div className="bg-dark-gray text-white p-6 rounded-lg shadow-2xl flex flex-col justify-between" style={{ width: '576px', height: '390px' }}>
            <Input id="bot-name" placeholder="e.g., ETH Momentum Scalper" title="Bot Name" />
            <div className="grid grid-cols-2 gap-4">
                <Combobox
                    label="Account"
                    options={BROKERS}
                    placeholder="Select Account"
                    selected={account}
                    setSelected={setAccount}
                />
                <SearchableCombobox
                    id="symbol"
                    label="Symbol"
                    options={SYMBOLS}
                    placeholder="Search Symbol"
                    selected={symbol}
                    setSelected={setSymbol}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-5">
                    <RadioGroup label="Margin" options={[{ value: 'Isolated', label: 'Isolated' }, { value: 'Cross', label: 'Cross' }]} selectedValue={marginType} onChange={setMarginType} />
                    <RadioGroup label="Position" options={[{ value: 'Hedge', label: 'Hedge' }, { value: 'Single', label: 'Single' }]} selectedValue={positionMode} onChange={setPositionMode} />
                </div>
                <div className="flex flex-col justify-end">
                    {positionMode === 'Single' && (<RadioGroup label="Side" options={[{ value: 'Long', label: 'Long' }, { value: 'Short', label: 'Short' }, { value: 'Both', label: 'Both' }]} selectedValue={singleModeSide} onChange={setSingleModeSide} />)}
                </div>
            </div>
            <div className="relative h-[68px] overflow-hidden">
                <div className="transition-all duration-500 ease-in-out absolute" style={{ width: isDualLeverage ? 'calc(50% - 8px)' : '100%', transform: showLongLeverage ? 'translateX(0)' : 'translateX(-100%)', opacity: showLongLeverage ? 1 : 0 }}>
                    <Slider colorClass="text-green-500" label="Leverage Long" value={leverageLong} onChange={setLeverageLong} />
                </div>
                <div className="transition-all duration-500 ease-in-out absolute" style={{ width: isDualLeverage ? 'calc(50% - 8px)' : '100%', right: 0, transform: showShortLeverage ? 'translateX(0)' : 'translateX(100%)', opacity: showShortLeverage ? 1 : 0 }}>
                    <Slider colorClass="text-red-500" label="Leverage Short" value={leverageShort} onChange={setLeverageShort} />
                </div>
            </div>
        </div>
    );
};
