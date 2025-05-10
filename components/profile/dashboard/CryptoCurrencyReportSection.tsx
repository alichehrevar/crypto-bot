'use client'

import React, { useEffect, useState } from 'react'
import { getData } from "@/actions/get";
import { TopMover, TopMoversResponse } from '@/types/TopMover';
import { ChevronUpIcon, ChevronDownIcon } from "@/utils/icons";
import { addToast } from "@heroui/react";

export default function TopMovers() {
  const [items, setItems] = useState<TopMover[]>([])
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const LIMIT = 5

  useEffect(() => {
    fetchTopMovers()
      .then((response: TopMover[]) => {
        if (response) {
          setItems(response)
        }
      })
      .catch(err => {
        addToast({
          title: 'Failed to load top movers: ' + err,
          color: "danger",
        });
      })
  }, [sortOrder])

  const fetchTopMovers = async () => {
    // if your endpoint returns { symbol, name, changePct, imageUrl }
    const data: TopMoversResponse = await getData(`/market/top-movers?limit=${LIMIT}`)
    // sort client-side so we can toggle asc/desc instantly
    return data.data.sort((a, b) =>
      sortOrder === 'desc'
        ? b.changePct - a.changePct
        : a.changePct - b.changePct
    )
  }

  // figure out the tallest bar (for normalization)
  const maxPct = items.length ? Math.max(...items.map(i => Math.abs(i.changePct))) : 1

  return (
    <div className="relative bg-black p-6 rounded-2xl">
      {/* header + sort buttons */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white text-xl font-bold">Big Changes</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setSortOrder('desc')}
            className={sortOrder === 'desc' ? 'text-white' : 'text-gray-500'}
            title="Sort ↓"
          >
            <ChevronUpIcon className="w-5 h-5 transform rotate-180" />
          </button>
          <button
            onClick={() => setSortOrder('asc')}
            className={sortOrder === 'asc' ? 'text-white' : 'text-gray-500'}
            title="Sort ↑"
          >
            <ChevronUpIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* bars */}
      <div className="grid grid-flow-col auto-cols-fr gap-4 items-end">
        {items.map(item => {
          const barHeight = (Math.abs(item.changePct) / maxPct) * 100
          const isUp = item.changePct >= 0
          return (
            <div key={item.symbol} className="flex flex-col items-center">
              {/* percentage */}
              <span
                className={`mb-2 text-sm font-semibold ${
                  isUp ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {item.changePct.toFixed(2)}%
              </span>
              {/* bar */}
              <div
                className={`w-8 rounded-t-md shadow-lg ${
                  isUp
                    ? 'bg-green-500 shadow-green-500/50'
                    : 'bg-red-500 shadow-red-500/50'
                }`}
                style={{ height: `${barHeight}%` }}
              />
              {/* icon */}
              <img
                src={item.imageUrl}
                alt={item.symbol}
                className="w-6 h-6 mt-3"
                onError={e => {
                  ;(e.currentTarget as HTMLImageElement).src =
                    '/assets/icons/default.svg'
                }}
              />
              {/* symbol */}
              <span className="mt-1 text-xs text-white">
                {item.symbol}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
