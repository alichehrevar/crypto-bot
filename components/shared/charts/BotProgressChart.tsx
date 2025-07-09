'use client'

import React, { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Tab, Tabs } from "@heroui/react";

export default function BotProgressChart () {

  const [tab, setTab] = useState<'technical' | 'dca' | 'grid'>('technical')

  const chartData = [
    { date: '10 Dec', value: 92000 },
    { date: '11 Dec', value: 94000 },
    { date: '12 Dec', value: 91000 },
    { date: '13 Dec', value: 95000 },
    { date: '14 Dec', value: 93000 },
    { date: '15 Dec', value: 97500 },
    { date: '16 Dec', value: 91500 },
    { date: '17 Dec', value: 96000 },
    { date: '18 Dec', value: 94000 },
    { date: '19 Dec', value: 98000 },
    { date: '20 Dec', value: 99000 },
    { date: '21 Dec', value: 97000 },
  ]

// mimics your “Balance 60% $94,475” popup
  function BalanceTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-white/10 backdrop-blur-md rounded p-2 text-white text-xs">
        <div className="font-semibold leading-tight">Balance</div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-lg font-bold">60%</span>
          <span>$94,475</span>
        </div>
      </div>
    )
  }

  return (
    <section className="w-full lg:w-[65%] mt-4 self-stretch flex flex-col gap-10">
      <div className="flex items-center justify-center mb-10">
        {/* Tabs */}
        <Tabs
          classNames={{
            tabList: 'rounded-full',
            tab: 'px-6 py-3 text-sm font-medium',
          }}
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k as any)}
        >
          <Tab key="technical" title="Technical Bot" value="technical" />
          <Tab key="dca"       title="DCA Bot"       value="dca"       />
          <Tab key="grid"      title="Grid"      value="grid"          />
        </Tabs>
      </div>

      {/* Panels */}
      {tab === 'technical' && (
        <div className="mt-4 flex items-center justify-center flex-col lg:flex-row w-full gap-12">
          <div className="h-[400px] w-full relative">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  dy={10}
                  height={20}
                  stroke="#555"
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <Tooltip content={<BalanceTooltip />} cursor={false} />
                <Line
                  dataKey="value"
                  dot={{
                    r: 4,
                    fill: '#4ade80',
                    stroke: '#fff',
                    strokeWidth: 2
                  }}
                  stroke="#4ade80"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* stub for DCA/Grid */}
      {(tab === 'dca' || tab === 'grid') && (
        <div className="mt-8 text-gray-400 text-center">
          {tab === 'dca' ? 'DCA Bot content…' : 'Grid Bot content…'}
        </div>
      )}
    </section>
  )
}
