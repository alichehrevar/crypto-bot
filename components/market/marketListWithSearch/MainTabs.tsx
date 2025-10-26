import React from 'react';
import { Tab, Tabs } from "@heroui/react";

interface Props { activeTab: string; setActiveTab: (tab: string) => void; }
const TABS = ['Favorites', 'Spot', 'Prep USDT-M'];

export const MainTabs: React.FC<Props> = ({ activeTab, setActiveTab }) => (
    <Tabs
        aria-label="tabs-list"
        classNames={{
            tab: 'pb-4',
        }}
        selectedKey={activeTab}
        variant="underlined"
        onSelectionChange={(key) => setActiveTab(key as string)}
    >
        {TABS.map((tab) => <Tab key={tab} title={tab} />)}
    </Tabs>
);
