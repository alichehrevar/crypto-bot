'use client'

import React from "react";
import {
  Tabs,
  Tab
} from "@heroui/react";

import GridConfigForm from "@/components/profile/bots/deploy/GridConfigForm";

export default function TechnicalDeployBotSection ({
  onSuccessAction
}: {
  onSuccessAction: () => void
}) {

  const parentTabs = [
    { key: "spot", title: 'Spot' },
    { key: "futures", title: 'Futures' }
  ] as const;

  const tabs = [
    { key: "standard",   title: "Standard"   },
    { key: "infinity", title: "Infinity" },
    { key: 'dynamic', title: 'Dynamic' }
  ] as const;

  const [selectedParentTab, setSelectedParentTab] = React.useState("spot");

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
          tab: "h-10",
          tabContent: "dark:group-data-[selected=true]:text-black",
          panel: "h-full overflow-y-auto over-flow-x-hidden bot-config-form thin-scrollbar"
        }}
        radius={'full'}
      >
        {tabs.map(({ key, title }) => (
          <Tab key={key} title={title}>
            <GridConfigForm
              mode={key}
              selectedParentTab={selectedParentTab}
              onCloseAction={() => onSuccessAction()}
            />
          </Tab>
        ))}
      </Tabs>
    </div>
  )
}
