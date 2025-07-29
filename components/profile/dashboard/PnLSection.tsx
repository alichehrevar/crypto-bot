'use client';

import React, { useEffect, useState } from 'react';
import { addToast, Tab, Tabs } from '@heroui/react';

import BarChart from '@/components/profile/charts/BarChart';
import RadialBarChart from '@/components/profile/charts/RadialBarChart';
import { getData } from '@/actions/get';
import {
  RealizedPnLResponse,
  RealizedPoint,
  UnrealizedPnLResponse,
  UnrealizedPoint,
} from '@/types/profile/PnLTypes';

const DURS = ['1d', '1w', '1m', '1y'] as const;
const PERIOD_MAP: Record<typeof DURS[number], string> = {
  '1d': '1D',
  '1w': '1W',
  '1m': '1M',
  '1y': '1Y',
};

export default function PnLSection() {
  const [duration, setDuration] = useState<typeof DURS[number]>('1d');
  const [tab, setTab] = useState<'realized-pnl' | 'unrealized-pnl'>('realized-pnl');
  const [realizedData, setRealizedData] = useState<RealizedPoint[]>([]);
  const [unrealizedData, setUnrealizedData] = useState<UnrealizedPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const period = PERIOD_MAP[duration];

      try {
        if (tab === 'realized-pnl') {
          const res: RealizedPnLResponse = await getData(`/pnl/realized?period=${period}`);

          if (!res.success) {
            addToast({
              title: 'Error loading PnL data !',
              color: "danger",
            });

            return;
          }
          setRealizedData(res.data);
        } else {
          const res: UnrealizedPnLResponse = await getData(`/pnl/unrealized?period=${period}`);

          if (!res.success) {
            addToast({
              title: 'Error loading PnL data !',
              color: "danger",
            });

            return;
          }
          setUnrealizedData(res.data);
        }
      } catch (err: any) {
        addToast({ title: err.message || 'Error loading PnL data', color: 'danger' });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [duration, tab]);

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between w-full">
        <h4 className="font-bold text-[16px]">PnL</h4>
        <Tabs
          aria-label="PnL Type"
          classNames={{
            tabList: 'h-7 rounded-lg px-0.5 ml-3',
            tab: 'py-0 px-1 h-6 rounded-lg w-[75px]',
          }}
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k as any)}
        >
          <Tab key="realized-pnl" title={<span className="text-[12px]">Realized</span>} />
          <Tab key="unrealized-pnl" title={<span className="text-[12px]">Unrealized</span>} />
        </Tabs>
      </div>
      {/* Controls */}
      {tab === 'realized-pnl' &&
        <div className="flex items-center justify-end w-full">
          <ul className="flex items-center gap-2">
            {DURS.map((d) => (
              <li key={d}>
                <button
                  className={`
                  bg-default-100 w-[35px] text-center text-[12px] py-0.5 rounded-lg border
                  transition-colors duration-200
                  ${duration === d ? 'border-primary' : 'border-default-100'}
                `}
                  onClick={() => setDuration(d)}
                >
                  {d.toUpperCase()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      }

      {/* Chart */}
      <div
        className={`
          w-full h-[120px] transition-all duration-200
          ${tab === 'unrealized-pnl' ? 'ml-[-35px] overflow-x-hidden' : ''}
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading…
          </div>
        ) : tab === 'realized-pnl' ? (
          <BarChart data={realizedData} />
        ) : (
          <RadialBarChart data={unrealizedData} />
        )}
      </div>
    </div>
  );
}
