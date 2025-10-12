'use client'

import type { UnrealizedPnLResponse, UnrealizedPoint} from "@/types/profile/PnLTypes";

import React, {useEffect, useState} from "react";
import {addToast} from "@heroui/react";

import UnrealizedView from "@/components/pnl/UnrealizedView";
import {getData} from "@/actions/get";
import {RecentActivities} from "@/components/shared/RecentActivities";

export default function OpenPositionsTab() {

    const [unrealizedData, setUnrealizedData] = useState<UnrealizedPoint[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let abort = false;

        (async () => {
            setLoading(true);
            const period = '1D';

            try {
                const res: UnrealizedPnLResponse = await getData(`/pnl/unrealized?period=${period}`);

                if (!abort) {
                    if (!res?.success) {
                        addToast({ title: 'Error loading PnL data!', color: 'danger' });

                        return;
                    }
                    setUnrealizedData(res.data || []);
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
                <RecentActivities showTabs={false} visibleTab="open" />
            </div>
            <div className="col-span-4 h-[250px] ua-card py-6">
                {loading
                    ? <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
                    : <UnrealizedView data={unrealizedData} />
                }
            </div>
        </div>
    )
}
