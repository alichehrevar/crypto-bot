"use client";

import { useEffect, useRef, useState } from 'react';
import { Chart, BarElement, BarController, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

// Register the necessary components with Chart.js
Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip, Legend);

const PnLChart = () => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const [activeType, setActiveType] = useState('mixed');

    const positiveData = [1250, 800, 1800, 1100, 2500, 1500, 1900];
    const negativeData = [-500, -200, -900, -400, -1200, -700, -1000];
    const mixedData = [1250, -200, 1800, -400, -1200, 1500, -1000];
    const labels = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const dataMap = {
        positive: positiveData,
        negative: negativeData,
        mixed: mixedData,
    };

    useEffect(() => {
        if (chartRef.current) {
            const ctx = chartRef.current.getContext('2d');

            if (ctx) {
                // Destroy previous chart instance if it exists
                if (chartInstanceRef.current) {
                    chartInstanceRef.current.destroy();
                }

                const chartData = dataMap[activeType as keyof typeof dataMap];

                chartInstanceRef.current = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Realized P&L',
                            data: chartData.map(v => Math.abs(v)),
                            // Custom property to store original data for tooltips and gradients
                            // This is a way to extend the dataset object for custom logic
                            ...{ originalData: chartData } as any,
                            backgroundColor: (context) => {
                                const chart = context.chart;
                                const { ctx, chartArea } = chart;

                                if (!chartArea) {
                                    return;
                                }

                                const value = (context.dataset as any).originalData[context.dataIndex];
                                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);

                                if (value >= 0) {
                                    gradient.addColorStop(0, '#4CAF50'); // --color-accent-green
                                    gradient.addColorStop(1, '#9EF01A'); // --color-accent-lime
                                } else {
                                    gradient.addColorStop(0, '#D32F2F'); // --color-accent-red-dark
                                    gradient.addColorStop(1, '#F44336'); // --color-accent-red
                                }

                                return gradient;
                            },
                            borderColor: 'transparent',
                            borderWidth: 0,
                            borderRadius: 5,
                            barPercentage: 0.5,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false,
                            },
                            tooltip: {
                                backgroundColor: 'rgba(10, 9, 8, 0.8)',
                                titleColor: '#A0A0A0',
                                bodyColor: '#FFFFFF',
                                borderColor: '#333333',
                                borderWidth: 1,
                                callbacks: {
                                    label: function(context) {
                                        const originalValue = (context.dataset as any).originalData[context.dataIndex];

                                        return ` P&L: $${originalValue.toLocaleString()}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 3500,
                                grid: {
                                    color: '#333333',
                                },
                                border: {
                                    display: false
                                },
                                ticks: {
                                    color: '#A0A0A0',
                                    callback: function(value) {
                                        return '$' + (Number(value) / 1000) + 'k';
                                    }
                                }
                            },
                            x: {
                                grid: {
                                    display: false,
                                },
                                ticks: {
                                    color: '#A0A0A0',
                                }
                            }
                        }
                    }
                });
            }
        }

        // Cleanup function to destroy the chart on component unmount
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [activeType]);

    const getButtonClasses = (type: string) => {
        return `py-1 px-3 flex justify-center items-center cursor-pointer outline-none rounded-md text-sm font-medium transition-all hover:text-white ${
            activeType === type
                ? 'bg-white text-[#0A0908] shadow-sm'
                : 'text-[#A0A0A0]'
        }`;
    };

    return (
        <div className="bg-[#1A1918] border border-[#333333] w-full max-w-3xl flex flex-col rounded-xl p-6">
            <div className="flex items-center justify-between w-full mb-4">
                <h4 className="font-bold text-lg text-white">Realized Profit & Loss</h4>
                <div className="inline-flex">
                    <div className="flex p-1 gap-1 items-center h-8 rounded-lg bg-[#0A0908]">
                        <button className={getButtonClasses('positive')} onClick={() => setActiveType('positive')}>
                            Positive
                        </button>
                        <button className={getButtonClasses('negative')} onClick={() => setActiveType('negative')}>
                            Negative
                        </button>
                        <button className={getButtonClasses('mixed')} onClick={() => setActiveType('mixed')}>
                            Mixed
                        </button>
                    </div>
                </div>
            </div>
            <div className="w-full h-[200px] sm:h-[250px]">
                <canvas ref={chartRef} />
            </div>
        </div>
    );
};

export default PnLChart;

