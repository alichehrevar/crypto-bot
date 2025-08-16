'use client'

import React, { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { ChartData } from '@/types/chart'

// =================================================================================================
// SUB-COMPONENTS
// =================================================================================================

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        const maxBalance = 150000
        const percentage = ((data.value / maxBalance) * 100).toFixed(0)

        return (
            <div
                className="w-[143px] h-[61px] rounded-lg p-2.5 flex flex-col justify-center"
                style={{
                    backgroundColor: 'rgba(76, 175, 80, 0.05)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(76, 175, 80, 0.1)',
                }}
            >
                <div className="text-white flex justify-between items-baseline mb-1">
                    <p className="text-xs">Balance</p>
                    <p className="font-bold text-sm">${data.value.toLocaleString()}</p>
                </div>
                <div className="w-full bg-gray-700/70 rounded-full h-1.5">
                    <div className="bg-[#4CAF50] h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
            </div>
        )
    }

    return null
}

const CustomizedActiveDot = ({ cx, cy }: any) => (
    <g>
        <circle cx={cx} cy={cy} fill="rgba(76, 175, 80, 0.3)" r={8} />
        <circle cx={cx} cy={cy} fill="#4CAF50" r={4} stroke="#0D0D0D" strokeWidth={2} />
    </g>
)

// =================================================================================================
// REUSABLE AREA CHART COMPONENT
// =================================================================================================
export default function ReusableAreaChart({ data }: { data: ChartData }) {
    const [ticks, setTicks] = useState<string[]>([])
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | undefined>(undefined)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const getCustomTicks = (data: ChartData) => {
            if (!data || data.length < 2) return []
            const tickCount = 7
            const result: string[] = []
            const step = (data.length - 1) / (tickCount - 1)

            for (let i = 0; i < tickCount; i++) {
                const index = Math.round(i * step)

                if (index < data.length) result.push(data[index].date)
            }

            return Array.from(new Set(result))
        }

        setTicks(getCustomTicks(data))
    }, [data])

    return (
        <div ref={containerRef} className="w-full h-full">
            <ResponsiveContainer height="100%" width="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                    onMouseLeave={() => setTooltipPos(undefined)}
                    onMouseMove={(state: any) => {
                        if (state && state.chartX && state.chartY && containerRef.current) {
                            const containerRect = containerRef.current.getBoundingClientRect()

                            // Tooltip dimensions and desired offset from the cursor
                            const tooltipWidth = 143
                            const tooltipHeight = 61
                            const xOffset = 20
                            const yOffset = 0

                            let x = state.chartX + xOffset
                            let y = state.chartY + yOffset

                            // Check right boundary
                            if (x + tooltipWidth > containerRect.width) {
                                x = state.chartX - tooltipWidth - xOffset // Flip to the left
                            }

                            // Check top boundary
                            if (y < 0) {
                                y = 0 // Align to the top
                            }

                            // Check bottom boundary
                            if (y + tooltipHeight > containerRect.height) {
                                y = containerRect.height - tooltipHeight // Align to the bottom
                            }

                            setTooltipPos({ x, y })
                        }
                    }}
                >
                    <defs>
                        <linearGradient id="colorValue" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <XAxis
                        axisLine={false}
                        dataKey="date"
                        domain={['dataMin', 'dataMax']}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickLine={false}
                        ticks={ticks}
                    />

                    <YAxis
                        domain={[(dataMin: number) => (dataMin * 0.95), (dataMax: number) => (dataMax * 1.05)]}
                        hide={true}
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={false}
                        position={tooltipPos}
                        wrapperStyle={{ outline: 'none', pointerEvents: 'none' }}
                    />

                    <Area
                        activeDot={<CustomizedActiveDot />}
                        dataKey="value"
                        fill="url(#colorValue)"
                        fillOpacity={1}
                        stroke="#4CAF50"
                        strokeWidth={1.5}
                        type="natural"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
