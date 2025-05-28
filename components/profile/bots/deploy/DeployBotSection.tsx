'use client'

import React from "react";
import {
  Tabs,
  Tab
} from "@heroui/react";

import BotConfigForm from "@/components/profile/bots/deploy/BotConfigForm";

export default function DeployBotSection ({
  onSuccessAction
}: {
  onSuccessAction: () => void
}) {

  const tabs = [
    { key: "default",   title: "Default"   },
    { key: "optimized", title: "Optimized" },
    { key: 'dynamic', title: 'Dynamic' }
  ] as const;

  return (
    <div className="flex w-full flex-col">
      <Tabs
        fullWidth
        aria-label="Options"
        classNames={{
          cursor: "w-full bg-white dark:group-data-[selected=true]:bg-white",
          tab: "h-10",
          tabContent: "dark:group-data-[selected=true]:text-black",
        }}
        radius={'full'}
      >
        {tabs.map(({ key, title }) => (
          <Tab key={key} title={title}>
            <BotConfigForm mode={key} onCloseAction={() => onSuccessAction()} />
          </Tab>
        ))}
      </Tabs>
    </div>
  )
}
