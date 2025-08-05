'use client'

import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// =================================================================================================
// MOCK DATA (FOR DEMONSTRATION)
// In your application, you will fetch this data from your API.
// The data structure should match this example.
// =================================================================================================

const mockData = {
  Technical: [
    { date: '10 Dec', value: 25000 }, { date: '11 Dec', value: 45000 },
    { date: '12 Dec', value: 35000 }, { date: '13 Dec', value: 55000 },
    { date: '14 Dec', value: 20000 }, { date: '15 Dec', value: 65000 },
    { date: '16 Dec', value: 89000 }, { date: '17 Dec', value: 32000 },
    { date: '18 Dec', value: 72000 }, { date: '19 Dec', value: 68000 },
    { date: '20 Dec', value: 85000 }, { date: '21 Dec', value: 99475 },
    { date: '22 Dec', value: 95000 },
  ],
  DCA: [
    { date: '10 Dec', value: 42000 }, { date: '11 Dec', value: 48000 },
    { date: '12 Dec', value: 53000 }, { date: '13 Dec', value: 58000 },
    { date: '14 Dec', value: 60000 }, { date: '15 Dec', value: 65000 },
    { date: '16 Dec', value: 68000 }, { date: '17 Dec', value: 72000 },
    { date: '18 Dec', value: 78000 }, { date: '19 Dec', value: 82000 },
    { date: '20 Dec', value: 85000 }, { date: '21 Dec', value: 91000 },
    { date: '22 Dec', value: 94000 },
  ],
  Grid: [
    { date: '10 Dec', value: 50000 }, { date: '11 Dec', value: 52000 },
    { date: '12 Dec', value: 48000 }, { date: '13 Dec', value: 55000 },
    { date: '14 Dec', value: 53000 }, { date: '15 Dec', value: 58000 },
    { date: '16 Dec', value: 55000 }, { date: '17 Dec', value: 60000 },
    { date: '18 Dec', value: 57000 }, { date: '19 Dec', value: 62000 },
    { date: '20 Dec', value: 59000 }, { date: '21 Dec', value: 65000 },
    { date: '22 Dec', value: 68000 },
  ],
};


// =================================================================================================
// SUB-COMPONENTS
// These are the building blocks for the main chart component.
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

/**
 * ChartTabs Component
 * Renders the navigation tabs to switch between different data sets.
 */
const ChartTabs = ({ activeTab, setActiveTab, tabKeys }: { activeTab: string; setActiveTab: (tab: string) => void; tabKeys: string[] }) => {
  return (
      <div className="bg-dark-gray p-1 rounded-xl inline-flex items-center border border-gray-800">
        {tabKeys.map(tab => (
            <button
                key={tab}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none ${
                    activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
        ))}
      </div>
  )
}

// =================================================================================================
// MAIN COMPONENT: BotProgressChart
// This is the primary component to be integrated into your application.
// =================================================================================================

export default function BotProgressChart() {
  // In a real app, you would fetch this data via props or a hook.
  const chartDataSets = mockData

  // Get the keys for the tabs from the provided data
  const tabKeys = Object.keys(chartDataSets)

  // State to manage the currently active tab
  const [activeTab, setActiveTab] = useState(tabKeys[0])

  // State for the data currently displayed by the chart
  const [currentChartData, setCurrentChartData] = useState(chartDataSets[activeTab as keyof typeof chartDataSets])

  // State for the labels displayed on the X-axis
  const [ticks, setTicks] = useState<string[]>([])

  // This effect hook updates the chart's data and ticks whenever the active tab changes.
  useEffect(() => {
    const data = chartDataSets[activeTab as keyof typeof chartDataSets]

    setCurrentChartData(data)

    /**
     * Calculates an elegant set of ticks for the X-axis to avoid clutter.
     */
    const getCustomTicks = (data: { date: string, value: number }[]) => {
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
  }, [activeTab, chartDataSets])

  return (
      <div className="p-6 rounded-2xl shadow-2xl w-full max-w-[584px] mx-auto font-sans" style={{ backgroundColor: '#0D0D0D' }}>
        {/* Header section with tab navigation */}
        <div className="flex justify-end mb-4">
          <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} tabKeys={tabKeys} />
        </div>

        {/* Chart container */}
        <div className="w-full h-[350px]">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
                data={currentChartData}
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
              <YAxis domain={['dataMin - 20000', 'dataMax + 20000']} hide={true} />

              {/* Tooltip Configuration */}
              <Tooltip
                  content={<CustomTooltip />}
                  cursor={false} // Hides the default cursor line
                  wrapperStyle={{ outline: 'none' }}
                  // This calculation ensures the tooltip is centered and its bottom is always above the dot
                  position={{ x: 0, y: 0 }} // Position will be handled by the custom tooltip logic if needed, but Recharts handles placement
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
      </div>
  )
}
