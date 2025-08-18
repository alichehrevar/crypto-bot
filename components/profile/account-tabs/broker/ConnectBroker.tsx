import { Tab, Tabs } from "@heroui/react";

import BinanceTab from "@/components/profile/account-tabs/broker/broker-tabs/Binance";
import OKXTab from "@/components/profile/account-tabs/broker/broker-tabs/OKX";
import BingXTab from "@/components/profile/account-tabs/broker/broker-tabs/BingX";
import ByBitTab from "@/components/profile/account-tabs/broker/broker-tabs/ByBit";

export default function ConnectBrokerTab() {
  return (
    <section className="dark:bg-[#161616] light:bg-white shadow-lg flex flex-col items-start justify-center w-full rounded-lg mx-4 py-10 px-10 gap-10">
      <Tabs
        isVertical
        aria-label="Options"
        classNames={{
          tabList: 'bg-unset gap-3 w-[300px]',
          tab: 'h-12 ',
          cursor: 'dark:bg-unset group-data-[selected=true]:border-1 group-data-[selected=true]:border-primary',
          tabWrapper: 'w-full',
          tabContent: 'w-full',
          panel: "w-full flex items-center justify-center mt-4"
        }}
        variant="light"
      >
        <Tab key="binance" title={
          <div className="flex items-center justify-between w-full gap-2">
            <span>Binance</span>
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"
                 viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        }>
          <BinanceTab />
        </Tab>
        <Tab key="okx" title={
          <div className="flex items-center justify-between w-full gap-2">
            <span>OKX</span>
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"
                 viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        }>
          <OKXTab />
        </Tab>
        <Tab key="bingx" title={
          <div className="flex items-center justify-between w-full gap-2">
            <span>BingX</span>
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"
                 viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        }>
          <BingXTab />
        </Tab>
        <Tab key="bybit" title={
          <div className="flex items-center justify-between w-full gap-2">
            <span>ByBit</span>
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"
                 viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        }>
          <ByBitTab />
        </Tab>
      </Tabs>
    </section>
  )
}
