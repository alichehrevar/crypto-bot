'use client'

import {useEffect, useState} from 'react';
import Image from 'next/image';
import {addToast} from "@heroui/react";

import {SymbolDetails, SymbolDetailsResponse} from "@/types/symbolData";
import {getData} from "@/actions/get";
import MarketStatsLoading from "@/components/loading/MarketStatsLoading";

type Props = {
    symbolId?: string | 'btc-bitcoin';     // symbol.id
};

export default function MarketStats({ symbolId }: Props) {

    const [symbolData, setSymbolData] = useState<SymbolDetails>()
    const [loading, setLoading] = useState(true)

    async function getSymbolData() {
        return getData(`/market/ticker-details?id=${symbolId}&quote=USD`);
    }

    useEffect(() => {
        getSymbolData()
            .then((res: SymbolDetailsResponse) => {
                if (res.success) {
                    setSymbolData(res.data)
                } else {
                    addToast({
                        title: res.message || 'Error fetching market stats',
                        color: 'danger'
                    })
                }
            })
            .catch((error) => {
                addToast({
                    title: error.message,
                    color: 'danger'
                })
            })
            .finally(() => {
                setLoading(false)
            })
    }, [symbolId]);

    return (
        <div className="bg-dark-gray backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center justify-between">
                {loading && <MarketStatsLoading />}
                {!loading && symbolData &&
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Image alt={symbolData.symbol} className="rounded-full" height={40} src={symbolData.imageUrl} style={{ objectFit: 'cover' }} width={40} onError={(e) => (e.currentTarget.style.display = 'none')} />
                            <div>
                                <h1 className="text-xl font-bold text-white">{symbolData.symbol}</h1>
                                <p className="text-sm text-gray-400">24h {symbolData.percentChange24h}%</p>
                            </div>
                        </div>

                        {/* Desktop view - show all stats */}
                        <div className="hidden lg:flex items-center gap-8">
                            <div>
                                <p className="text-2xl font-bold text-success">{new Intl.NumberFormat('en-US').format(Number(symbolData.price))}</p>
                                <p className="text-sm text-gray-400">Last Price</p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h Change</p>
                                <p className={`text-sm ${Number(symbolData.absoluteChange24h) > 0 ? 'text-success' : 'text-danger'}`}>
                                    {Number(symbolData.absoluteChange24h).toFixed(2)} ({Number(symbolData.percentChange24h)}%)
                                </p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h High</p>
                                <p className="text-sm text-gray-300">{new Intl.NumberFormat('en-US').format(Number(symbolData.high24h))}</p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h Low</p>
                                <p className="text-sm text-gray-300">{new Intl.NumberFormat('en-US').format(Number(symbolData.low24h))}</p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h Volume</p>
                                <p className="text-sm text-gray-300">{new Intl.NumberFormat('en-US').format(Number(symbolData.volume24h))}</p>
                            </div>
                        </div>

                        {/* Mobile/Tablet view - show only price */}
                        <div className="lg:hidden">
                            <p className="text-2xl font-bold text-success">{new Intl.NumberFormat('en-US').format(Number(symbolData.price))}</p>
                            <p className="text-sm text-gray-400">Last Price</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    );
};
