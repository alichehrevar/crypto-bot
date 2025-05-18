'use client'

import { Tab, Tabs } from "@heroui/react";

import AccountSettingsTab from "@/components/profile/account-tabs/AccountSettings";
import ConnectBrokerTab from "@/components/profile/account-tabs/broker/ConnectBroker";
import IOPanel from "@/components/profile/account-tabs/IOPanel/IOPanel";
import Subscriptions from "@/components/profile/account-tabs/subscriptions/Subscriptions";
import NotificationSection from "@/components/profile/account-tabs/NotificationSection";

export default function SettingsPage () {
  return (
    <div className="container mt-10 relative">
      <Tabs aria-label="Options" classNames={{
        base: 'w-full px-4',
        tabList: 'w-3/5 mx-auto',
        tab: 'h-10',
        panel: "w-full flex items-center justify-center mt-4"
      }}>
        <Tab key="account-settings" title="Account Settings">
          <AccountSettingsTab />
        </Tab>
        <Tab key="connect-broker" title="Connect Broker">
          <ConnectBrokerTab />
        </Tab>
        <Tab key="io-panel" title="IO Panel">
          <IOPanel />
        </Tab>
        <Tab key="subscription" title="Subscription">
          <Subscriptions />
        </Tab>
        <Tab key="notification" title="Notification">
          <NotificationSection />
        </Tab>
      </Tabs>
    </div>
  )
}
