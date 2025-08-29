'use client';

import type { DropdownOption } from '@/types/ui/DropdownOption';

import React from 'react';

import Combobox from '@/components/shared/ui/Combobox';

export type IndicatorItem = {
    id: number;
    indicator: DropdownOption;
    timeFrame: string;
};

export default function IndicatorRow({
     indicatorData,
     indicatorOptions,
     timeFrameOptions,
     onChange,
}: {
    indicatorData: IndicatorItem;
    indicatorOptions: DropdownOption[];
    timeFrameOptions: DropdownOption[];
    // Provide a PATCH-style updater (only changed fields)
    onChange: (patch: Partial<Pick<IndicatorItem, 'indicator' | 'timeFrame'>>) => void;
}) {
    return (
        <div className="grid grid-cols-3 gap-x-4">
            <div className="col-span-2">
                <Combobox
                    label="Indicator"
                    options={indicatorOptions}
                    selected={indicatorData.indicator?.name ?? ''}
                    setSelected={(selectedName) => {
                        const found = indicatorOptions.find((o) => o.name === selectedName);

                        // If not found, fall back to a minimal object with just the name
                        onChange({ indicator: found ?? { name: selectedName } });
                    }}
                />
            </div>

            <Combobox
                label="Timeframe"
                options={timeFrameOptions}
                selected={indicatorData.timeFrame}
                setSelected={(timeFrame) => onChange({ timeFrame })}
            />
        </div>
    );
}
