import React from "react";

import { GridCommonFieldsProps } from "@/types/GridFormTypes";
import Input from "@/components/shared/ui/Input";
import Combobox from "@/components/shared/ui/Combobox";
import {Spinner} from "@heroui/react";

export function GridCommonFields({
     onNameChange,
     accounts,
     selectedAccountId,
     onAccountChange,
     balanceLoading,
     availableBalance,
}: GridCommonFieldsProps) {
    return (
        <>
            <Input
                id="bot-name"
                placeholder="e.g., ETH Momentum Scalper"
                title="Grid Bot Name"
                onChange={onNameChange}
            />
            <Combobox
                label="Account"
                options={accounts.map((a) => ({ id: a._id, name: a.name ?? a._id }))}
                selected={selectedAccountId ? String(selectedAccountId) : ""}
                setSelected={onAccountChange}
            />
            <div className="text-sm text-gray-600 flex items-center">
                Available balance:
                {balanceLoading
                    ? <span className="inline h-3 -mt-12 ms-3">
                            <Spinner color="primary" size="sm" variant="wave" />
                        </span>
                    : <b className="ms-1">{availableBalance.toFixed(2)} USDT</b>
                }
            </div>
        </>
    );
}
