'use client';

import type {
    RealizedPnLResponse,
    RealizedPoint,
    UnrealizedPnLResponse,
    UnrealizedPoint,
} from '@/types/profile/PnLTypes';

import React, { useEffect, useState} from 'react';
import { Tabs, Tab, addToast } from '@heroui/react';

import { getData } from '@/actions/get';
import UnrealizedView from "@/components/shared/UnrealizedView";
import RealizedView from "@/components/shared/RealizedView";


/* ---------------- main component ---------------- */

export default function PnLSection() {
    const [tab, setTab] = useState<'realized-pnl' | 'unrealized-pnl'>('realized-pnl');
    const [realizedData, setRealizedData] = useState<RealizedPoint[]>([]);
    const [unrealizedData, setUnrealizedData] = useState<UnrealizedPoint[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let abort = false;

        (async () => {
            setLoading(true);
            const period = '1D';

            try {
                if (tab === 'realized-pnl') {
                    const res: RealizedPnLResponse = await getData(`/pnl/realized?period=${period}`);

                    if (!abort) {
                        if (!res?.success) {
                            addToast({ title: 'Error loading PnL data!', color: 'danger' });

                            return;
                        }
                        setRealizedData(res.data || []);
                    }
                } else {
                    const res: UnrealizedPnLResponse = await getData(`/pnl/unrealized?period=${period}`);

                    if (!abort) {
                        if (!res?.success) {
                            addToast({ title: 'Error loading PnL data!', color: 'danger' });

                            return;
                        }
                        setUnrealizedData(res.data || []);
                    }
                }
            } catch (err: any) {
                if (!abort) addToast({ title: err?.message || 'Error loading PnL data', color: 'danger' });
            } finally {
                if (!abort) setLoading(false);
            }
        })();

        return () => {
            abort = true;
        };
    }, [tab]);

    return (
        <div className="space-y-4 w-full">
            <div className="flex items-center justify-between w-full">
                <h4 className="font-bold text-[16px]">PnL</h4>

                <Tabs
                    aria-label="PnL Type"
                    classNames={{
                        tabList: 'h-7 rounded-full px-0.5 ml-3 mt-1',
                        tab: 'pt-0 pb-2 px-2 h-6 text-[12px]',
                        cursor: 'rounded-full',
                    }}
                    selectedKey={tab}
                    variant="underlined"
                    onSelectionChange={(k) => setTab(k as any)}
                >
                    <Tab key="realized-pnl" title="Realized" />
                    <Tab key="unrealized-pnl" title="Unrealized" />
                </Tabs>
            </div>

            <div
                className={`
          w-full h-[150px] transition-all duration-200
          ${tab === 'unrealized-pnl' ? 'ml-[-35px] overflow-x-hidden' : ''}
        `}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
                ) : tab === 'realized-pnl' ? (
                    <RealizedView data={realizedData} />
                ) : (
                    <UnrealizedView data={unrealizedData} />
                )}
            </div>
        </div>
    );
}
