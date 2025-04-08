'use client'

import { Card, CardBody, Tab, Tabs } from "@heroui/react";

import AccountSettingsTab from "@/components/profile/account-tabs/AccountSettings";
import ConnectBrokerTab from "@/components/profile/account-tabs/broker/ConnectBroker";
import IOPanel from "@/components/profile/account-tabs/IOPanel/IOPanel";

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
          <Card>
            <CardBody>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
              mollit anim id est laborum.
            </CardBody>
          </Card>
        </Tab>
        <Tab key="notification" title="Notification">
          <Card>
            <CardBody>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
              mollit anim id est laborum.
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  )
}
