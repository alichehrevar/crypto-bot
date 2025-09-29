import React from "react";

import { GridStrategySetupProps } from "@/types/GridFormTypes";
import NumericInput from "@/components/shared/ui/NumericInput";
import Combobox from "@/components/shared/ui/Combobox";

export function GridStrategySetup({
                                      lowerPrice,
                                      onLowerPriceChange,
                                      upperPrice,
                                      onUpperPriceChange,
                                      priceRangeError,
                                      gridCount,
                                      onGridCountChange,
                                      gridMode,
                                      onGridModeChange,
                                      investment,
                                      onInvestmentChange,
                                      investmentError,
                                      availableBalance,
                                  }: GridStrategySetupProps) {
    return (
        <div className="border-t border-default-100 pt-4 space-y-4">
            <h3 className="font-semibold">Grid Strategy</h3>
            <div className="grid grid-cols-2 gap-4">
                <NumericInput
                    label="Lower Price (USDT)"
                    max={0}
                    min={0}
                    placeholder="e.g., 50000"
                    value={lowerPrice}
                    onChange={onLowerPriceChange}
                />
                <NumericInput
                    label="Upper Price (USDT)"
                    max={0}
                    min={0}
                    placeholder="e.g., 70000"
                    value={upperPrice}
                    onChange={onUpperPriceChange}
                />
            </div>
            {priceRangeError && <p className="text-[12px] text-red-500">{priceRangeError}</p>}

            <div className="grid grid-cols-2 gap-4">
                <NumericInput label="Number of Grids" max={200} min={2} step={1} value={gridCount} onChange={onGridCountChange} />
                <Combobox label="Grid Mode" options={[{ id: "Arithmetic", name: "Arithmetic" }, { id: "Geometric", name: "Geometric" }]} selected={gridMode} setSelected={(k) => k && onGridModeChange(k as any)} />
            </div>
            <NumericInput label="Total Investment (USDT)" max={availableBalance} min={0} value={investment} onChange={onInvestmentChange} />
            {investmentError && <p className="text-[12px] text-red-500">{investmentError}</p>}
        </div>
    );
}
