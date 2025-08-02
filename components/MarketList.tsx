import React, {useEffect, useState} from 'react';
import {addToast} from "@heroui/react";

import {compactNumber} from "@/utils/functions";
import {StarIcon} from "@/utils/icons";
import {MarketSnapshot, MarketSnapshotResponse} from "@/types/MarketList";
import {getData} from "@/actions/get";

const MarketList: React.FC = () => {
    const [data, setData] = useState<MarketSnapshot[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData()
            .then((response: MarketSnapshotResponse) => {
                if (response.success) {
                    setData(response.data.slice(0, 100))
                } else {
                    addToast({
                        title: response.message || 'Error Fetching Market List',
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
        const interval = setInterval(fetchData, 15000);

        return () => clearInterval(interval);
    }, []);

    const fetchData = async (): Promise<MarketSnapshotResponse> => {
        return getData('/market/market-list');
    };

    const filteredCoins = data.filter(item =>
        item.symbol.toLowerCase().includes(search.toLowerCase())
    );



    return (
        <div className="bg-dark-gray text-white w-full h-full rounded-lg p-2">
            {/* Search Input */}
            <div className="mb-3">
                <input
                    className="w-full p-2 bg-[#1C1C1CFF] rounded-lg text-sm mb-4"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between text-gray-400 text-xs border-b border-gray-700 pb-1 mb-1">
                <div>Symbol</div>
                <div>Price - 24h %</div>
            </div>

            {/* Coin Rows */}
            <div className="flex flex-col gap-2 h-[84%] overflow-y-auto">
                {filteredCoins.map((coin) => (
                    <div key={coin.id} className="flex items-center justify-between text-sm py-1">
                        {/* Symbol and Logo */}
                        <div className="flex items-start gap-2">
                            <StarIcon className="size-4 mt-[4px] cursor-pointer stroke-[#4D4B4BFF] fill-[#4D4B4BFF] hover:stroke-[#EAB308FF] hover:fill-[#EAB308FF] transition-all duration-250" />
                            {/*<div className="w-5 h-5 relative">*/}
                            {/*    <Image*/}
                            {/*        fill*/}
                            {/*        alt={coin.symbol}*/}
                            {/*        className="rounded-full object-cover"*/}
                            {/*        src={`https://static.coinpaprika.com/coin/${coin.id}/logo.png`}*/}
                            {/*        onError={(e) => (e.currentTarget.style.display = 'none')}*/}
                            {/*    />*/}
                            {/*</div>*/}
                            <div className="flex flex-col items-start gap-1">
                                <span className="font-bold">{coin.symbol}</span>
                                <span className="text-gray-400 text-xs">Vol {compactNumber(coin.quotes.USD.volume_24h)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end justify-center gap-1">
                            {/* Price */}
                            <div className="text-sm">
                                {coin.quotes.USD.price.toFixed(2).toLocaleString()}
                            </div>

                            {/* 24h Change */}
                            <div
                                className={`text-xs ${
                                    coin.quotes.USD.percent_change_24h >= 0
                                        ? 'text-green-500'
                                        : 'text-red-500'
                                }`}
                            >
                                {coin.quotes.USD.percent_change_24h.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketList;
