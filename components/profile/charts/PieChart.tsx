'use client';

import React, { useEffect, useState } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { getData } from '@/actions/get';
import type { PieChartType } from '@/types/profile/ChartTypes';

interface Distribution {
  exchange: string;
  totalBalance: number;
  pct: number;
}

export default function AssetsPieChart() {
  const [data, setData] = useState<PieChartType>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistribution()
      .then((res) => {
        if (res.success) {
          // transform backend distribution → Nivo pie data
          const chartData: PieChartType = res.distribution.map((d: Distribution) => ({
            id:    d.exchange,
            label: d.exchange,
            value: d.pct,           // slice size by percentage
          }));
          if (chartData.every(item => item.value === 0)) {
            setData([]);
            return;
          }

          setData(chartData);
        } else {
          console.error('Failed to load assets distribution:', res.error);
        }
      })
      .catch((err) => {
        console.error('Error fetching assets distribution:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function fetchDistribution() {
    return await getData('/accounts/assets');
  }

  if (loading) {
    return <div className="text-center text-gray-400">Loading chart…</div>;
  }

  if (data.length === 0) {
    return (
      <span className="text-center flex items-center justify-center h-full w-full ml-[40px] mt-[-10px] text-sm">No assets found</span>
    )
  }

  return (
    <ResponsivePie
      activeOuterRadiusOffset={8}
      arcLabelsRadiusOffset={0.6}
      arcLabelsSkipAngle={8}
      arcLabelsTextColor={{
        from: 'color',
        modifiers: [
          [
            'darker',
            3
          ]
        ]
      }}
      arcLinkLabelsColor={{ from: 'color' }}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor="#333333"
      arcLinkLabelsThickness={3}
      borderColor={{
        from: 'color',
        modifiers: [
          [
            'darker',
            3
          ]
        ]
      }}
      borderWidth={0}
      colors={{ scheme: 'accent' }}
      cornerRadius={13}
      data={data}
      defs={[
        {
          id: 'dots',
          type: 'patternDots',
          background: 'inherit',
          color: 'rgba(255, 255, 255, 0.3)',
          size: 4,
          padding: 1,
          stagger: true
        },
        {
          id: 'lines',
          type: 'patternLines',
          background: 'inherit',
          color: 'rgba(255, 255, 255, 0.3)',
          rotation: -45,
          lineWidth: 6,
          spacing: 10
        }
      ]}
      enableArcLabels={false}
      enableArcLinkLabels={false}
      innerRadius={0.4}
      legends={[
        {
          anchor: 'right',
          direction: 'column',
          justify: false,
          translateX: 30,
          translateY: 0,
          itemsSpacing: 20,
          itemWidth: 100,
          itemHeight: 18,
          itemTextColor: '#999',
          itemDirection: 'left-to-right',
          itemOpacity: 1,
          symbolSize: 18,
          symbolShape: 'circle',
          effects: [
            {
              on: 'hover',
              style: {
                itemTextColor: '#000'
              }
            }
          ]
        }
      ]}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      padAngle={2}
    />
  );
}
