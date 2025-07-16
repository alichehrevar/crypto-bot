'use client'

import React from "react";
import { Tab, Tabs } from "@heroui/react";
import HeatMapWidget from "@/components/profile/market/HeatMap";
import TopMoversList from "@/components/profile/market/TopMoversList";

export default function MarketPage () {

  const tabsList = [
    {
      key: 'heat-map',
      title: 'HeatMap',
      component: <HeatMapWidget />
    },
    {
      key: 'top-movers',
      title: 'Top Movers',
      component: <TopMoversList />
    },
    {
      key: 'new-coins',
      title: 'New Coins',
      component: 'New Coins Tab'
    }
  ]

  const [selected, setSelected] = React.useState(tabsList[0].key);

  return (
    <div className="container mt-10 relative">
      <Tabs
        aria-label="Options"
        classNames={{
          base: 'w-full px-4',
          tabList: 'w-3/5 mx-auto',
          tab: 'h-10',
          panel: "w-full flex items-center justify-center mt-4"
        }}
        selectedKey={selected}
        onSelectionChange={(e) => setSelected(e.toString())}
      >
        {tabsList.map((tab) => {
          return (
            <Tab key={tab.key} title={tab.title}>
              <div className="h-[600px] w-full px-2 lg:px-4">
                {tab.component}
              </div>
            </Tab>
          )
        })}
      </Tabs>
    </div>
  )
}
