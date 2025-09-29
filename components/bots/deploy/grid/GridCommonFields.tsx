import React from "react";

import { GridCommonFieldsProps } from "../../../../types/GridFormTypes";

import Input from "@/components/shared/ui/Input";
import Combobox from "@/components/shared/ui/Combobox";

export function GridCommonFields({
     name,
     onNameChange,
     accounts,
     selectedAccountId,
     onAccountChange,
     availableBalance,
}: GridCommonFieldsProps) {
    return (
        <>
            <Input
                id="bot-name"
                placeholder="e.g., ETH Momentum Scalper"
                title="Bot Name"
            />
            <Combobox
                label="Account"
                options={accounts.map((a) => ({ id: a._id, name: a.name ?? a._id }))}
                selected={selectedAccountId ? String(selectedAccountId) : ""}
                setSelected={onAccountChange}
            />
            <p className="text-sm text-gray-600">
                Available balance: <b>{availableBalance.toFixed(4)} USDT</b>
            </p>
        </>
    );
}
