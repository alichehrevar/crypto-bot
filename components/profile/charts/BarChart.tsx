'use client';

import React from 'react';
import { ResponsiveBar, BarDatum } from '@nivo/bar';

export interface BarPoint {
  date: string;
  value: number;
}

interface BarChartProps {
  data: BarPoint[];
}

export default function BarChart({ data }: BarChartProps) {
  // Nivo wants an array of objects with your index field + one or more "keys"
  const chartData = data.map(d => ({
    date: d.date,
    value: d.value,
  })) as BarDatum[];

  if (data.length === 0) {
    return (
      <span className="text-center flex items-center justify-center h-full w-full text-sm">No realized PnL started</span>
    )
  }

  return (
    <ResponsiveBar
      ariaLabel="Realized PnL bar chart"
      axisBottom={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
      }}
      axisLeft={null}
      axisRight={null}
      axisTop={null}
      barAriaLabel={d => `value ${d.formattedValue} on ${d.indexValue}`}
      borderColor={{
        from: 'color',
        modifiers: [['darker', 2]],
      }}
      borderRadius={7}
      colors={{ scheme: 'blues' }}
      data={chartData}
      enableGridY={false}
      enableLabel={false}
      indexBy="date"
      keys={['value']}
      margin={{ top: 3, right: 0, bottom: 20, left: 30 }}
      padding={0.4}
      role="application"
      valueScale={{ type: 'linear' }}
    />
  );
}
