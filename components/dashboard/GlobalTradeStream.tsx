// components/dashboard/GlobalTradeStream.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Pagination } from '@/components/common/Pagination'
import { PremiumCheckbox } from '@/components/common/PremiumCheckbox'
import { MOCK_GLOBAL_TRADES } from '@/lib/mock-service'
import { Activity, Clock, Filter, TrendingUp, TrendingDown } from 'lucide-react'

// ... (Interface remains the same)

export function GlobalTradeStream() {
    const [tradeStreamPage, setTradeStreamPage] = useState(1)
    const [tradeStreamFilter, setTradeStreamFilter] = useState({ buy: true, sell: true })
    const [tradeStreamBotFilter, setTradeStreamBotFilter] = useState({
        TECHNICAL: true,
        GRID: true,
        DCA: true,
        CUSTOM_AI: true,
    })
    const [searchTerm] = useState('')
    const ITEMS_PER_PAGE_STREAM = 14

    const globalTrades = MOCK_GLOBAL_TRADES

    const toggleSideFilter = (key: 'buy' | 'sell') => {
        setTradeStreamFilter(prev => ({ ...prev, [key]: !prev[key] }))
        setTradeStreamPage(1) // Reset page immediately
    }

    const toggleBotFilter = (key: keyof typeof tradeStreamBotFilter) => {
        setTradeStreamBotFilter(prev => ({ ...prev, [key]: !prev[key] }))
        setTradeStreamPage(1) // Reset page immediately
    }

    const filteredStream = useMemo(() => {
        return globalTrades.filter((t) => {
            const matchesSearch =
                t.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.id.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesSideFilter =
                ((tradeStreamFilter.buy && t.side === 'BUY') || (tradeStreamFilter.sell && t.side === 'SELL'))

            const matchesBotFilter =
                tradeStreamBotFilter[t.botType as keyof typeof tradeStreamBotFilter]

            return matchesSearch && matchesSideFilter && matchesBotFilter
        })
    }, [globalTrades, tradeStreamFilter, tradeStreamBotFilter, searchTerm])

    const paginatedStream = useMemo(() => {
        const start = (tradeStreamPage - 1) * ITEMS_PER_PAGE_STREAM
        return filteredStream.slice(start, start + ITEMS_PER_PAGE_STREAM)
    }, [filteredStream, tradeStreamPage])

    const totalStreamPages = Math.ceil(filteredStream.length / ITEMS_PER_PAGE_STREAM)

    const getPriceChangeColor = (price: string, index: number) => {
        if (index === 0) return 'text-white'
        const prevPrice = parseFloat(filteredStream[index - 1]?.price || price)
        const currentPrice = parseFloat(price)
        return currentPrice >= prevPrice ? 'text-emerald-500' : 'text-rose-500'
    }

    const formatPrice = (price: string) => {
        const num = parseFloat(price)
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    }

    return (
        <Card className="h-130 flex flex-col p-0 border border-zinc-800 bg-zinc-950">
            <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <Activity size={14} /> Global Trade Stream
                    </h3>
                    {/* ... Stats Section (Unchanged) ... */}
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex gap-2 border-r border-zinc-800 pr-4">
                            <PremiumCheckbox
                                label="Buy"
                                checked={tradeStreamFilter.buy}
                                // 3. UPDATED ONCHANGE
                                onChange={() => toggleSideFilter('buy')}
                            />
                            <PremiumCheckbox
                                label="Sell"
                                checked={tradeStreamFilter.sell}
                                // 3. UPDATED ONCHANGE
                                onChange={() => toggleSideFilter('sell')}
                            />
                        </div>
                        <div className="flex gap-2">
                            {/* 3. UPDATED ONCHANGE FOR ALL BOTS */}
                            <PremiumCheckbox
                                label="Technical"
                                checked={tradeStreamBotFilter.TECHNICAL}
                                onChange={() => toggleBotFilter('TECHNICAL')}
                            />
                            <PremiumCheckbox
                                label="Grid"
                                checked={tradeStreamBotFilter.GRID}
                                onChange={() => toggleBotFilter('GRID')}
                            />
                            <PremiumCheckbox
                                label="DCA"
                                checked={tradeStreamBotFilter.DCA}
                                onChange={() => toggleBotFilter('DCA')}
                            />
                            <PremiumCheckbox
                                label="Custom AI"
                                checked={tradeStreamBotFilter.CUSTOM_AI}
                                onChange={() => toggleBotFilter('CUSTOM_AI')}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ... Rest of the component (List, Pagination, Footer) remains exactly the same ... */}
            <div className="flex-1 overflow-hidden relative bg-black">
                <div className="grid grid-cols-12 px-4 py-2 border-b border-zinc-900 text-[10px] uppercase font-bold text-zinc-600">
                    <div className="col-span-2">Pair</div>
                    <div className="col-span-2 text-center">Bot Type</div>
                    <div className="col-span-2 text-center">User</div>
                    <div className="col-span-2 text-right">Time</div>
                    <div className="col-span-2 text-right">Price</div>
                    <div className="col-span-2 text-right">Side / Vol</div>
                </div>

                <div className="absolute inset-0 top-8 overflow-y-auto custom-scrollbar">
                    {paginatedStream.map((t, i) => {
                        const priceChangeColor = getPriceChangeColor(t.price, i + (tradeStreamPage - 1) * ITEMS_PER_PAGE_STREAM)
                        const isPriceUp = priceChangeColor === 'text-emerald-500'

                        return (
                            <div
                                key={t.id}
                                className="grid grid-cols-12 items-center px-4 py-3 text-xs border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors group"
                            >
                                <div className="col-span-2 font-bold text-white font-mono">{t.pair}</div>
                                <div className="col-span-2 text-center">
                                    <Badge variant={t.botType}>{t.botType}</Badge>
                                </div>
                                <div className="col-span-2 text-center text-zinc-500 font-mono text-[10px]">{t.user}</div>
                                <div className="col-span-2 text-right text-zinc-600 font-mono text-[10px] flex items-center justify-end gap-1">
                                    <Clock size={10} /> {t.time}
                                </div>
                                <div className="col-span-2 text-right">
                                    <div className={`font-mono ${priceChangeColor} flex items-center justify-end gap-1`}>
                                        {isPriceUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        ${formatPrice(t.price)}
                                    </div>
                                </div>
                                <div className="col-span-2 text-right">
                                    <div className={`font-bold ${t.side === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {t.side}
                                    </div>
                                    <div className="text-[10px] text-zinc-600 font-mono">{t.vol}</div>
                                </div>
                            </div>
                        )
                    })}

                    {paginatedStream.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Filter size={24} className="text-zinc-700 mb-2" />
                            <div className="text-zinc-600 text-sm">No trades match your filters</div>
                            <div className="text-zinc-700 text-xs mt-1">Try adjusting your search or filters</div>
                        </div>
                    )}
                </div>
            </div>

            <Pagination
                page={tradeStreamPage}
                setPage={setTradeStreamPage}
                total={totalStreamPages}
                label="Stream"
            />
        </Card>
    )
}
