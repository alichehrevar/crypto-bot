'use client'

import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

import { ChartData } from '@/types/chart'

// =================================================================================================
// SUB-COMPONENTS
// These are the building blocks for the ReusableAreaChart component.
// They are kept in the same file to be co-located with the chart that uses them.
// =================================================================================================

/**
 * CustomTooltip Component
 * Renders the glass-like tooltip that appears when a user hovers over a data point.
 */
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        // Example percentage calculation. Adjust the maxBalance as needed.
        const maxBalance = 150000
        const percentage = ((data.value / maxBalance) * 100).toFixed(0)

        return (
            <div className="relative">
                {/* Tooltip Body */}
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
                {/* Tooltip Pointer */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(76, 175, 80, 0.1)',
                    }}
                />
            </div>
        )
    }

    return null
}

/**
 * CustomizedActiveDot Component
 * Renders the custom dot that appears on the line at the hovered data point.
 */
const CustomizedActiveDot = ({ cx, cy }: any) => (
    <g>
        <circle cx={cx} cy={cy} fill="rgba(76, 175, 80, 0.3)" r={8} />
        <circle cx={cx} cy={cy} fill="#4CAF50" r={4} stroke="#0D0D0D" strokeWidth={2} />
    </g>
)

// =================================================================================================
// REUSABLE AREA CHART COMPONENT
// This component is "presentational". Its only responsibility is to render a chart
// for the data it receives via props. It is completely independent of tabs or other controls.
// =================================================================================================
export default function ReusableAreaChart({ data }: { data: ChartData }) {

    console.log(data)

    // State for the labels displayed on the X-axis
    const [ticks, setTicks] = useState<string[]>([])

    // This effect hook calculates the X-axis ticks whenever the data prop changes.
    useEffect(() => {
        /**
         * Calculates an elegant set of ticks for the X-axis to avoid clutter.
         */
        const getCustomTicks = (data: ChartData) => {
            if (!data || data.length < 2) return []
            const tickCount = 7 // Desired number of labels for a clean look
            const result: string[] = []
            const step = (data.length - 1) / (tickCount - 1)

            for (let i = 0; i < tickCount; i++) {
                const index = Math.round(i * step)

                if (index < data.length) {
                    result.push(data[index].date)
                }
            }

            // Use a Set to ensure all tick values are unique
            return Array.from(new Set(result))
        }

        setTicks(getCustomTicks(data))
    }, [data]) // Re-run this effect when the data prop changes

    return (
        <div className="w-full h-full">
            <ResponsiveContainer height="100%" width="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                    {/* Defines the SVG gradient for the area fill */}
                    <defs>
                        <linearGradient id="colorValue" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    {/* X-Axis Configuration */}
                    <XAxis
                        axisLine={false}
                        dataKey="date"
                        domain={['dataMin', 'dataMax']}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickLine={false}
                        ticks={ticks} // Use the custom calculated ticks
                    />

                    {/* Y-Axis is hidden for aesthetic purposes */}
                    <YAxis
                        domain={[(dataMin: number) => (dataMin * 0.95),( dataMax: number) => (dataMax * 1.05)]}
                        hide={true}
                    />
                    <YAxis domain={['dataMin - 20000', 'dataMax + 20000']} hide={true} />

                    {/* Tooltip Configuration */}
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={false} // Hides the default cursor line
                        position={{
                            x: 0,
                            y: 0
                        }} // Position will be handled by the custom tooltip logic if needed, but Recharts handles placement
                        wrapperStyle={{ outline: 'none' }}
                    />

                    {/* Area/Line Configuration */}
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
