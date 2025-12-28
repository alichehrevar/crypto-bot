// components/charts/SystemPerformanceChart.tsx
'use client'

import { useState, useMemo } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import { Card } from '@/components/common/Card'
import { PremiumCheckbox } from '@/components/common/PremiumCheckbox'
import { generateSystemPerformanceData, SystemMetric } from '@/lib/mock-service'
import { BarChart2 } from 'lucide-react'
import {
    ChartData,
    ChartOptions, TooltipItem
} from 'chart.js';
import '@/lib/chart-config'

type TabType = 'MRR' | 'USERS' | 'NEW_USERS' | 'SUBS' | 'BOTS' | 'TRADES'
type TimeFilterType = '24H' | '7D' | '30D' | 'ALL'
type BotFilterKey = 'TECHNICAL' | 'GRID' | 'DCA' | 'CUSTOM_AI'

export function SystemPerformanceChart() {
    const [activeTab, setActiveTab] = useState<TabType>('MRR')
    const [timeFilter, setTimeFilter] = useState<TimeFilterType>('24H')

    const [botFilters, setBotFilters] = useState<Record<BotFilterKey, boolean>>({
        TECHNICAL: true,
        GRID: true,
        DCA: true,
        CUSTOM_AI: true
    })

    const generateData = useMemo<SystemMetric[]>(() => {
        const points = timeFilter === '24H' ? 24 : timeFilter === '7D' ? 7 : 30
        // Casting here assuming mock service returns compatible structure
        return generateSystemPerformanceData(points) as unknown as SystemMetric[]
    }, [timeFilter])

    const chartData = useMemo<ChartData<'line' | 'bar'>>(() => {
        const labels = generateData.map(d => d.name)

        if (activeTab === 'MRR' || activeTab === 'USERS' || activeTab === 'NEW_USERS') {
            const dataKey: keyof SystemMetric = activeTab === 'MRR' ? 'mrr' : activeTab === 'USERS' ? 'users' : 'newUsers'

            return {
                labels,
                datasets: [{
                    label: activeTab,
                    data: generateData.map(d => d[dataKey]),
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }]
            }
        } else if (activeTab === 'SUBS') {
            return {
                labels,
                datasets: [
                    { label: 'Basic', data: generateData.map(d => d.basic), backgroundColor: '#3f3f46' },
                    { label: 'Essential', data: generateData.map(d => d.essential), backgroundColor: '#71717a' },
                    { label: 'Pro', data: generateData.map(d => d.pro), backgroundColor: '#ffffff' }
                ]
            }
        } else if (activeTab === 'BOTS') {
            const datasets = []
            if (botFilters.TECHNICAL) datasets.push({ label: 'Technical', data: generateData.map(d => d.technical), borderColor: '#818cf8', tension: 0.4, pointRadius: 0 })
            if (botFilters.GRID) datasets.push({ label: 'Grid', data: generateData.map(d => d.grid), borderColor: '#34d399', tension: 0.4, pointRadius: 0 })
            if (botFilters.DCA) datasets.push({ label: 'DCA', data: generateData.map(d => d.dca), borderColor: '#22d3ee', tension: 0.4, pointRadius: 0 })
            if (botFilters.CUSTOM_AI) datasets.push({ label: 'Custom AI', data: generateData.map(d => d.ai), borderColor: '#ffffff', tension: 0.4, pointRadius: 0 })
            return { labels, datasets }
        } else {
            // TRADES
            return {
                labels,
                datasets: [{
                    label: 'Volume',
                    data: generateData.map(d => d.trades),
                    backgroundColor: '#ffffff',
                    barThickness: 'flex'
                }]
            }
        }
    }, [generateData, activeTab, botFilters])

    // Fixed: Properly typed options
    const options: ChartOptions<'line' | 'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: activeTab === 'SUBS' || activeTab === 'BOTS',
                labels: {
                    color: '#71717a',
                    font: { size: 10, family: 'monospace' }
                }
            },
            tooltip: {
                backgroundColor: '#09090b',
                titleColor: '#fff',
                bodyColor: '#a1a1aa',
                borderColor: '#27272a',
                borderWidth: 1,
                titleFont: { family: 'monospace' },
                bodyFont: { family: 'monospace' },
                // Optional: formatter if needed
                callbacks: {
                    label: (item: TooltipItem<'line' | 'bar'>) => ` ${item.dataset.label}: ${item.raw}`
                }
            }
        },
        scales: {
            x: {
                display: false,
                grid: { display: false }
            },
            y: {
                border: { display: false },
                grid: { color: '#27272a' },
                ticks: { color: '#52525b', font: { size: 10, family: 'monospace' } }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    const TABS: { id: TabType; label: string }[] = [
        { id: 'MRR', label: 'Recurring Rev' },
        { id: 'USERS', label: 'User Growth' },
        { id: 'NEW_USERS', label: 'New Signups' },
        { id: 'SUBS', label: 'Plan Distribution' },
        { id: 'BOTS', label: 'Bot Deployments' },
        { id: 'TRADES', label: 'Execution Vol' },
    ];

    const FILTERS: TimeFilterType[] = ['24H', '7D', '30D', 'ALL'];

    return (
        <Card className="h-auto flex flex-col p-0 overflow-hidden border border-zinc-800 bg-zinc-950">
            <div className="p-4 border-b border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <BarChart2 size={14}/> System Performance
                </h3>
                <div className="flex bg-zinc-900 p-0.5 rounded-sm">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setTimeFilter(f)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${timeFilter === f ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex overflow-x-auto border-b border-zinc-900 bg-zinc-950/50 scrollbar-hide">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                  shrink-0 px-3 py-1 text-[9px] font-bold uppercase tracking-wider border-b-2 transition-colors
                  ${activeTab === tab.id ? 'border-white text-white bg-zinc-900' : 'border-transparent text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/30'}
               `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 w-full h-[360px] p-4 relative bg-zinc-950">
                {activeTab === 'BOTS' && (
                    <div className="absolute top-4 right-6 z-10 flex flex-wrap gap-3 bg-zinc-900/80 p-2 rounded border border-zinc-800 backdrop-blur-sm">
                        {Object.entries(botFilters).map(([key, checked]) => (
                            <PremiumCheckbox
                                key={key}
                                label={key.replace('_', ' ')}
                                checked={checked}
                                onChange={() => setBotFilters(prev => ({...prev, [key]: !checked}))}
                                colorClass="bg-white"
                            />
                        ))}
                    </div>
                )}
                {activeTab === 'SUBS' || activeTab === 'TRADES' ? (
                    <Bar
                        data={chartData as ChartData<'bar'>}
                        options={options as ChartOptions<'bar'>}
                    />
                ) : (
                    <Line
                        data={chartData as ChartData<'line'>}
                        options={options as ChartOptions<'line'>}
                    />
                )}
            </div>
        </Card>
    );
}
