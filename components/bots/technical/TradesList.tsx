// components/profile/bots/technical/TradesList.tsx
'use client'

import React, { useState, useEffect } from 'react'

import CloseTradeModal from '@/components/bots/technical/modals/closeTradeModal'
import { Bot, Trade } from '@/types/bots/DeployedBots'
import { ChevronUpIcon } from '@/utils/icons'

interface TradesListProps {
  bot: Bot
  // collapses the mobile detail view
  onCollapse?: () => void
  refreshBotsList: () => void
}

interface DetailRowProps {
  label: string
  value: string
  valueClass?: string
}

function DetailRow({ label, value, valueClass }: DetailRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 uppercase text-xs font-semibold">
        {label}
      </span>
      <span className={`text-white text-sm ${valueClass || ''}`}>
        {value}
      </span>
    </div>
  )
}

// Hook to detect desktop vs mobile
function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)

    setIsDesktop(mql.matches)
    mql.addEventListener('change', onChange)

    return () => mql.removeEventListener('change', onChange)
  }, [breakpoint])

  return isDesktop
}

export default function TradesList({
                                     bot,
                                     onCollapse,
                                     refreshBotsList
                                   }: TradesListProps) {
  const isDesktop = useIsDesktop()

  const trades = bot.trades || []

  if (trades.length === 0) {
    return (
      <div className="rounded-b-2xl flex items-center justify-center w-full p-6">
        <p className="text-gray-500">No trades yet.</p>
      </div>
    )
  }

  if (isDesktop) {
    // ---- DESKTOP: full grid for each trade ----
    const headers = [
      'Positions',
      'Date',
      'Status',
      'Amount',
      'Side',
      'Open Price',
      'Close Price',
      'Result',
      '' // for the action button
    ]

    return (
      <div className="flex flex-col w-full gap-4 p-4 dark:bg-black rounded-md">
        {/* headers */}
        <div className="grid grid-cols-9 font-semibold text-sm pb-2 border-b border-gray-700">
          {headers.map((h, i) => (
            <div key={i} className="truncate">
              {h}
            </div>
          ))}
        </div>

        {/* one row per trade */}
        {trades.map((trade: Trade, idx: number) => {
          const asset = bot.symbol.split('/')[0]
          const entry = trade.entryPrice
          const exit = trade.exitPrice
          const isClosed = exit != null
          const current = bot.marketInfo.currentCandle?.price ?? entry
          const profit = isClosed
            ? trade.profit
            : (current - entry) * trade.quantity
          const pct =
            (((isClosed ? exit! : current) - entry) / entry) * 100
          const statusText = isClosed ? 'Closed' : 'Open'
          let resultText = '—'

          if (isClosed) {
            resultText =
              profit >= 0
                ? `Win (+${pct.toFixed(2)}%)`
                : `Loss (${pct.toFixed(2)}%)`
          }

          return (
            <div
              key={idx}
              className="grid grid-cols-9 items-center text-[12px] text-sm py-2 hover:bg-white/5 transition"
            >
              <span>{`Position ${idx + 1}`}</span>
              <span>
                {new Date(trade.timestamp).toLocaleString('en-US', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                  hour12: false
                })}
              </span>
              <span>{statusText}</span>
              <span
                className={
                  profit > 0
                    ? 'text-green-500'
                    : profit < 0
                      ? 'text-red-500'
                      : ''
                }
              >
                {profit >= 0 ? '+' : ''}
                {profit.toFixed(2)} {asset}
              </span>
              <span
                className={
                  trade.type === 'BUY'
                    ? 'text-green-500'
                    : 'text-red-500'
                }
              >
                {trade.type === 'BUY' ? 'Buy' : 'Sell'}
              </span>
              <span>
                {entry.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}{' '}
                USDT
              </span>
              <span>
                {isClosed
                  ? exit!
                  .toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }) + ' USDT'
                  : '—'}
              </span>
              <span
                className={
                  isClosed
                    ? profit >= 0
                      ? 'text-green-500'
                      : 'text-red-500'
                    : ''
                }
              >
                {resultText}
              </span>
              <div className="flex justify-end">
                {!isClosed && (
                  <CloseTradeModal
                    botId={bot._id}
                    refreshBotsList={refreshBotsList}
                    tradeId={trade._id}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  } else {
    // ---- MOBILE: only most recent trade, detail rows ----
    const trade = trades[0]
    const entry = trade.entryPrice
    const exit = trade.exitPrice
    const isClosed = exit != null
    const current = bot.marketInfo.currentCandle?.price ?? entry
    const profit = isClosed
      ? trade.profit
      : (current - entry) * trade.quantity
    const pct = (((isClosed ? exit! : current) - entry) / entry) * 100

    return (
      <div className="bg-dark-gray rounded-b-2xl p-4 space-y-3">
        {/* collapse chevron */}
        {onCollapse && (
          <div className="flex justify-end">
            <button
              className="text-gray-400"
              type="button"
              onClick={onCollapse}
            >
              <ChevronUpIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        <DetailRow
          label="Positions"
          value={bot.accountType}
        />
        <DetailRow
          label="Date"
          value={new Date(trade.timestamp).toLocaleDateString()}
        />
        <DetailRow
          label="Status"
          value={isClosed ? 'Closed' : 'Open'}
        />
        <DetailRow
          label="Amount"
          value={`${(
            (trade.quantity / bot.marketInfo.baseFund) *
            100
          ).toFixed(0)}% / ${(
            ((bot.marketInfo.baseFund -
                trade.quantity * entry) /
              bot.marketInfo.baseFund) *
            100
          ).toFixed(0)}%`}
          valueClass="text-green-400"
        />
        <DetailRow
          label="Side"
          value={`${profit >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
          valueClass={profit >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <DetailRow
          label="Open Price"
          value={`x ${trade.quantity.toFixed(2)}`}
        />
        <DetailRow
          label="Close Price"
          value={isClosed ? `x ${trade.quantity.toFixed(2)}` : '—'}
        />
        <DetailRow
          label="Result"
          value={
            isClosed
              ? profit >= 0
                ? `Win +${pct.toFixed(2)}%`
                : `Loss ${pct.toFixed(2)}%`
              : '—'
          }
          valueClass={
            isClosed
              ? profit >= 0
                ? 'text-green-400'
                : 'text-red-400'
              : ''
          }
        />
      </div>
    )
  }
}
