import React from "react";
import { Switch, Tabs, Tab } from "@heroui/react";

import { GridFuturesConfigProps } from "@/types/GridFormTypes";
import Combobox from "@/components/shared/ui/Combobox";
import NumericInput from "@/components/shared/ui/NumericInput";

export function GridFuturesConfig({
  direction,
  onDirectionChange,
  leverage,
  onLeverageChange,
  marginMode,
  onMarginModeChange,
  openOnCreation,
  onOpenOnCreationChange,
}: GridFuturesConfigProps) {
    return (
        <div className="border-t border-default-100 pt-4 space-y-4">
            <h3 className="font-semibold">Futures Configuration</h3>
            <Tabs aria-label="Futures Direction" selectedKey={direction} onSelectionChange={(key) => onDirectionChange(key as any)}>
                <Tab key="Neutral" title="Neutral" />
                <Tab key="Long" title="Long" />
                <Tab key="Short" title="Short" />
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
                <NumericInput
                    label="Leverage"
                    max={125}
                    min={1}
                    step={1}
                    unit="x"
                    value={leverage}
                    onChange={onLeverageChange}
                />
                <Combobox
                    label="Margin Mode"
                    options={[{id: "Isolated", name: "Isolated"}, {id: "Cross", name: "Cross"}]}
                    selected={marginMode}
                    setSelected={(k) => k && onMarginModeChange(k as any)}
                />
            </div>

            {(direction === "Long" || direction === "Short") && (
                <div className="flex items-center justify-between flex-row-reverse gap-2">
                    <Switch color="success" isSelected={openOnCreation} onValueChange={onOpenOnCreationChange} />
                    <span className="text-sm text-gray-700">Open position on creation</span>
                </div>
            )}
        </div>
    );
}
