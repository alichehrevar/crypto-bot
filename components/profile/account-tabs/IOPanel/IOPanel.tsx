import { Accordion, AccordionItem, addToast, Tab, Tabs } from "@heroui/react";
import { useEffect, useState } from "react";
import Image from "next/image";

import { ChevronLeftIcon } from "@/components/icons";
import { getData } from "@/actions/get";
import { IndicatorsList, IndicatorsListData } from "@/types/profile/settings/indicatorsList";
import RSIForm from "@/components/profile/account-tabs/IOPanel/indicators/RSIForm";
import MACDForm from "@/components/profile/account-tabs/IOPanel/indicators/MACDForm";
import StochasticRSIForm from "@/components/profile/account-tabs/IOPanel/indicators/StochasticRSIForm";
import BoillingerBandsForm from "@/components/profile/account-tabs/IOPanel/indicators/BoillingerBandsForm";
import HeikinAshiForm from "@/components/profile/account-tabs/IOPanel/indicators/HeikinAshiForm";

export default function IOPanel() {

  const [indicators, setIndicators] = useState<IndicatorsListData>([]);
  const [selected, setSelected] = useState("");

  async function indicatorsList () {
    return await getData('/indicators');
  }

  useEffect(() => {
    indicatorsList()
      .then((response: IndicatorsList) => {
        if (response.success) {
          setIndicators(response.data)
          setSelected(response.data[0])
        } else {
          addToast({
            title: 'Error getting indicators !',
            description: 'Please try again later',
            color: "danger",
          });
        }
      })
  }, [])

  return (
    <section className="dark:bg-[#161616] light:bg-white shadow-lg flex flex-row items-start justify-center w-full rounded-2xl mx-4 py-10 px-10 gap-10">
      <div className="flex w-1/4">
        <Accordion showDivider={false}>
          <AccordionItem
            key="indicators"
            aria-label="indicators"
            classNames={{
              title: 'data-[open=true]:text-primary'
            }}
            indicator={<ChevronLeftIcon />}
            title={<span className="font-bold">Indicators</span>}
          >
            {indicators.length !== 0
              ? <Tabs
                isVertical
                aria-label="Options"
                classNames={{
                  base: 'w-full',
                  tabList: 'bg-unset gap-3 w-full',
                  tab: 'h-12 ',
                  cursor: 'dark:bg-unset group-data-[selected=true]:border-1 group-data-[selected=true]:border-primary',
                  tabWrapper: 'w-full',
                  tabContent: 'w-full',
                  panel: "w-full flex items-center justify-center mt-4"
                }}
                selectedKey={selected}
                variant="light"
                onSelectionChange={(selectedIndex) => setSelected(selectedIndex as string)}
              >
                {Object.values(indicators).map((indicatorName) => (
                  <Tab key={indicatorName} title={
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{indicatorName.replaceAll('_', ' ')}</span>
                    </div>
                  } />
                ))}
              </Tabs>
              : <div className="bg-default-100 text-[12px] text-center py-2 rounded-lg">
                No indicator&#39;s available
              </div>
            }
          </AccordionItem>
          <AccordionItem
            key="strategies"
            aria-label="strategies"
            classNames={{
              title: 'data-[open=true]:text-primary'
            }}
            indicator={<ChevronLeftIcon />}
            title={<span className="font-bold">Strategies</span>}
          >
            {'defaultContent'}
          </AccordionItem>
          <AccordionItem
            key="optimization"
            aria-label="optimization"
            classNames={{
              title: 'data-[open=true]:text-primary'
            }}
            indicator={<ChevronLeftIcon />}
            title={<span className="font-bold">Optimization</span>}
          >
            {'defaultContent'}
          </AccordionItem>
          <AccordionItem
            key="risk-strategies"
            aria-label="risk-strategies"
            classNames={{
              title: 'data-[open=true]:text-primary'
            }}
            indicator={<ChevronLeftIcon />}
            title={<span className="font-bold">Risk Strategies</span>}
          >
            {'defaultContent'}
          </AccordionItem>
        </Accordion>
      </div>
      <div className="w-3/4 w-fu border-1 border-default-100 rounded-2xl h-full flex items-start gap-10 flex-col p-4">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-bold">{selected.replaceAll('_', ' ')}</h3>
          <div className="relative w-[400px] min-h-[260px]">
            <Image fill alt={selected.replaceAll('_', ' ')} className="object-cover" src={`/images/profile/${selected.toLowerCase()}-motion.png`} />
          </div>
        </div>
        {selected === 'RSI' && <RSIForm />}
        {selected === 'MACD' && <MACDForm />}
        {selected === 'Stochastic_RSI' && <StochasticRSIForm />}
        {selected === 'Bollinger_Bands' && <BoillingerBandsForm />}
        {selected === 'Heikin_Ashi' && <HeikinAshiForm />}
      </div>
    </section>
  )
}
