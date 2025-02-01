'use client';

import { Candle } from '@/types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';

export function CandleChart({ data }: { data: Candle[] }) {
    return (
        <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
                    />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip
                        labelFormatter={(ts) => format(new Date(ts), 'yyyy-MM-dd HH:mm')}
                        formatter={(value: number) => value.toFixed(2)}
                    />
                    <Line
                        type="monotone"
                        dataKey="close"
                        stroke="#8884d8"
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
