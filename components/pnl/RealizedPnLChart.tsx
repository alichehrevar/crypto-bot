"use client";

import { useEffect, useRef } from 'react';
import { Chart, BarElement, BarController, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

// Register the necessary Chart.js components
Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip, Legend);

/**
 * Defines the shape of a single data point for the chart.
 */
export interface RealizedPoint {
    /** The label for the x-axis (e.g., "Mon", "Jan 1"). */
    date: string;
    /** The numerical value for the y-axis. Can be null for missing data. */
    value: number | null;
}

/**
 * A reusable bar chart component to display Realized Profit & Loss.
 * It accepts a dynamic array of data points and visualizes them with
 * appropriate colors for positive (green) and negative (red) values.
 * Null values are rendered as gaps in the chart.
 */
const RealizedPnLChart = ({ data }: { data: RealizedPoint[] }) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');

        if (!ctx) return;

        // Destroy the previous chart instance to prevent memory leaks
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const hasData = Array.isArray(data) && data.length > 0;

        // Extract labels and original values from the data prop
        const labels = hasData ? data.map(p => p.date) : [];
        const originalData = hasData ? data.map(p => p.value) : [];

        // Use absolute values for bar height; Chart.js handles nulls as gaps
        const displayData = originalData.map(v => v === null ? null : Math.abs(v));

        // Dynamically set the Y-axis max value for better scaling
        const maxAbsValue = hasData ? Math.max(...displayData.filter((v): v is number => v !== null)) : 0;
        const yAxisMax = maxAbsValue > 0 ? maxAbsValue * 1.2 : 1000; // 20% padding

        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Realized P&L',
                    data: displayData,
                    // Store original data for coloring and tooltips
                    ...{ originalData } as any,
                    backgroundColor: (context) => {
                        const { chart, dataIndex } = context;
                        const { ctx, chartArea } = chart;

                        if (!chartArea) return;

                        const value = (context.dataset as any).originalData[dataIndex];

                        if (value === null || typeof value !== 'number') {
                            return 'transparent'; // No fill for null data points
                        }

                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);

                        if (value >= 0) {
                            gradient.addColorStop(0, '#4CAF50'); // Green for positive/zero
                            gradient.addColorStop(1, '#9EF01A');
                        } else {
                            gradient.addColorStop(0, '#D32F2F'); // Red for negative
                            gradient.addColorStop(1, '#F44336');
                        }

                        return gradient;
                    },
                    borderColor: 'transparent',
                    borderRadius: 5,
                    barPercentage: 0.6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(10, 9, 8, 0.8)',
                        titleColor: '#A0A0A0',
                        bodyColor: '#FFFFFF',
                        borderColor: '#333333',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const originalValue = (context.dataset as any).originalData[context.dataIndex];

                                if (originalValue === null) return '';

                                return `P&L: $${originalValue.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: yAxisMax,
                        grid: { color: '#333333' },
                        border: { display: false },
                        ticks: {
                            color: '#A0A0A0',
                            callback: (value) => {
                                const numValue = Number(value);

                                return numValue >= 1000 ? `$${numValue / 1000}k` : `$${numValue}`;
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#A0A0A0' }
                    }
                }
            }
        });

        // Cleanup function on component unmount
        return () => {
            chartInstanceRef.current?.destroy();
        };
    }, [data]); // Re-run effect when data prop changes

    return (
        <div className="w-full h-[200px] sm:h-[250px]">
            <canvas ref={chartRef} />
        </div>
    );
};

export default RealizedPnLChart;
