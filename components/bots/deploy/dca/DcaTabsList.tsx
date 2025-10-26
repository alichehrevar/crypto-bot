'use client'

import React from "react";
import {
    Tabs,
    Tab
} from "@heroui/react";

import {dcaParentTabs} from "@/utils/BotType";
import {MarketListItem} from "@/types/MarketList";
import DcaConfigForm from "@/components/bots/deploy/dca/index";

export default function DcaTabsList({
  onSuccessAction,
  selectedSymbol
}: {
    onSuccessAction: () => void,
    selectedSymbol?: MarketListItem | null
}) {

    const [selectedParentTab, setSelectedParentTab] = React.useState<string>(dcaParentTabs[0].key);

    return (
        <div
            className="flex w-full flex-col backdrop-blur-md pt-1 rounded-xl">
            <Tabs
                fullWidth
                aria-label="Options"
                className="mb-2"
                classNames={{
                    cursor: "w-full",
                    tab: "h-10 px-0",
                }}
                color={selectedParentTab === 'buy' ? 'success' : 'danger'}
                selectedKey={selectedParentTab as string}
                variant="underlined"
                onSelectionChange={(k) => setSelectedParentTab(k as "buy" | "sell")}
            >
                {dcaParentTabs.map(({key, title}) => (
                    <Tab key={key} title={title} />
                ))}
            </Tabs>
            <DcaConfigForm
                selectedSymbol={selectedSymbol}
                selectedTab={selectedParentTab}
                onCloseAction={() => onSuccessAction()}
            />
        </div>
    )
}
