'use client'

import React, { useState } from 'react'

import { TechnicalChartIcon, DcaChartIcon, GridChartIcon } from '@/utils/icons'
import Link from "next/link";

const technicalBots = [
  {
    id: 'tech1',
    label: 'Technical Bot',
    users: 10,
    count: '300+',
    changePct: 14,
    Icon: TechnicalChartIcon,
    link: '/profile/bots/technical'
  },
  {
    id: 'tech2',
    label: 'DCA Bot',
    users: 8,
    count: '120+',
    changePct: 7,
    Icon: DcaChartIcon,
    link: '/profile/bots/dca'
  },
  {
    id: 'tech3',
    label: 'Grid Bot',
    users: 5,
    count: '80+',
    changePct: 4,
    Icon: GridChartIcon,
    link: '/profile/bots/grid'
  }
]

export default function BotSelectionComponent() {
  const [selectedBot, setSelectedBot] = useState(technicalBots[0].id)

  return (
    <div className="space-y-6 w-full lg:w-[32%]">
      <h2 className="text-white text-2xl font-semibold mb-4">
        Trading Bots
      </h2>
      {technicalBots.map((bot) => {
        const active = bot.id === selectedBot

        return (
          <button
            key={bot.id}
            className={`
                    flex justify-between items-center px-6 py-4 rounded-2xl w-full
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
              <Link href={bot.link} className="pt-2 flex text-sm text-white font-medium">
                Create →
              </Link>
            </div>
            <bot.Icon />
          </button>
        )
      })}
    </div>
  )
}
