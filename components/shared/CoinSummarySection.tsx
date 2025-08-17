// components/shared/CoinSummarySection.tsx
import React, { useEffect, useState } from 'react';
import { addToast } from "@heroui/react";
import Image from "next/image";

import { CoinSummaryData, CoinSummaryResponse } from "@/types/CoinSummaryType";
import { getData } from "@/actions/get";
import { compactNumber } from "@/utils/functions";
import CoinSummarySectionLoading from "@/components/loading/CoinSummarySectionLoading";

export default function CoinSummarySection({ coinId }: { coinId: string }) {
    const [coin, setCoin] = useState<CoinSummaryData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // Reset state and show loader when coinId changes
        setLoading(true);
        setCoin(null);

        fetchData()
            .then((res: CoinSummaryResponse) => {
                if (res.status && res.data) {
                    setCoin(res.data);
                } else {
                    addToast({
                        title: res.error || "Failed to fetch coin summary.",
                        color: 'danger'
                    });
                }
            })
            .catch((err) => {
                addToast({
                    title: err.message || "An unexpected error occurred.",
                    color: 'danger'
                });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [coinId]);

    async function fetchData() {
        return getData(`/coins/${coinId}/summary`);
    }

    if (loading) return <CoinSummarySectionLoading />;

    if (!coin) return <div className="bg-dark-gray flex items-center justify-center min-h-[130px] w-full font-extrabold text-gray-400 rounded-xl">No Coin Summary Available</div>;

    // Formatting helpers
    const fmtNum = (n: number | null | undefined, digits: number = 2) => {
        if (n === null || n === undefined) return '–';

        return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    };

    const fmtDate = new Date(coin.last_updated).toLocaleString(undefined, {
        hour: '2-digit', minute: '2-digit',
        month: '2-digit', day: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    });

    const PercentChange = ({ value }: { value: number | null | undefined }) => {
        if (value === null || value === undefined) return <span className="text-white">{'–'}</span>;
        const isPositive = value >= 0;

        return (
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                {isPositive ? '+' : ''}{fmtNum(value)}%
            </span>
        );
    };

    return (
        <div className="text-white rounded-xl px-4 pb-6 pt-2 w-full mx-auto flex flex-col lg:flex-row justify-between">
            {/* Left Side: Main Info */}
            <div className="lg:w-4/6 space-y-2">
                {/* Header */}
                <div className="flex flex-col items-start justify-between">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 relative">
                            <Image
                                fill
                                alt={coin.symbol}
                                className="rounded-full object-cover"
                                src={coin.imageUrl}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                        <h2 className="text-lg font-bold flex items-center gap-1">
                            {coin.name} ({coin.symbol})
                        </h2>
                    </div>
                    <div className="text-sm text-gray-400">Last Updated: {fmtDate}</div>
                </div>

                {/* Price & 24h Change */}
                <div className="flex items-baseline gap-4 mb-3">
                    <div className="text-4xl font-bold text-green-500">${fmtNum(coin.price)}</div>
                    <div className="text-lg font-semibold">
                        <PercentChange value={coin.percent_change_24h} />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm text-gray-300">
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">High (24h)</span>
                        <span className="text-gray-300 text-xs">${fmtNum(coin.high_24h)}</span>
                    </div>
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">Low (24h)</span>
                        <span className="text-gray-300 text-xs">${fmtNum(coin.low_24h)}</span>
                    </div>
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">All-Time High</span>
                        <span className="text-gray-300 text-xs">${fmtNum(coin.ath)}</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Additional Stats */}
            <div className="flex flex-col justify-end text-xs text-gray-500 gap-3 lg:w-2/6 mt-4 lg:mt-0">
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">Mkt Cap</div>
                    <div className="text-white">{compactNumber(coin.market_cap)}</div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">Vol (24h)</div>
                    <div className="text-white">{compactNumber(coin.volume_24h)}</div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">7d Change</div>
                    <div className="text-white font-semibold"><PercentChange value={coin.percent_change_7d} /></div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">30d Change</div>
                    <div className="text-white font-semibold"><PercentChange value={coin.percent_change_30d} /></div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">1y Change</div>
                    <div className="text-white font-semibold"><PercentChange value={coin.percent_change_1y} /></div>
                </div>
            </div>
        </div>
    );
}
