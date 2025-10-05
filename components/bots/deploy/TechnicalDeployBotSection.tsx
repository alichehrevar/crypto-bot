'use client'

import React from "react";
import {
  Tabs,
  Tab
} from "@heroui/react";

import BotConfigForm from "@/components/bots/deploy/BotConfigForm";
import {parentTabs} from "@/utils/BotType";

export default function TechnicalDeployBotSection({
  onSuccessAction,
  selectedSymbol
}: {
    onSuccessAction: () => void,
    selectedSymbol?: string | undefined
}) {

  const tabs = [
    { key: "default",   title: "Default"   },
    { key: "optimized", title: "Optimized" },
    { key: "dynamic", title: "Dynamic" }
  ] as const;

  const [selectedParentTab, setSelectedParentTab] = React.useState("spot");

  return (
    <div className="flex w-full h-full flex-col bg-dark-gray backdrop-blur-md px-2 rounded-lg">
      <Tabs
        fullWidth
        aria-label="Options"
        className="mb-4"
        classNames={{
          cursor: "w-full",
          tab: "h-10 px-0",
        }}
        selectedKey={selectedParentTab}
        variant="underlined"
        onSelectionChange={(k) => setSelectedParentTab(k as string)}
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
          panel: "h-full overflow-y-auto scrollbar-hide over-flow-x-hidden bot-config-form thin-scrollbar mt-4"
        }}
      >
        {tabs.map(({ key, title }) => (
          <Tab key={key} title={title}>
            <BotConfigForm
              mode={key}
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
