'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { addToast } from '@heroui/react'
import { ChevronUpIcon } from '@heroui/shared-icons'

import { getData } from '@/actions/get'
import { TopMover, TopMoversResponse } from '@/types/TopMover'
import { BarsArrowUpIcon } from "@/utils/icons";

export default function TopMovers() {
  const [items, setItems] = useState<TopMover[]>([])
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const LIMIT = 5

  useEffect(() => {
    fetchTopMovers()
      .then((response: TopMoversResponse) => {
        if (response.success) {
          setItems(response.data)
        } else {
          addToast({ title: response.error || 'Unknown error', color: 'danger' })
        }
      })
      .catch(err => {
        addToast({
          title: 'Failed to load top movers: ' + err.message,
          color: 'danger',
        })
      })
  }, [sortOrder])

  const fetchTopMovers = async (): Promise<TopMoversResponse> => {
    return getData(`/market/top-movers?limit=${LIMIT}&direction=${sortOrder}`)
  }

  return (
    <div>
      {/* header + sort buttons */}
      <div className="flex justify-between items-center mb-6 mt-10">
        <h2 className="font-bold text-xl">Big Moves</h2>
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
      <ul className="space-y-4">
        {items.map((item, index) => {
          const isUp = item.changePct >= 0

          return (
            <li
              key={index}
              className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 backdrop-blur-md"
            >
              {/* Left: icon + name */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 relative rounded-full">
                  <Image
                    fill
                    alt={item.symbol}
                    className="w-8 h-8 rounded-full"
                    src={item.imageUrl}
                    onError={(e) => {
                      e.currentTarget.src = '/images/icons/default.svg';
                    }}
                  />
                </div>
                <div>
                  <div className="text-white text-base font-medium">
                    {item.name}
                  </div>
                  <div className="text-gray-400 text-sm uppercase">
                    {item.symbol}
                  </div>
                </div>
              </div>

              {/* Right: change */}
              <div className={`flex items-center space-x-1 font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                <ChevronUpIcon className={`w-4 h-4 ${isUp ? '' : 'rotate-180'}`} />
                <span>{item.changePct.toFixed(2)}%</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
