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

  return (
    <ResponsiveBar
      data={chartData}
      keys={['value']}
      indexBy="date"
      margin={{ top: 3, right: 0, bottom: 20, left: 30 }}
      padding={0.4}
      colors={{ scheme: 'blues' }}
      borderRadius={7}
      borderColor={{
        from: 'color',
        modifiers: [['darker', 2]],
      }}
      enableGridY={false}
      enableLabel={false}
      axisTop={null}
      axisRight={null}
      axisLeft={null}
      axisBottom={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
      }}
      role="application"
      ariaLabel="Realized PnL bar chart"
      barAriaLabel={d => `value ${d.formattedValue} on ${d.indexValue}`}
      valueScale={{ type: 'linear' }}
    />
  );
}
