import React from "react";
import { Switch } from "@heroui/react";

import { GridSpotAdvancedProps } from "@/types/GridFormTypes";
import NumericInput from "@/components/shared/ui/NumericInput";

export function GridSpotAdvanced({
                                     trailingUp,
                                     onTrailingUpChange,
                                     triggerPriceSpot,
                                     onTriggerPriceSpotChange,
                                 }: GridSpotAdvancedProps) {
    return (
        <div className="border-t border-default-100 pt-4 space-y-4">
            <h3 className="font-semibold">Advanced Spot Options</h3>
            <div className="flex items-center justify-between flex-row-reverse gap-2">
                <Switch
                    color="success"
                    isSelected={trailingUp}
                    onValueChange={onTrailingUpChange}
                />
                <span className="text-sm text-gray-700">Trailing Up</span>
            </div>
            <NumericInput
                label="Trigger Price"
                max={0}
                min={0}
                placeholder="Optional: Start bot when price is met"
                value={triggerPriceSpot}
                onChange={onTriggerPriceSpotChange}
            />
        </div>
    );
}
