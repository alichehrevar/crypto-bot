import React from "react";
import { Tab, Tabs } from "@heroui/react";

import BarChart from "@/components/profile/charts/BarChart";
import RadialBarChart from "@/components/profile/charts/RadialBarChart";

export default function PnLSection() {

  const [selectedDuration, setSelectedDuration] = React.useState<string>('1d');
  const [selectedTab, setSelectedTab] = React.useState<string>('realized-pnl');

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <ul className="flex items-center justify-start gap-1 w-auto">
          <li>
            <button
              className={`bg-default-100 w-[35px] text-center text-[12px] py-0.5 rounded-lg border-1 transition-all duration-300 ${selectedDuration === '1d' ? 'border-primary' : 'border-default-100'}`}
              onClick={() => setSelectedDuration('1d')}
            >
              1 D
            </button>
          </li>
          <li>
            <button
              className={`bg-default-100 w-[35px] text-center text-[12px] py-0.5 rounded-lg border-1 transition-all duration-300 ${selectedDuration === '1w' ? 'border-primary' : 'border-default-100'}`}
              onClick={() => setSelectedDuration('1w')}
            >
              1 W
            </button>
          </li>
          <li>
            <button
              className={`bg-default-100 w-[35px] text-center text-[12px] py-0.5 rounded-lg border-1 transition-all duration-300 ${selectedDuration === '1m' ? 'border-primary' : 'border-default-100'}`}
              onClick={() => setSelectedDuration('1m')}
            >
              1 M
            </button>
          </li>
          <li>
            <button
              className={`bg-default-100 w-[35px] text-center text-[12px] py-0.5 rounded-lg border-1 transition-all duration-300 ${selectedDuration === '1y' ? 'border-primary' : 'border-default-100'}`}
              onClick={() => setSelectedDuration('1y')}
            >
              1 Y
            </button>
          </li>
        </ul>
        <div className="flex flex-col">
          <Tabs
            aria-label="Options"
            classNames={{
              tabList: 'h-7 rounded-lg px-0.5',
              tab: 'py-0 px-1 h-6 rounded-lg'
            }}
            selectedKey={selectedTab}
            onSelectionChange={(selectedKey) => setSelectedTab(selectedKey as string)}
          >
            <Tab key="realized-pnl" title={<span className="text-[12px]">Realized PnL</span>} />
            <Tab key="unrealized-pnl" title={<span className="text-[12px]">Unrealized PnL</span>} />
          </Tabs>
        </div>
      </div>
      <div className="h-[160px] w-full">
        {selectedTab === 'realized-pnl' && <BarChart />}
        {selectedTab === 'unrealized-pnl' && <RadialBarChart />}
      </div>
    </>
  )
}
