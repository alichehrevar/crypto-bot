'use client';

import React, {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';

import Combobox from "@/components/shared/ui/Combobox";
import RadioGroup from "@/components/shared/ui/RadioGroup";
import Switcher from "@/components/shared/ui/Switcher";
import Tabs from "@/components/shared/ui/Tabs";
import IndicatorsSection, { IndicatorItem } from "@/components/shared/ui/IndicatorsSection";
import {
    ACCURACY_INTERVAL_OPTIONS,
    BOT_ACCURACY_OPTIONS, MAIN_INDICATOR_OPTIONS,
    OPTIMIZATION_ACCURACY_OPTIONS,
    OPTIMIZATION_METHODS,
    SIMULATED_TRADES_OPTIONS,
    STANDARD_INDICATOR_OPTIONS
} from "@/utils/strategyPanelData";
import {sectionAnimationProps} from "@/utils/animations";

// =====================================================================
// --- MOCK DATA & CONSTANTS ---
// =====================================================================

const STRATEGY_TABS = ['Default', 'Optimized', 'Dynamic'];


// =====================================================================
// --- MAIN COMPONENT ---
// =====================================================================

export default function StrategyPanel() {
    const [activeStrategy, setActiveStrategy] = useState('Default');
    const [selectedIndicators, setSelectedIndicators] = useState<IndicatorItem[]>([]);
    const [securityIndicatorEnabled, setSecurityIndicatorEnabled] = useState(true);
    const [optimizationMethod, setOptimizationMethod] = useState(OPTIMIZATION_METHODS[0].label);
    const [minSimulatedTrades, setMinSimulatedTrades] = useState(SIMULATED_TRADES_OPTIONS[0].name);
    const [minOptimizationAccuracy, setMinOptimizationAccuracy] = useState(OPTIMIZATION_ACCURACY_OPTIONS[2].name);
    const [minBotAccuracy, setMinBotAccuracy] = useState(BOT_ACCURACY_OPTIONS[2].name);
    const [accuracyInterval, setAccuracyInterval] = useState(ACCURACY_INTERVAL_OPTIONS[1].name);

    return (
        <div className="text-white p-8 pb-4 shadow-2xl flex flex-col w-xl ua-card">
            <motion.div layout className="mb-6">
                <Tabs activeTab={activeStrategy} setActiveTab={setActiveStrategy} tabs={STRATEGY_TABS}/>
            </motion.div>
            <IndicatorsSection
                defaultNewTimeframe="1h"
                initialIndicators={[
                    { id: 1, indicator: STANDARD_INDICATOR_OPTIONS[0], timeFrame: "1h" },
                ]}
                mainOptions={MAIN_INDICATOR_OPTIONS}
                showAddIndicatorButton={true}
                standardOptions={STANDARD_INDICATOR_OPTIONS}
                onChange={setSelectedIndicators}
            />
            <motion.div layout className="flex flex-col mb-6">
                <Switcher
                    isEnabled={securityIndicatorEnabled}
                    setIsEnabled={setSecurityIndicatorEnabled}
                    title="Security Indicator"
                />
                <AnimatePresence initial={false}>
                    {securityIndicatorEnabled && (
                        <motion.div {...sectionAnimationProps} className="pt-2">
                            <IndicatorsSection
                                defaultNewTimeframe="1h"
                                initialIndicators={[
                                    { id: 1, indicator: STANDARD_INDICATOR_OPTIONS[0], timeFrame: "1h" },
                                ]}
                                mainOptions={MAIN_INDICATOR_OPTIONS}
                                standardOptions={STANDARD_INDICATOR_OPTIONS}
                                onChange={setSelectedIndicators}
                            />
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
