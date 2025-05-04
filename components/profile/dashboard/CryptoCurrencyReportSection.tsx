// app/components/TopMovers.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { getData } from "@/actions/get";
import { TopMover } from '@/types/TopMover';
import { ChevronDownIcon, ChevronUpIcon } from "@/utils/icons";

export default function TopMovers() {
  const [items, setItems] = useState<TopMover[]>([])
  const LIMIT = 4

  useEffect(() => {
    topMovers()
      .then((response: TopMover[]) => setItems(response))
      .catch(err => {
        console.error('Failed to load top movers', err)
      })
  }, [])

  const topMovers = async () => {
    return await getData(`/market/top-movers?limit=${LIMIT}`)
  }

  return (
    <div className="px-4 rounded-lg w-full">
      {items.length > 0 && Object.values(items).map(item => {
        const isUp = item.changePct >= 0
        return (
          <div
            key={item.symbol}
            className="flex justify-between items-center pt-3.5"
          >
            <div className="flex items-center space-x-3">
              {/*<img*/}
              {/*  src={`/assets/icons/${item.symbol.toLowerCase()}.svg`}*/}
              {/*  alt={item.symbol}*/}
              {/*  className="w-6 h-6"*/}
              {/*  onError={e => { (e.currentTarget as HTMLImageElement).src = '/assets/icons/default.svg' }}*/}
              {/*/>*/}
              <div>
                <div className="text-white font-medium text-sm">{item.name}</div>
                <div className="text-gray-500 text-xs">{item.symbol}</div>
              </div>
            </div>
            <div
              className={`flex items-center font-semibold ${
                isUp ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isUp ? <ChevronUpIcon /> : <ChevronDownIcon />}
              <span className="ml-1">{Math.abs(item.changePct).toFixed(2)}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
