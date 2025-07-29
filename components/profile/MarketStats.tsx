'use client'

import {useEffect, useState} from 'react';
import {addToast} from "@heroui/react";

import {symbolDataResponse} from "@/types/symbolData";

export default function MarketStats() {

    const [selectedPair, setSelectedPair] = useState('BTC/USDT');
    const [symbolData, setSymbolData] = useState<symbolDataResponse>()
    const [loading, setLoading] = useState(true)

    async function getSymbolData(symbol: string) {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);

        return await res.json();

        // const intervals = ["1m", "15m", "30m", "1h"];
        // const promises = intervals.map(interval =>
        //     fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1`).then(res => res.json())
        // );
        //
        // return await Promise.all(promises);
    }

    useEffect(() => {
        getSymbolData(selectedPair.replace('/', ''))
            .then((res: symbolDataResponse) => {
                setSymbolData(res)
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
    }, []);

    return (
        <div className="bg-dark-gray backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center justify-between">
                {!loading && symbolData &&
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-black">₿
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">{symbolData.symbol}</h1>
                                <p className="text-sm text-gray-400">24h {symbolData.priceChangePercent}%</p>
                            </div>
                        </div>

                        {/* Desktop view - show all stats */}
                        <div className="hidden lg:flex items-center gap-8">
                            <div>
                                <p className="text-2xl font-bold text-success">{new Intl.NumberFormat('en-US').format(Number(symbolData.lastPrice))}</p>
                                <p className="text-sm text-gray-400">Last Price</p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h Change</p>
                                <p className={`text-sm ${Number(symbolData.priceChange) > 0 ? 'text-success' : 'text-danger'}`}>
                                    {Number(symbolData.priceChange).toFixed(2)} ({Number(symbolData.priceChangePercent)}%)
                                </p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h High</p>
                                <p className="text-sm text-gray-300">{new Intl.NumberFormat('en-US').format(Number(symbolData.highPrice))}</p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h Low</p>
                                <p className="text-sm text-gray-300">{new Intl.NumberFormat('en-US').format(Number(symbolData.lowPrice))}</p>
                            </div>
                            <div>
                                <p className="text-lg text-white">24h Volume</p>
                                <p className="text-sm text-gray-300">{new Intl.NumberFormat('en-US').format(Number(symbolData.volume))} {selectedPair.split('/')[0]}</p>
                            </div>
                        </div>

                        {/* Mobile/Tablet view - show only price */}
                        <div className="lg:hidden">
                            <p className="text-2xl font-bold text-success">{new Intl.NumberFormat('en-US').format(Number(symbolData.lastPrice))}</p>
                            <p className="text-sm text-gray-400">Last Price</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    );
};
