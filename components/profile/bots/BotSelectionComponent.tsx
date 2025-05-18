'use client'

import React, { useState } from 'react'
import { Tabs, Tab } from '@heroui/react'
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

// replace these with your actual user‐icon component
import { TechnicalChartIcon, DcaChartIcon, GridChartIcon } from '@/utils/icons'

// --- demo data ---
const technicalBots = [
  {
    id: 'tech1',
    label: 'Technical Bot',
    users: 10,
    count: '300+',
    changePct: 14,
    Icon: TechnicalChartIcon,
  },
  {
    id: 'tech2',
    label: 'DCA Bot',
    users: 8,
    count: '120+',
    changePct: 7,
    Icon: DcaChartIcon,
  },
  {
    id: 'tech3',
    label: 'Grid Bot',
    users: 5,
    count: '80+',
    changePct: 4,
    Icon: GridChartIcon,
  }
]

// one‐point‐per‐day sample
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

export default function BotSelectionComponent() {
  const [tab, setTab] = useState<'technical' | 'dca' | 'grid'>('technical')
  const [selectedBot, setSelectedBot] = useState(technicalBots[0].id)

  return (
    <section className="mt-16 mb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-2xl font-semibold mb-4">
          Trading Bots
        </h2>

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
          {/* Left: Cards */}
          <div className="space-y-6 w-2/5">
            {technicalBots.map((bot) => {
              const active = bot.id === selectedBot

              return (
                <button
                  key={bot.id}
                  className={`
                    flex justify-between items-center px-6 py-4 rounded-2xl 
                    ${active
                    ? 'border-1 border-primary'
                    : 'border border-white/20'}
                    bg-white/10 backdrop-blur-md cursor-pointer
                  `}
                  onClick={() => setSelectedBot(bot.id)}
                >
                  <div className="space-y-1">
                    {/* title + users */}
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        {bot.label}
                      </span>
                      <span className="text-gray-400 text-xs flex items-center">
                        <svg
                          className="w-4 h-4 mr-1 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        {bot.users}
                      </span>
                    </div>
                    {/* count */}
                    <div className="text-2xl font-bold text-white">
                      {bot.count}
                    </div>
                    {/* change */}
                    <div className="text-sm text-green-400">
                      ↗ +{bot.changePct}% vs previous week
                    </div>
                    {/* create link */}
                    <div className="pt-2 text-sm text-white font-medium">
                      Create →
                    </div>
                  </div>
                  <bot.Icon />
                </button>
              )
            })}
          </div>

          {/* Right: Chart only as tall as one card */}
          <div className="h-[220px] w-3/5 relative">
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
