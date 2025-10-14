'use client'

import React, {useEffect} from "react";
import {useSearchParams} from "next/navigation";
import {Tab, Tabs} from "@heroui/react";

import AccountSettingsTab from "@/components/profile/account-tabs/accountSettings/AccountSettings";
import Subscriptions from "@/components/profile/account-tabs/subscriptions/Subscriptions";
import NotificationSection from "@/components/profile/account-tabs/NotificationSection";
import BrokerSettingsPage from "@/components/profile/account-tabs/broker/BrokerSettings";

export default function TabsList() {

    const searchParams = useSearchParams()

    const tabsList = [
        {
            key: 'account-settings',
            title: 'Account Settings',
            component: <AccountSettingsTab/>
        },
        {
            key: 'connect-broker',
            title: 'My Brokers',
            component: <BrokerSettingsPage/>
        },
        {
            key: 'subscription',
            title: 'Subscription',
            component: <Subscriptions/>
        },
        {
            key: 'notification',
            title: 'Notification',
            component: <NotificationSection/>
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
        <div className="flex-1 overflow-y-auto w-full pt-10 relative">
            <Tabs
                aria-label="Options"
                classNames={{
                    base: 'w-[200px] px-4',
                    tabList: 'w-full mx-auto gap-4 border-b-1 lg:border-b-0 lg:border-default-100',
                    cursor: "w-full h-[2px] bottom-0 lg:left-0 lg:h-full lg:w-[2px]",
                    tab: 'h-10 pb-4 font-bold lg:justify-start lg:items-center lg:p-0 lg:pl-4 text-[14px]',
                    panel: "w-full flex items-center justify-center mt-4"
                }}
                isVertical={true}
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
