'use client'

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tab, Tabs } from "@heroui/react";

import AccountSettingsTab from "@/components/profile/account-tabs/AccountSettings";
import ConnectBrokerTab from "@/components/profile/account-tabs/broker/ConnectBroker";
import IOPanel from "@/components/profile/account-tabs/IOPanel/IOPanel";
import Subscriptions from "@/components/profile/account-tabs/subscriptions/Subscriptions";
import NotificationSection from "@/components/profile/account-tabs/NotificationSection";

export default function TabsList () {

  const searchParams = useSearchParams()

  const tabsList = [
    {
      key: 'account-settings',
      title: 'Account Settings',
      component: <AccountSettingsTab />
    },
    {
      key: 'connect-broker',
      title: 'My Brokers',
      component: <ConnectBrokerTab />
    },
    {
      key: 'io-panel',
      title: 'IO Panel',
      component: <IOPanel />
    },
    {
      key: 'subscription',
      title: 'Subscription',
      component: <Subscriptions />
    },
    {
      key: 'notification',
      title: 'Notification',
      component: <NotificationSection />
    }
  ]

  const [selected, setSelected] = React.useState(tabsList[0].key);

  useEffect(() => {
    if (searchParams.has('tab') && tabsList.some(t => t.key === searchParams.get('tab'))) {
      setSelected(searchParams.get('tab') ?? tabsList[0].key)
    } else {
      setSelected(tabsList[0].key)
    }
  }, [searchParams]);

  return (
    <div className="w-full mt-10 relative">
      <Tabs
        aria-label="Options"
        classNames={{
          base: 'w-full px-4',
          tabList: 'w-full mx-auto border-b-1 border-default-100',
          tab: 'h-10 pb-4 font-bold text-[14px]',
          panel: "w-full flex items-center justify-center mt-4"
        }}
        selectedKey={selected}
        variant="underlined"
        onSelectionChange={(e) => setSelected(e.toString())}
      >
        {tabsList.map((tab) => {
          return (
            <Tab key={tab.key} title={tab.title}>
              {tab.component}
            </Tab>
          )
        })}
      </Tabs>
    </div>
  )
}
