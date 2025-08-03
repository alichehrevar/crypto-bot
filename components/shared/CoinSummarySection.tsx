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
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(() => {
        setLoading(true)
        fetchData()
            .then((res: CoinSummaryResponse) => {
                if (res.status) {
                    setCoin(res.data)
                } else {
                    addToast({
                        title: res.error,
                        color: 'danger'
                    })
                }
            })
            .catch((err) => {
                addToast({
                    title: err.message,
                    color: 'danger'
                })
            })
            .finally(() => {
                setLoading(false)
            });
    }, [coinId]);

    async function fetchData() {
        return getData(`/coins/${coinId}/summary`)
    }

    if (loading) return <CoinSummarySectionLoading />;

    if (!coin) return <div className="flex items-center justify-center min-h-[130px] w-full font-extrabold text-gray-400">No Coin Summary</div>;

    // format helpers
    const fmtNum = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = new Date(coin?.last_updated).toLocaleString(undefined, {
        hour: '2-digit', minute: '2-digit',
        month: '2-digit', day: '2-digit',
        hour12: false,
        timeZoneName: 'short'
    })

    return (
        <div className="bg-dark-gray text-white rounded-xl p-4 w-full mx-auto flex flex-col lg:flex-row justify-between">
            <div className="lg:w-5/6 space-y-2">
                {/* Header */}
                <div className="flex flex-col items-start justify-between">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 relative">
                            <Image
                                fill
                                alt={coin.symbol}
                                className="rounded-full object-cover"
                                src={`https://static.coinpaprika.com/coin/${coin.id}/logo.png`}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                        <h2 className="text-lg font-bold flex items-center gap-1">
                            {coin.symbol}
                        </h2>
                    </div>
                    <div className="text-sm text-gray-400">{fmtDate}</div>
                </div>

                {/* Price & Change */}
                <div className="flex items-baseline gap-4 mb-3">
                    <div className="text-4xl font-bold text-success">{fmtNum(coin.price)}</div>
                    <div className={`text-lg font-semibold ${coin.percent_change_24h >= 0 ? 'text-success' : 'text-danger'}`}>
                        {coin.percent_change_24h >= 0 ? '+' : ''}{fmtNum(coin.percent_change_24h)}%
                    </div>
                </div>

                {/* Stats grid */}
                <div className="flex gap-x-6 gap-y-2 text-sm text-gray-300">
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">Open</span>
                        <span className="text-green text-xs">{fmtNum(coin.open)}</span>
                    </div>
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">High</span>
                        <span className="text-green text-xs">{fmtNum(coin.high)}</span>
                    </div>
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">Low</span>
                        <span className="text-green text-xs">{fmtNum(coin.low)}</span>
                    </div>
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">Close</span>
                        <span className="text-green text-xs">{fmtNum(coin.close)}</span>
                    </div>

                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">52 wk high</span>
                        <span className="text-green text-xs">{coin.week52_high !== null ? fmtNum(coin.week52_high) : '–'}</span>
                    </div>
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">52 wk low</span>
                        <span className="text-green text-xs">{coin.week52_low !== null ? fmtNum(coin.week52_low) : '–'}</span>
                    </div>
                    <div className="space-x-1.5">
                        <span className="text-white font-semibold">Vol (24h)</span>
                        <span className="text-green text-xs">{compactNumber(coin.volume_24h)}</span>
                    </div>
                </div>
            </div>

            {/* Right-side stats */}
            <div className="flex flex-col justify-end text-xs text-gray-500 gap-3 lg:w-1/6">
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">Avg Vol</div>
                    <div className="text-white">{compactNumber(coin.volume_24h)}</div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">Shares Outstanding</div>
                    <div className="text-white">—</div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">Mkt Cap</div>
                    <div className="text-white">{compactNumber(coin.market_cap)}</div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-gray-400">Div Yield</div>
                    <div className="text-white">—</div>
                </div>
            </div>
        </div>
    )
}
