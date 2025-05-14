'use client'

import React, { useEffect, useState } from 'react'
import { addToast } from "@heroui/react"

import { getData } from "@/actions/get"
import { TopMover, TopMoversResponse } from '@/types/TopMover'
import { BarsArrowUpIcon } from "@/utils/icons"
import TopMoversBarLoading from "@/components/loading/profile/dashboard/TopMoversLoading";

export default function TopMovers() {
  const [items, setItems] = useState<TopMover[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const LIMIT = 5

  useEffect(() => {
    setIsLoading(true)
    fetchTopMovers()
      .then((response: TopMoversResponse) => {
        if (response.success) {
          setItems(response.data)
        } else {
          throw new Error(response.error || 'Unknown error')
        }
      })
      .catch(err => {
        addToast({
          title: 'Failed to load top movers: ' + err.message,
          color: "danger",
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [sortOrder])

  const fetchTopMovers = async () => {
    // pass direction so backend returns exactly what you clicked for
    return await getData(
      `/market/top-movers?limit=${LIMIT}&direction=${sortOrder}`
    )
  }

  // find the tallest absolute change so bars scale properly
  const maxPct = items.length
    ? Math.max(...items.map(i => Math.abs(i.changePct)))
    : 1

  return (
    <div className="relative rounded-2xl w-full ">
      {/* header + sort buttons */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white text-xl font-bold">Big Changes</h3>
        <div className="flex space-x-2">
          <button
            className={sortOrder === 'asc' ? 'text-white' : 'text-gray-500'}
            title="Show Bottom ↓"
            onClick={() => setSortOrder('asc')}
          >
            <BarsArrowUpIcon className="w-5 h-5 rotate-180" />
          </button>
          <button
            className={sortOrder === 'desc' ? 'text-white' : 'text-gray-500'}
            title="Show Top ↑"
            onClick={() => setSortOrder('desc')}
          >
            <BarsArrowUpIcon className="w-5 h-5 transform" />
          </button>
        </div>
      </div>

      {isLoading &&
        <TopMoversBarLoading />
      }

      {/* bars container with fixed height so percentages aren’t zero */}
      {!isLoading &&
        <div className="grid grid-flow-col auto-cols-fr gap-4 items-end h-36">
          {items.map(item => {
            const pct = item.changePct
            const heightPct = (Math.abs(pct) / maxPct) * 100
            const isUp = pct >= 0

            return (
              <div key={item.symbol} className="flex flex-col items-center">
                {/* percentage */}
                <span
                  className={`mb-2 text-sm font-semibold ${
                    isUp ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                {pct.toFixed(2)}%
              </span>

                {/* bar */}
                <div className="w-8 h-20 flex items-end">
                  <div
                    className={`w-full rounded-t shadow-lg ${
                      isUp
                        ? 'bg-green-500 shadow-green-500/50'
                        : 'bg-red-500 shadow-red-500/50'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>

                {/* icon */}
                <img
                  alt={item.symbol}
                  className="w-6 h-6 mt-3"
                  src={item.imageUrl}
                  onError={e => {
                    ;(e.currentTarget as HTMLImageElement).src =
                      '/images/icons/default.svg'
                  }}
                />

                {/* symbol (just the base asset) */}
                <span className="mt-1 text-xs text-white">
                {item.symbol.split('/')[0]}
              </span>
              </div>
            )
          })}
        </div>
      }
    </div>
  )
}
