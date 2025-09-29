import React from "react";
import { Switch } from "@heroui/react";

import { GridTPSLProps } from "../../../../types/GridFormTypes";

import NumericInput from "@/components/shared/ui/NumericInput";

export function GridTPSL({
     isSpot,
     enableTPSL,
     onEnableTPSLChange,
     takeProfitPrice,
     onTakeProfitPriceChange,
     stopLossPrice,
     onStopLossPriceChange,
     sellBaseOnStop,
     onSellBaseOnStopChange,
 }: GridTPSLProps) {
    return (
        <div className="border-t border-default-100 pt-4 space-y-4">
            <div className="flex items-center justify-between flex-row-reverse gap-2">
                <Switch
                    color="success"
                    isSelected={enableTPSL}
                    onValueChange={onEnableTPSLChange}
                />
                <span className="text-sm text-gray-700">Take Profit / Stop Loss</span>
            </div>

            {/* Conditional section that appears only when the switch is enabled */}
            {enableTPSL && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <NumericInput
                            label="Take Profit Price"
                            max={0}
                            min={0}
                            placeholder="e.g., 80000"
                            value={takeProfitPrice}
                            onChange={onTakeProfitPriceChange}
                        />
                        <NumericInput
                            label="Stop Loss Price"
                            max={0}
                            min={0}
                            placeholder="e.g., 45000"
                            value={stopLossPrice}
                            onChange={onStopLossPriceChange}
                        />
                    </div>

                    {/* Conditional switch that appears only for Spot bots */}
                    {isSpot && (
                        <div className="flex items-center justify-between flex-row-reverse gap-2">
                            <Switch
                                color="success"
                                isSelected={sellBaseOnStop}
                                onValueChange={onSellBaseOnStopChange}
                            />
                            <span className="text-sm text-gray-700">Sell all base coins on stop</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
