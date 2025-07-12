'use client';

import React from 'react';
import { ResponsiveRadialBar, RadialBarSerie, RadialBarDatum } from '@nivo/radial-bar';

export interface RadialPoint {
  x: string;
  y: number;
}

interface RadialBarChartProps {
  data: RadialPoint[];
}

export default function RadialBarChart({ data }: RadialBarChartProps) {
  // Nivo RadialBar can accept an array of series; here we turn each point into its own series
  const series: RadialBarSerie<RadialBarDatum>[] = data.map(point => ({
    id: point.x,
    data: [{ x: point.x, y: point.y }],
  }));

  if (data.length === 0) {
    return (
      <span className="text-center flex items-center justify-center ml-[40px] h-full w-full text-sm">No unrealized PnL started</span>
    )
  }

  return (
    <ResponsiveRadialBar
      data={series}
      innerRadius={0.35}
      cornerRadius={32}
      padding={0.45}
      colors={{ scheme: 'accent' }}
      borderColor={{
        from: 'color',
        modifiers: [['darker', 1.2]],
      }}
      enableCircularGrid={false}
      enableRadialGrid={false}
      radialAxisStart={null}
      circularAxisOuter={null}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      legends={[
        {
          anchor: 'right',
          direction: 'column',
          translateX: 10,
          translateY: 0,
          itemWidth: 100,
          itemHeight: 18,
          symbolSize: 18,
          symbolShape: 'circle',
          itemTextColor: '#999',
          effects: [
            {
              on: 'hover',
              style: { itemTextColor: '#000' },
            },
          ],
        },
      ]}
    />
  );
}
