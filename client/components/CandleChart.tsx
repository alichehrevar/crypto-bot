'use client';

import React, { useEffect, useState } from 'react';
import { Candle } from '@/types';
import {
    ComposedChart,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Customized,
} from 'recharts';
import { format } from 'date-fns';

interface CandleChartProps {
    initialData: Candle[] | { data: Candle[] };
}

export function CandleChart({ initialData }: CandleChartProps) {
    // Extract the array of candles
    const initialCandles: Candle[] = Array.isArray(initialData)
        ? initialData
        : initialData.data || [];

    const [candles, setCandles] = useState<Candle[]>(initialCandles);

    // Preprocess candles: convert timestamps and prices to numbers.
    const processedCandles = candles.map(candle => ({
        ...candle,
        timestamp: new Date(candle.timestamp).getTime(),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
    }));

    // Filter out candles with invalid values and sort by timestamp ascending.
    const validCandles = processedCandles
        .filter(candle =>
            !isNaN(candle.open) &&
            !isNaN(candle.high) &&
            !isNaN(candle.low) &&
            !isNaN(candle.close)
        )
        .sort((a, b) => a.timestamp - b.timestamp);

    // Log first candle for debugging.
    if (validCandles.length > 0) {
        console.log('First valid candle:', validCandles[0]);
    }

    // Compute Y-axis domain explicitly.
    const prices = validCandles.reduce((acc: number[], candle) => {
        return [...acc, candle.open, candle.close, candle.high, candle.low];
    }, []);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 100;

    console.log('Computed Y-axis domain:', minPrice, maxPrice);

    useEffect(() => {
        const websocket = new WebSocket('ws://localhost:8000/api/ws');

        websocket.onmessage = (event) => {
            const newCandle: Candle = JSON.parse(event.data);
            setCandles(prev => {
                const lastCandle = prev[prev.length - 1];
                const sameMinute =
                    lastCandle &&
                    new Date(lastCandle.timestamp).getMinutes() ===
                    new Date(newCandle.timestamp).getMinutes();
                return sameMinute
                    ? [...prev.slice(0, -1), newCandle]  // Update last candle
                    : [...prev, newCandle];             // Append new candle
            });
        };

        return () => {
            websocket.close();
        };
    }, []);

    const renderCandlesCustomized = (props: { xAxisMap: Record<string, any>; yAxisMap: Record<string, any>; offset: { left: number } | undefined }) => {
        const { xAxisMap, yAxisMap, offset } = props;
        const xAxis = Object.values(xAxisMap)[0];
        const yAxis = Object.values(yAxisMap)[0];
        const xScale = xAxis.scale;
        const yScale = yAxis.scale;
        const leftOffset = offset?.left || 0;
        const candleWidth = 6;

        return (
            <g>
                {validCandles.map((candle, index) => {
                    const time = candle.timestamp; // Already a number
                    const x = xScale(time) + leftOffset;
                    if (isNaN(x)) return null;

                    const openY = yScale(candle.open);
                    const closeY = yScale(candle.close);
                    const highY = yScale(candle.high);
                    const lowY = yScale(candle.low);
                    const candleColor = candle.close > candle.open ? '#00b894' : '#d63031';

                    // Log computed coordinates for the first candle
                    if (index === 0) {
                        console.log('Candle coordinates:', { x, openY, closeY, highY, lowY });
                    }

                    return (
                        <g key={index}>
                            <line
                                x1={x}
                                x2={x}
                                y1={highY}
                                y2={lowY}
                                stroke={candleColor}
                                strokeWidth={1}
                            />
                            <rect
                                x={x - candleWidth / 2}
                                y={Math.min(openY, closeY)}
                                width={candleWidth}
                                height={Math.abs(closeY - openY) || 1}
                                fill={candleColor}
                            />
                        </g>
                    );
                })}
            </g>
        );
    };

    return (
        <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={validCandles}
                    margin={{ top: 5, right: 30, bottom: 5, left: 0 }}
                >
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={['auto', 'auto']}
                        scale="time"
                        tickFormatter={(tick) => format(new Date(tick), 'HH:mm')}
                    />
                    <YAxis domain={[minPrice, maxPrice]} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip
                        labelFormatter={(label) =>
                            format(new Date(label), 'yyyy-MM-dd HH:mm:ss')
                        }
                    />
                    <Customized component={renderCandlesCustomized} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
