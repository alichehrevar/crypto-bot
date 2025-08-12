'use client';

import type { PieChartType } from '@/types/profile/ChartTypes';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ResponsivePie } from '@nivo/pie';
import {addToast} from "@heroui/react";

import { getData } from '@/actions/get';
import {ChevronRightIcon} from "@/utils/icons";

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
          addToast({
            title: `Failed to load assets distribution: ${res.error}`,
            color: 'danger'
          })
        }
      })
      .catch((err) => {
        addToast({
          title: `Error fetching assets distribution: ${err}`,
          color: 'danger'
        })
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
      <div className="flex items-center justify-center h-full w-full flex-col gap-3">
          <span className="text-center text-sm">No assets found</span>
          <Link className="flex items-center gap-1 hover:scale-105 transition-all duration-300 bg-gray-800 py-1 px-2 rounded-xl" href="/profile/settings?tab=connect-broker">
              <span className="text-xs">Connect Broker</span>
              <ChevronRightIcon className="size-3" />
          </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-8 w-full h-full">
      <div className="h-full w-32">
        <ResponsivePie
          activeOuterRadiusOffset={2}
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
          colors={[ '#84E2FF', '#186C86', '#59B4D1' ]}
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
          legends={[]}
          motionConfig="wobbly"
          padAngle={2}
        />
      </div>
      <div className="flex flex-col justify-center items-center w-[140px]">
        <div className="space-y-3 w-full">
          {data.sort((a, b) => b.value - a.value).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ['#84E2FF', '#186C86', '#59B4D1'][index] }}
                />
                <span className="text-gray-400 text-sm">{item.label}</span>
              </div>
              <span className="text-white text-sm font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
