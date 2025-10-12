'use client'

import type {
    RealizedPnLResponse,
    RealizedPoint,
} from "@/types/profile/PnLTypes";

import React, {useEffect, useState} from "react";
import {addToast} from "@heroui/react";

import {getData} from "@/actions/get";
import {RecentActivities} from "@/components/shared/RecentActivities";
import RealizedView from "@/components/pnl/RealizedView";

export default function PnLTab() {

    const [realizedData, setRealizedData] = useState<RealizedPoint[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let abort = false;

        (async () => {
            setLoading(true);
            const period = '1D';

            try {
                const res: RealizedPnLResponse = await getData(`/pnl/realized?period=${period}`);

                if (!abort) {
                    if (!res?.success) {
                        addToast({ title: 'Error loading PnL data!', color: 'danger' });

                        return;
                    }
                    setRealizedData(res.data || []);
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
    }, []);

    return (
        <div className="grid grid-cols-12 gap-2">
            <div className="col-span-8">
                <RecentActivities showTabs={false} visibleTab="closed" />
            </div>
            <div className="col-span-4 h-[250px] py-6 ua-card">
                {loading
                    ? <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
                    : <RealizedView data={realizedData} />
                }
            </div>
        </div>
    )
}
