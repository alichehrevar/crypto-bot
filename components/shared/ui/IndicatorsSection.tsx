"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { DropdownOption } from "@/types/ui/DropdownOption";
import Combobox from "@/components/shared/ui/Combobox";
import { PlusCircleIcon } from "@/utils/icons";
import { getData } from "@/actions/get";
import {addToast} from "@heroui/react";

// =====================================================================
// API Response Types
// =====================================================================

export interface BotPropsResponse {
    success: boolean;
    props: BotPropsData;
}

export interface BotPropsData {
    riskStrategyOptions: string[];
    indicatorOptions: DropdownOption[]; // Matches { name: string, logo?: string }
    OptMethod: string[];
    timeframeOptions: DropdownOption[]; // Matches { name: string }
    defaultStrategyParams: Record<string, any>; // You can type this strictly if needed
}

// =====================================================================
// Component Types
// =====================================================================

export type IndicatorItem = {
    id: number;
    indicator: DropdownOption;
    timeFrame: string;
};

// =====================================================================
// Local Sub-components
// =====================================================================

// Now accepts timeframeOptions dynamically instead of using a constant
const IndicatorRowLocal: React.FC<{
    indicatorData: IndicatorItem;
    onChange: (value: Partial<IndicatorItem>) => void;
    indicatorOptions: DropdownOption[];
    timeframeOptions: DropdownOption[];
}> = ({ indicatorData, onChange, indicatorOptions, timeframeOptions }) => (
    <div className="grid grid-cols-3 gap-x-2">
        <div className="col-span-2">
            <Combobox
                label="Indicator"
                options={indicatorOptions}
                selected={indicatorData.indicator.name}
                setSelected={(indicatorName) =>
                    onChange({ ...indicatorData, indicator: { name: indicatorName } })
                }
            />
        </div>
        <Combobox
            label="Timeframe"
            options={timeframeOptions}
            selected={indicatorData.timeFrame}
            setSelected={(timeFrame) => onChange({ ...indicatorData, timeFrame })}
        />
    </div>
);

// =====================================================================
// Main Component
// =====================================================================

export default function IndicatorsSection(props: {
    /** Optional initial rows */
    initialIndicators?: IndicatorItem[];
    /** Called whenever the list changes */
    onChange?: (list: IndicatorItem[]) => void;
    /** Defaults for new rows */
    defaultNewTimeframe?: string;
    /** Show add indicator button */
    showAddIndicatorButton?: boolean
}) {
    const {
        initialIndicators,
        onChange,
        defaultNewTimeframe = "1h",
        showAddIndicatorButton
    } = props;

    // -----------------------------
    // State: API Data
    // -----------------------------
    const [availIndicators, setAvailIndicators] = useState<DropdownOption[]>([]);
    const [availTimeframes, setAvailTimeframes] = useState<DropdownOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // -----------------------------
    // State: Local Indicators List
    // -----------------------------
    const [indicators, setIndicators] = useState<IndicatorItem[]>(() => {
        if (initialIndicators && initialIndicators.length > 0) return initialIndicators;

        // Default initial state (will be updated once API loads if names are empty)
        return [
            {
                id: 1,
                indicator: { name: "" },
                timeFrame: defaultNewTimeframe,
            },
        ];
    });

    // -----------------------------
    // Effect: Fetch Data
    // -----------------------------
    useEffect(() => {
        const fetchBotProps = async () => {
            try {
                // Explicitly typing the response ensures type safety
                const response = await getData('/bots/botProps') as BotPropsResponse;

                if (response.success && response.props) {
                    setAvailIndicators(response.props.indicatorOptions);
                    setAvailTimeframes(response.props.timeframeOptions);

                    // Optional: If you want to auto-select the first indicator for existing empty rows
                    if (indicators.length === 1 && indicators[0].indicator.name === "" && response.props.indicatorOptions.length > 0) {
                        const firstOpt = response.props.indicatorOptions[0];

                        setIndicators(prev => [{ ...prev[0], indicator: firstOpt }]);
                    }
                }
            } catch (error) {
                addToast({title: `Failed to fetch bot props: ${error}`, color: 'danger'})
            } finally {
                setIsLoading(false);
            }
        };

        fetchBotProps();
    }, []);

    // -----------------------------
    // Effect: Notify Parent
    // -----------------------------
    useEffect(() => {
        onChange?.(indicators);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indicators]); // Added dependency to trigger on changes, or keep empty if only strictly on mount

    // -----------------------------
    // Handlers
    // -----------------------------
    const handleIndicatorChange = (id: number, newValue: Partial<IndicatorItem>) => {
        const next = indicators.map((ind) => (ind.id === id ? { ...ind, ...newValue } : ind));

        setIndicators(next);
        // onChange called via effect or explicitly here:
        onChange?.(next);
    };

    const addIndicator = () => {
        const next = [
            ...indicators,
            {
                id: Date.now(),
                // Default to first available option or empty
                indicator: availIndicators?.[0] ?? { name: "" },
                timeFrame: defaultNewTimeframe,
            },
        ];

        setIndicators(next);
        onChange?.(next);
    };

    const removeIndicator = (id: number) => {
        const next = indicators.filter((ind) => ind.id !== id);

        setIndicators(next);
        onChange?.(next);
    };

    return (
        <>
            <div className="flex flex-col mb-2">
                <AnimatePresence initial={false}>
                    {indicators.map((indicator, index) => (
                        <motion.div
                            key={indicator.id}
                            layout
                            animate={{ opacity: 1, height: "auto" }}
                            className="mb-2"
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            initial={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            {index > 0 && (
                                <span className="block mt-3 mb-2 font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-white/80 to-white/30">
                                    And
                                </span>
                            )}
                            <div className="flex items-center gap-x-2">
                                <div className="flex-grow">
                                    <IndicatorRowLocal
                                        indicatorData={indicator}
                                        // Pass the fetched API data
                                        indicatorOptions={availIndicators}
                                        timeframeOptions={availTimeframes}
                                        onChange={(newValue) => handleIndicatorChange(indicator.id, newValue)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-blue-400/80 hover:text-blue-400 cursor-pointer ps-1">
                                    Advanced settings
                                </p>
                                {index > 0 && (
                                    <button
                                        aria-label="Remove indicator"
                                        className="text-red-500 hover:text-red-800 transition-colors flex items-center gap-x-0.5"
                                        type="button"
                                        onClick={() => removeIndicator(indicator.id)}
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M6 18L18 6M6 6l12 12"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                            />
                                        </svg>
                                        <small>Remove</small>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {showAddIndicatorButton && !isLoading && (
                <motion.div layout className="mb-6">
                    <button
                        className="flex items-center gap-x-2 text-sm text-gray-400 hover:text-white transition-colors"
                        type="button"
                        onClick={addIndicator}
                    >
                        <PlusCircleIcon />
                        Add Indicator
                    </button>
                </motion.div>
            )}
        </>
    );
}
