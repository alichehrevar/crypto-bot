'use client';

import type { DropdownOption } from '@/types/ui/DropdownOption';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import IndicatorRow, { IndicatorItem } from '@/components/shared/ui/IndicatorRow';
import { PlusCircleIcon } from '@/utils/icons';

export default function IndicatorsSection({
      indicators,
      mainIndicatorOptions,
      standardIndicatorOptions,
      timeFrameOptions,
      onChange,
      onRemove,
      onAdd,
}: {
    indicators: IndicatorItem[];
    mainIndicatorOptions: DropdownOption[];
    standardIndicatorOptions: DropdownOption[];
    timeFrameOptions: DropdownOption[];
    onChange: (id: number, patch: Partial<Pick<IndicatorItem, 'indicator' | 'timeFrame'>>) => void;
    onRemove: (id: number) => void;
    onAdd: () => void;
}) {
    return (
        <>
            <div className="flex flex-col mb-2">
                <AnimatePresence initial={false}>
                    {indicators.map((indicator, index) => (
                        <motion.div
                            key={indicator.id}
                            layout
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-2"
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            initial={{ opacity: 0, height: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        >
                            <div className="flex items-center gap-x-2">
                                <div className="flex-grow">
                                    <IndicatorRow
                                        indicatorData={indicator}
                                        indicatorOptions={index === 0 ? mainIndicatorOptions : standardIndicatorOptions}
                                        timeFrameOptions={timeFrameOptions}
                                        onChange={(patch) => onChange(indicator.id, patch)}
                                    />
                                </div>

                                {index > 0 ? (
                                    <button
                                        className="p-2 text-gray-500 hover:text-red-500 transition-colors mt-7"
                                        onClick={() => onRemove(indicator.id)}
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

            <motion.div layout className="mb-6">
                <button
                    className="flex items-center gap-x-2 text-sm text-gray-400 hover:text-white transition-colors"
                    onClick={onAdd}
                >
                    <PlusCircleIcon />
                    Add Indicator
                </button>
            </motion.div>
        </>
    );
}
