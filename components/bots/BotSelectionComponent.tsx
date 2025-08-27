'use client'

import React from 'react'
import Link from 'next/link'

import {ArrowRight} from "@/utils/icons";

// =================================================================================================
// SVG ICONS
// New stateless functional components for rendering icons as per the new design.
// =================================================================================================

/**
 * Renders a "users" icon.
 */
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
)

/**
 * Renders an icon for a Technical Analysis Bot.
 */
const TechnicalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 75 l 15-30 15 15 20-35 25 40" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 85 C 45 85, 65 30, 85 20" strokeDasharray="5,5" strokeWidth="3" />
    </svg>
)

/**
 * Renders an icon for a Dollar-Cost Averaging (DCA) Bot.
 */
const DcaIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 75h20 M35 50h20 M60 25h20" strokeLinecap="round" />
      <path d="M15 70 A 20 25 0 0 1 40 45" strokeDasharray="5,5" strokeLinecap="round" strokeWidth="2" />
      <path d="M40 45 A 20 25 0 0 1 65 20" strokeDasharray="5,5" strokeLinecap="round" strokeWidth="2" />
    </svg>
)

/**
 * Renders an icon for a Grid Trading Bot.
 */
const GridIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 20h60v60h-60zM20 40h60M20 60h60M40 20v60M60 20v60" />
    </svg>
)


// =================================================================================================
// MOCK DATA
// In a real application, this data should be fetched from your API.
// =================================================================================================

const botStats = [
  {
    id: 'technical',
    name: 'Technical Bot',
    count: '9,821',
    volume: '300K',
    roi: '+18%',
    icon: TechnicalIcon,
    link: '/bots/technical'
  },
  {
    id: 'dca',
    name: 'DCA Bot',
    count: '6,211',
    volume: '120K',
    roi: '+11%',
    icon: DcaIcon,
    link: '/bots/dca'
  },
  {
    id: 'grid',
    name: 'Grid Bot',
    count: '3,845',
    volume: '80K',
    roi: '+8%',
    icon: GridIcon,
    link: '/bots/grid'
  }
]

// =================================================================================================
// REUSABLE BOT CARD COMPONENT
// =================================================================================================
interface BotCardProps {
  name: string;
  count: string;
  volume: string;
  roi: string;
  icon: React.ElementType;
}

const BotCard = ({ name, count, volume, roi, icon: Icon }: BotCardProps) => {
  return (
      // Main container for the card with styling and hover effects.
      <div className="bg-dark-gray rounded-lg p-4 flex items-center gap-5 hover:ring-2 hover:ring-green/80 transition-all duration-300 cursor-pointer group w-full sm:w-[378px] h-[108px]">

        {/* Left side: Icon */}
        <Icon className="w-16 h-16 text-gray-500 group-hover:text-green transition-colors duration-300 flex-shrink-0" />

        {/* Middle: Container for all textual information. */}
        <div className="flex-grow flex flex-col justify-between h-full py-1">

          {/* Top section: Bot name and user count. */}
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-100">{name}</h3>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1 text-gray-400">
              <UsersIcon className="w-4 h-4" />
              <span className="font-mono text-xs">{count}</span>
            </div>
          </div>

          {/* Bottom section: Volume and ROI statistics. */}
          <div className="flex items-center gap-3">
            <p>
              <span className="text-xs font-normal text-gray-400">Volume: </span>
              <span className="text-sm font-semibold text-white font-mono">{volume}</span>
            </p>
            <span className="text-gray-600">|</span>
            <p>
              <span className="text-xs font-normal text-gray-400">7-day ROI: </span>
              <span className="text-sm font-semibold text-[var(--text-green)] font-mono">{roi}</span>
            </p>
          </div>
        </div>

        {/* Far Right: Click indicator arrow. */}
        <ArrowRight />
      </div>
  )
}


// =================================================================================================
// MAIN EXPORTED COMPONENT
// This component arranges the bot cards.
// =================================================================================================
export default function BotSelectionComponent() {
  return (
      <div className="space-y-6">
        <h2 className="text-white text-2xl font-semibold mb-4">
          Trading Bots
        </h2>
        <div className="flex flex-col md:flex-row flex-wrap items-center md:items-start gap-5">
          {/* Map over the bot data to render a clickable card for each bot. */}
          {botStats.map((bot) => (
              <Link key={bot.id} passHref href={bot.link}>
                <BotCard {...bot} />
              </Link>
          ))}
        </div>
      </div>
  )
}
