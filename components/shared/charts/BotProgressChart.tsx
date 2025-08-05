'use client'

import React, { useState } from 'react'

import { ChartDataSets } from '@/types/chart'
import ReusableAreaChart from '@/components/shared/charts/ReusableAreaChart'

// =================================================================================================
// MOCK DATA
// This data would typically come from an API call within this container component.
// =================================================================================================
const mockData: ChartDataSets = {
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
// SUB-COMPONENT
// This is the implementation for the tabs that was previously missing.
// =================================================================================================

/**
 * ChartTabs Component
 * Renders the navigation tabs to switch between different data sets.
 */
const ChartTabs = ({ activeTab, setActiveTab, tabKeys }: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    tabKeys: string[]
}) => {
    return (
        <div className="bg-dark-gray p-1 rounded-xl inline-flex items-center border border-gray-800">
            {tabKeys.map(tab => (
                <button
                    key={tab}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none ${
                        activeTab === tab ? 'bg-primary text-black shadow-sm' : 'text-gray-400 hover:text-white'
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
// MAIN CONTAINER COMPONENT: BotProgressChart
// This component is "smart". It manages state and orchestrates the tabs and the chart.
// =================================================================================================
export default function BotProgressChart() {
    // In a real app, this data would come from an API call
    const chartDataSets = mockData;

    const tabKeys = Object.keys(chartDataSets);
    const [activeTab, setActiveTab] = useState(tabKeys[0]);

    // Get the current chart data based on the active tab
    const currentChartData = chartDataSets[activeTab as keyof typeof chartDataSets];

    return (
        <div className="rounded-2xl shadow-2xl w-full mx-auto self-stretch flex flex-col items-end mt-2">
            {/* Header section with tab navigation */}
            <div className="flex justify-end mb-4">
                <ChartTabs activeTab={activeTab} setActiveTab={setActiveTab} tabKeys={tabKeys} />
            </div>

            {/* Chart container now uses the reusable component */}
            <div className="w-full h-[350px]">
                <ReusableAreaChart data={currentChartData} />
            </div>
        </div>
    )
}
