'use client';

import React, {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';

import {DropdownOption} from "@/types/ui/DropdownOption";
import Combobox from "@/components/shared/ui/Combobox";
import {RadioOption} from "@/types/ui/RadioOption";
import RadioGroup from "@/components/shared/ui/RadioGroup";
import Switcher from "@/components/shared/ui/Switcher";

// =====================================================================
// --- MOCK DATA & CONSTANTS ---
// =====================================================================

const STRATEGY_TABS = ['Default', 'Optimized', 'Dynamic'];
const STANDARD_INDICATOR_OPTIONS: DropdownOption[] = [
    {name: 'RSI', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'},
    {name: 'MACD', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'},
    {name: 'Bollinger Bands', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'},
    {name: 'EMA Cross', logo: 'https://img.icons8.com/?size=100&id=61Ir6g5hzrHL&format=png&color=000000'}
];
const MAIN_INDICATOR_OPTIONS: DropdownOption[] = [
    {name: 'Chat-GPT', logo: 'https://img.icons8.com/?size=100&id=FBO05Dys9QCg&format=png&color=C1C1C1'},
    {name: 'Google Gemini', logo: 'https://img.icons8.com/?size=100&id=iBkBIBWE6tfT&format=png&color=000000'},
    {name: 'Grok', logo: 'https://img.icons8.com/?size=100&id=USGXKHXKl9X7&format=png&color=C1C1C1'},
    {name: '', logo: ''}, // Represents a separator
    ...STANDARD_INDICATOR_OPTIONS
];
const TIME_FRAMES: DropdownOption[] = [
    {name: '1m'},
    {name: '5m'},
    {name: '15m'},
    {name: '1h'},
    {name: '4h'},
    {name: '1d'}];
const OPTIMIZATION_METHODS: RadioOption[] = [
    {label: 'Genetic Algorithm', value: 'Genetic Algorithm'},
    {label: 'Grid Search', value: 'Grid Search'},
    {label: 'Bayesian', value: 'Bayesian'}
];
const SIMULATED_TRADES_OPTIONS: DropdownOption[] = [
    {name: '5'},
    {name: '10'},
    {name: '15'},
    {name: '20'},
    {name: '25'},
    {name: '30'}];
const OPTIMIZATION_ACCURACY_OPTIONS = [
    {name: '40%'},
    {name: '50%'},
    {name: '60%'},
    {name: '70%'},
    {name: '80%'},
    {name: '90%'}];
const BOT_ACCURACY_OPTIONS = [
    {name: '40%'},
    {name: '50%'},
    {name: '60%'},
    {name: '70%'},
    {name: '80%'},
    {name: '90%'}];
const ACCURACY_INTERVAL_OPTIONS = [
    {name: '30 min'},
    {name: '1 hour'},
    {name: '2 hour'},
    {name: '4 hour'},
    {name: '6 hour'},
    {name: '12 hour'},
    {name: '24 hour'}];

// =====================================================================
// --- REUSABLE SUB-COMPONENTS ---
// =====================================================================

const IndicatorRow: React.FC<{
    indicatorData: { id: number, indicator: DropdownOption; timeFrame: string };
    onChange: (value: any) => void;
    indicatorOptions: DropdownOption[];
}> = ({indicatorData, onChange, indicatorOptions}) => (
    <div className="grid grid-cols-3 gap-x-4">
        <div className="col-span-2">
            <Combobox
                label="Indicator"
                options={indicatorOptions}
                selected={indicatorData.indicator.name}
                setSelected={(indicator) => onChange({...indicatorData, indicator})}
            />
        </div>
        <Combobox
            label="Timeframe"
            options={TIME_FRAMES}
            selected={indicatorData.timeFrame}
            setSelected={(timeFrame) => onChange({...indicatorData, timeFrame})}
        />
    </div>
);

const StrategyTabs: React.FC<{ activeTab: string; setActiveTab: (tab: string) => void }> = ({
    activeTab,
    setActiveTab
}) => (
    <div className="relative flex space-x-2 bg-dark-semi-black p-1 rounded-md">
        {STRATEGY_TABS.map(tab => (
            <button
                key={tab}
                className={`${activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-gray-200'} relative z-10 flex-1 py-1.5 text-sm font-medium rounded-md transition-colors duration-300 focus:outline-none`}
                onClick={() => setActiveTab(tab)}
            >
                {activeTab === tab && (
                    <motion.div
                        className="absolute inset-0 bg-white rounded-md"
                        layoutId="activeTabBackground"
                        transition={{type: 'spring', stiffness: 300, damping: 30}}
                    />
                )}
                <span className="relative">{tab}</span>
            </button>
        ))}
    </div>
);

// =====================================================================
// --- MAIN COMPONENT ---
// =====================================================================

export default function StrategyPanel() {
    const [activeStrategy, setActiveStrategy] = useState('Default');
    const [indicators, setIndicators] = useState<{
        id: number;
        indicator: DropdownOption;
        timeFrame: string
    }[]>([
        {id: 1, indicator: STANDARD_INDICATOR_OPTIONS[0], timeFrame: '1h'},
    ]);
    const [securityIndicatorEnabled, setSecurityIndicatorEnabled] = useState(true);
    const [securityIndicator, setSecurityIndicator] = useState({
        id: 1,
        indicator: STANDARD_INDICATOR_OPTIONS[0],
        timeFrame: '4h'
    });
    const [optimizationMethod, setOptimizationMethod] = useState(OPTIMIZATION_METHODS[0].label);
    const [minSimulatedTrades, setMinSimulatedTrades] = useState(SIMULATED_TRADES_OPTIONS[0].name);
    const [minOptimizationAccuracy, setMinOptimizationAccuracy] = useState(OPTIMIZATION_ACCURACY_OPTIONS[2].name);
    const [minBotAccuracy, setMinBotAccuracy] = useState(BOT_ACCURACY_OPTIONS[2].name);
    const [accuracyInterval, setAccuracyInterval] = useState(ACCURACY_INTERVAL_OPTIONS[1].name);

    const handleIndicatorChange = (id: number, newValue: any) => {
        setIndicators(indicators.map(ind => ind.id === id ? {...ind, ...newValue} : ind));
    };

    const addIndicator = () => {
        setIndicators([...indicators, {id: Date.now(), indicator: STANDARD_INDICATOR_OPTIONS[0], timeFrame: '1h'}]);
    };

    const removeIndicator = (id: number) => {
        setIndicators(indicators.filter(ind => ind.id !== id));
    };

    const sectionAnimationProps = {
        initial: {opacity: 0, height: 0},
        animate: {opacity: 1, height: 'auto'},
        exit: {opacity: 0, height: 0},
        transition: {type: "spring", stiffness: 300, damping: 30}
    };

    return (
        <div className="bg-dark-gray text-white p-8 pb-4 rounded-xl shadow-2xl flex flex-col w-xl">
            <motion.div layout className="mb-6">
                <StrategyTabs activeTab={activeStrategy} setActiveTab={setActiveStrategy}/>
            </motion.div>
            <div className="flex flex-col mb-2">
                <AnimatePresence initial={false}>
                    {indicators.map((indicator, index) => (
                        <motion.div
                            key={indicator.id}
                            layout
                            animate={{opacity: 1, height: 'auto'}}
                            className="mb-2"
                            exit={{opacity: 0, height: 0, marginBottom: 0}}
                            initial={{opacity: 0, height: 0}}
                            transition={{type: "spring", stiffness: 300, damping: 30}}
                        >
                            <div className="flex items-center gap-x-2">
                                <div className="flex-grow">
                                    <IndicatorRow
                                        indicatorData={indicator}
                                        indicatorOptions={index === 0 ? MAIN_INDICATOR_OPTIONS : STANDARD_INDICATOR_OPTIONS}
                                        onChange={(newValue) => handleIndicatorChange(indicator.id, newValue)}
                                    />
                                </div>
                                {index > 0 ? (
                                    <button
                                        className="p-2 text-gray-500 hover:text-red-500 transition-colors mt-7"
                                        onClick={() => removeIndicator(indicator.id)}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                             xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth="2"/>
                                        </svg>
                                    </button>
                                ) : (
                                    <div className="w-9 flex-shrink-0"/>
                                )}
                            </div>
                            <p className="text-xs text-blue-400/80 hover:text-blue-400 cursor-pointer mt-2 pl-1">Advanced
                                settings</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <motion.div layout className="mb-6">
                <button
                    className="flex items-center gap-x-2 text-sm text-gray-400 hover:text-white transition-colors"
                    onClick={addIndicator}
                >
                    <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" fill="#303030" r="10"/>
                        <path
                            d="M10 6C10.2652 6 10.5196 6.10536 10.7071 6.29289C10.8946 6.48043 11 6.73478 11 7V9H13C13.2652 9 13.5196 9.10536 13.7071 9.29289C13.8946 9.48043 14 9.73478 14 10C14 10.2652 13.8946 10.5196 13.7071 10.7071C13.5196 10.8946 13.2652 11 13 11H11V13C11 13.2652 10.8946 13.5196 10.7071 13.7071C10.5196 13.8946 10.2652 14 10 14C9.73478 14 9.48043 13.8946 9.29289 13.7071C9.10536 13.5196 9 13.2652 9 13V11H7C6.73478 11 6.48043 10.8946 6.29289 10.7071C6.10536 10.5196 6 10.2652 6 10C6 9.73478 6.10536 9.48043 6.29289 9.29289C6.48043 9.10536 6.73478 9 7 9H9V7C9 6.73478 9.10536 6.48043 9.29289 6.29289C9.48043 6.10536 9.73478 6 10 6Z"
                            fill="white" fillOpacity="0.7"/>
                    </svg>
                    Add Indicator
                </button>
            </motion.div>
            <motion.div layout className="flex flex-col mb-6">
                <Switcher
                    isEnabled={securityIndicatorEnabled}
                    setIsEnabled={setSecurityIndicatorEnabled}
                    title="Security Indicator"
                />
                <AnimatePresence initial={false}>
                    {securityIndicatorEnabled && (
                        <motion.div {...sectionAnimationProps}>
                            <div className="pt-2">
                                <div className="flex items-center gap-x-2">
                                    <div className="flex-grow">
                                        <IndicatorRow
                                            indicatorData={securityIndicator}
                                            indicatorOptions={STANDARD_INDICATOR_OPTIONS}
                                            onChange={setSecurityIndicator}
                                        />
                                    </div>
                                    <div className="w-9 flex-shrink-0"/>
                                </div>
                                <p className="text-xs text-blue-400/80 hover:text-blue-400 cursor-pointer mt-2 pl-1">Advanced
                                    settings</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            <AnimatePresence initial={false}>
                {activeStrategy !== 'Default' && (
                    <motion.div {...sectionAnimationProps} className="mb-6">
                        <div className="flex flex-col gap-y-4">
                            <RadioGroup
                                label="Optimization method"
                                options={OPTIMIZATION_METHODS}
                                selectedValue={optimizationMethod}
                                onChange={(v) => setOptimizationMethod(v)}
                            />
                            <div className="grid grid-cols-2 gap-x-4">
                                <Combobox
                                    label="Min. simulated trades"
                                    options={SIMULATED_TRADES_OPTIONS}
                                    selected={minSimulatedTrades}
                                    setSelected={setMinSimulatedTrades}
                                />
                                <Combobox
                                    label="Min. optimization accuracy"
                                    options={OPTIMIZATION_ACCURACY_OPTIONS}
                                    placeholder="%"
                                    selected={minOptimizationAccuracy}
                                    setSelected={setMinOptimizationAccuracy}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
                {activeStrategy === 'Dynamic' && (
                    <motion.div {...sectionAnimationProps} className="mb-6">
                        <div className="grid grid-cols-2 gap-x-4">
                            <Combobox
                                label="Minimum bot accuracy"
                                options={BOT_ACCURACY_OPTIONS}
                                selected={minBotAccuracy}
                                setSelected={setMinBotAccuracy}
                            />
                            <Combobox
                                label="Accuracy interval"
                                options={ACCURACY_INTERVAL_OPTIONS}
                                selected={accuracyInterval}
                                setSelected={setAccuracyInterval}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div layout className="flex items-center justify-end pt-4 space-x-3 border-t border-gray-800/50">
                <button
                    className="px-6 py-2 text-sm font-semibold text-white ai-bg shadow-lg rounded-full transition-all">
                    Backtest
                </button>
                <button
                    className="px-8 py-2 text-sm font-semibold text-black bg-white hover:bg-gray-200 rounded-full transition-colors">
                    Deploy
                </button>
            </motion.div>
        </div>
    );
};
