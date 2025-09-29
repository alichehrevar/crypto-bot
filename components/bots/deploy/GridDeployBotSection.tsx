'use client'

import React from "react";
import {
    Tabs,
    Tab
} from "@heroui/react";

import GridConfigForm from "@/components/bots/deploy/grid/index";
import {parentTabs} from "@/utils/BotType";
import {MarketListItem} from "@/types/MarketList";

export default function TechnicalDeployBotSection({
  onSuccessAction,
  selectedSymbol
}: {
    onSuccessAction: () => void,
    selectedSymbol?: MarketListItem | null
}) {

    const [selectedParentTab, setSelectedParentTab] = React.useState<"spot" | "futures">("spot");

    return (
        <div
            className="flex w-full flex-col bg-dark-gray backdrop-blur-md pt-1 px-4 rounded-lg">
            <Tabs
                fullWidth
                aria-label="Options"
                className="mb-4"
                classNames={{
                    cursor: "w-full",
                    tab: "h-10 px-0",
                }}
                selectedKey={selectedParentTab as string}
                variant="underlined"
                onSelectionChange={(k) => setSelectedParentTab(k as "spot" | "futures")}
            >
                {parentTabs.map(({key, title}) => (
                    <Tab key={key} title={title}/>
                ))}
            </Tabs>
            <GridConfigForm
                selectedParentTab={selectedParentTab}
                selectedSymbol={selectedSymbol}
                onCloseAction={() => onSuccessAction()}
            />
        </div>
    )
}
