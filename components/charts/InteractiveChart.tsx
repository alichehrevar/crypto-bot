// components/charts/InteractiveChart.tsx
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { MoveHorizontal } from 'lucide-react'
import { SimpleLineChart } from './SimpleLineChart'

interface ChartDataPoint {
    d: number
    v: number
}

interface InteractiveChartProps {
    data: ChartDataPoint[]
    type: 'PNL' | 'EQUITY'
    setType: (t: 'PNL' | 'EQUITY') => void
    className?: string
}

export function InteractiveChart({ data, type, setType, className }: InteractiveChartProps) {
    const [filter, setFilter] = useState<'1D' | '7D' | '30D' | 'ALL'>('30D')
    const [windowStart, setWindowStart] = useState(0)
    const [hoverData, setHoverData] = useState<ChartDataPoint | null>(null)
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

    const chartAreaRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const lastX = useRef(0)

    const windowSize = useMemo(() => {
        const len = data.length
        switch (filter) {
            case '1D':
                return Math.ceil(len * 0.05)
            case '7D':
                return Math.ceil(len * 0.2)
            case '30D':
                return Math.ceil(len * 0.5)
            case 'ALL':
                return len
            default:
                return len
        }
    }, [filter, data.length])

    useEffect(() => {
        setWindowStart(Math.max(0, data.length - windowSize))
    }, [windowSize, data.length])

    const visibleData = useMemo(() => {
        const start = Math.max(0, Math.min(windowStart, data.length - windowSize))
        const end = Math.min(data.length, start + windowSize)
        return data.slice(start, end)
    }, [data, windowStart, windowSize])

    const yAxisRange = useMemo(() => {
        const max = Math.max(...visibleData.map((d) => d.v))
        const min = Math.min(...visibleData.map((d) => d.v))
        return { max, min }
    }, [visibleData])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (filter === 'ALL') return
        isDragging.current = true
        lastX.current = e.clientX
        if (chartAreaRef.current) {
            chartAreaRef.current.classList.add('cursor-grabbing')
            chartAreaRef.current.classList.remove('cursor-grab')
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!chartAreaRef.current) return
        const rect = chartAreaRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const width = rect.width

        const hoverIndex = Math.min(
            visibleData.length - 1,
            Math.max(0, Math.round((x / width) * (visibleData.length - 1))),
        )
        const point = visibleData[hoverIndex]

        if (point) {
            setHoverData(point)
            const range = yAxisRange.max - yAxisRange.min || 1
            const yPct = 100 - ((point.v - yAxisRange.min) / range) * 80 - 10
            const xPct = (hoverIndex / (visibleData.length - 1)) * 100
            setHoverPos({ x: xPct, y: yPct })
        }

        if (isDragging.current) {
            const deltaX = lastX.current - e.clientX
            const sensitivity = (windowSize / width) * 2
            const deltaIndex = deltaX * sensitivity

            if (Math.abs(deltaIndex) >= 1) {
                setWindowStart((prev) => {
                    const next = prev + deltaIndex
                    return Math.max(0, Math.min(next, data.length - windowSize))
                })
                lastX.current = e.clientX
            }
        }
    }

    const handleMouseUp = () => {
        isDragging.current = false
        if (chartAreaRef.current) {
            chartAreaRef.current.classList.remove('cursor-grabbing')
            chartAreaRef.current.classList.add('cursor-grab')
        }
    }

    const handleMouseLeave = () => {
        handleMouseUp()
        setHoverData(null)
        setHoverPos(null)
    }

    const chartColor = '#ffffff'

    return (
        <Card className={`flex flex-col p-0 overflow-hidden ${className || 'h-full'}`}>
            <div className="p-4 border-b border-zinc-900 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-zinc-950">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase text-zinc-500 mr-4">User Performance</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setType('PNL')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${
                                type === 'PNL' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
                            }`}
                        >
                            PnL
                        </button>
                        <button
                            onClick={() => setType('EQUITY')}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${
                                type === 'EQUITY' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
                            }`}
                        >
                            Equity
                        </button>
                    </div>
                </div>

                <div className="flex gap-1">
                    {['1D', '7D', '30D', 'ALL'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-3 py-1 text-[10px] font-bold transition-all rounded-sm uppercase ${
                                filter === f ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative p-6 flex-1 min-h-0 flex flex-col bg-zinc-950">
                <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-center pointer-events-none">
                    <div className="h-[75%] flex flex-col justify-between text-[9px] font-mono text-zinc-600">
                        <span>${yAxisRange.max.toFixed(0)}</span>
                        <span>${yAxisRange.min.toFixed(0)}</span>
                    </div>
                </div>

                <div
                    ref={chartAreaRef}
                    className={`relative w-full h-full ml-6 flex flex-col justify-center ${
                        filter !== 'ALL' ? 'cursor-grab' : ''
                    }`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="w-full h-full relative pointer-events-none">
                        <SimpleLineChart data={visibleData} color={chartColor} />

                        {hoverData && hoverPos && (
                            <>
                                <div
                                    className="absolute top-0 bottom-0 border-l border-zinc-700 border-dashed pointer-events-none"
                                    style={{ left: `${hoverPos.x}%` }}
                                />
                                <div
                                    className="absolute w-2 h-2 rounded-full bg-white pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-10 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                                    style={{ left: `${hoverPos.x}%`, top: `${hoverPos.y}%` }}
                                />
                                <div
                                    className="absolute z-20 bg-zinc-900 border border-zinc-700 p-2 rounded shadow-xl pointer-events-none"
                                    style={{
                                        left: `${hoverPos.x}%`,
                                        top: '0',
                                        transform: `translate(${hoverPos.x > 50 ? '-105%' : '5%'}, 0)`,
                                    }}
                                >
                                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">
                                        INDEX T-{hoverData.d}
                                    </div>
                                    <div className="text-sm font-mono font-bold text-white">
                                        ${hoverData.v.toFixed(2)}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="absolute bottom-1 left-8 right-6 flex justify-between text-[9px] font-mono text-zinc-600 pointer-events-none">
                    <span>T-{visibleData[0]?.d}</span>
                    <span>T-{visibleData[visibleData.length - 1]?.d}</span>
                </div>
            </div>

            {filter !== 'ALL' && (
                <div className="px-6 pb-2 text-[9px] text-zinc-600 flex justify-end items-center gap-1 opacity-50 bg-zinc-950">
                    <MoveHorizontal size={10} /> Drag to Pan
                </div>
            )}
        </Card>
    )
}
