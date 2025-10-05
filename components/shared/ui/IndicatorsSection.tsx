"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { DropdownOption } from "@/types/ui/DropdownOption";
import Combobox from "@/components/shared/ui/Combobox";
import { PlusCircleIcon } from "@/utils/icons";

// =====================================================================
// IndicatorsSection (stateful)
// - Owns its internal indicators list and the add/remove/change handlers
// - Notifies parent of the *current* selections via onChange callback
// - Keeps the same UI/animations as the original inline block
// =====================================================================

export type IndicatorItem = {
    id: number;
    indicator: DropdownOption;
    timeFrame: string;
};

const TIME_FRAMES: DropdownOption[] = [
    { name: "1m" },
    { name: "5m" },
    { name: "15m" },
    { name: "1h" },
    { name: "4h" },
    { name: "1d" },
];

// Local row renderer to mirror the original structure
const IndicatorRowLocal: React.FC<{
    indicatorData: IndicatorItem;
    onChange: (value: any) => void;
    indicatorOptions: DropdownOption[];
}> = ({ indicatorData, onChange, indicatorOptions }) => (
    <div className="grid grid-cols-3 gap-x-4">
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
            options={TIME_FRAMES}
            selected={indicatorData.timeFrame}
            setSelected={(timeFrame) => onChange({ ...indicatorData, timeFrame })}
        />
    </div>
);

export default function IndicatorsSection(props: {
    /** Optional initial rows; if omitted, one default row is created */
    initialIndicators?: IndicatorItem[];
    /** Options list for the first row (AI/LLM + standards) */
    mainOptions: DropdownOption[];
    /** Options for subsequent rows */
    standardOptions: DropdownOption[];
    /** Called whenever the list changes (add/remove/edit). Receives full list. */
    onChange?: (list: IndicatorItem[]) => void;
    /** Defaults for new rows */
    defaultNewTimeframe?: string; // e.g., "1h",
    /** Show add indicator button */
    showAddIndicatorButton?: boolean
}) {
    const {
        initialIndicators,
        mainOptions,
        standardOptions,
        onChange,
        defaultNewTimeframe = "1h",
        showAddIndicatorButton
    } = props;

    // -----------------------------
    // Local state for indicators
    // -----------------------------
    const [indicators, setIndicators] = useState<IndicatorItem[]>(() => {
        if (initialIndicators && initialIndicators.length > 0) return initialIndicators;

        return [
            {
                id: 1,
                indicator: standardOptions?.[0] ?? { name: "" },
                timeFrame: defaultNewTimeframe,
            },
        ];
    });

    // Notify parent on mount with the initial state
    useEffect(() => {
        onChange?.(indicators);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -----------------------------
    // Handlers moved inside component
    // -----------------------------
    const handleIndicatorChange = (id: number, newValue: any) => {
        const next = indicators.map((ind) => (ind.id === id ? { ...ind, ...newValue } : ind));

        setIndicators(next);
        onChange?.(next);
    };

    const addIndicator = () => {
        const next = [
            ...indicators,
            {
                id: Date.now(),
                indicator: standardOptions?.[0] ?? { name: "" },
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
                            {index > 0 &&
                                <span className="block mt-3 mb-2 font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-white/80 to-white/30">
                                  And
                                </span>
                            }
                            <div className="flex items-center gap-x-2">
                                <div className="flex-grow">
                                    <IndicatorRowLocal
                                        indicatorData={indicator}
                                        indicatorOptions={index === 0 ? mainOptions : standardOptions}
                                        onChange={(newValue) => handleIndicatorChange(indicator.id, newValue)}
                                    />
                                </div>
                                {index > 0 ? (
                                    <button
                                        aria-label="Remove indicator"
                                        className="p-2 text-gray-500 hover:text-red-500 transition-colors mt-7"
                                        type="button"
                                        onClick={() => removeIndicator(indicator.id)}
                                    >
                                        <svg
                                            className="w-5 h-5"
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
                                    </button>
                                ) : (
                                    <div className="w-9 flex-shrink-0" />
                                )}
                            </div>
                            <p className="text-xs text-blue-400/80 hover:text-blue-400 cursor-pointer mt-2 pl-1">
                                Advanced settings
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {showAddIndicatorButton &&
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
            }
        </>
    );
}
