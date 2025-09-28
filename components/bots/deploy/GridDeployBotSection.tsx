'use client'

import React from "react";
import {
  Tabs,
  Tab
} from "@heroui/react";

import GridConfigForm from "@/components/bots/deploy/GridConfigForm";
import {parentTabs} from "@/utils/BotType";
import {MarketListItem} from "@/types/MarketList";

export default function TechnicalDeployBotSection({
  onSuccessAction,
  selectedSymbol
}: {
    onSuccessAction: () => void,
    selectedSymbol?: MarketListItem | null
}) {

  const tabs = [
    { key: "standard",   title: "Standard"   },
    { key: "infinity", title: "Infinity" },
    { key: 'dynamic', title: 'Dynamic' }
  ] as const;

  const [selectedParentTab, setSelectedParentTab] = React.useState<"spot" | "futures">("spot");

  return (
    <div className="flex w-full flex-col bg-dark-gray backdrop-blur-md pt-4 px-4 rounded-lg bot-config-form__tabs-screen-height">
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
        {parentTabs.map(({ key, title }) => (
          <Tab key={key} title={title} />
        ))}
      </Tabs>
      <Tabs
        fullWidth
        aria-label="Options"
        classNames={{
          cursor: "w-full bg-white dark:group-data-[selected=true]:bg-white",
            tab: "h-8 text-[12px]",
          tabContent: "dark:group-data-[selected=true]:text-black",
          panel: "h-full overflow-y-auto over-flow-x-hidden bot-config-form thin-scrollbar mt-4"
        }}
        radius={'full'}
      >
        {tabs.map(({ key, title }) => (
          <Tab key={key} title={title}>
            <GridConfigForm
              key={key}
              selectedParentTab={selectedParentTab}
              selectedSymbol={selectedSymbol}
              onCloseAction={() => onSuccessAction()}
            />
          </Tab>
        ))}
      </Tabs>
    </div>
  )
}
