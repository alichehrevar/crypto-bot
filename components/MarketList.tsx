import React, {useEffect, useState} from 'react';
import {addToast} from "@heroui/react";

import {FuturesTicker} from "@/types/FuturesTickers";

const MarketList: React.FC = () => {
    const [data, setData] = useState<FuturesTicker[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData()
            .then((result) => setData(result))
            .catch((err) => {
                addToast({
                    title: err.message,
                    color: 'danger'
                })
            })
        const interval = setInterval(fetchData, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
        const result = await res.json();

        return result.filter((item: any) => item.symbol.endsWith('USDT'))
            .map((item: any) => ({
                symbol: item.symbol,
                lastPrice: item.lastPrice,
                priceChangePercent: item.priceChangePercent,
                volume: item.volume,
            }));
    };

    const filteredData = data.filter(item =>
        item.symbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-black text-white w-80 rounded-lg p-2">
            <div className="mb-3">
                <input
                    className="w-full p-2 bg-gray-800 rounded text-sm"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="flex text-gray-400 text-xs border-b border-gray-700 pb-1 mb-1">
                <div className="w-1/3">Symbols / Vol</div>
                <div className="w-1/3 text-center">Last Price</div>
                <div className="w-1/3 text-right">24h %</div>
            </div>
            {filteredData.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center text-sm py-1 border-b border-gray-800">
                    <div className="w-1/3">
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span className="font-bold">{item.symbol}</span>
                            <span className="bg-gray-700 text-gray-300 text-xs px-1 rounded">Perp</span>
                        </div>
                        <div className="text-gray-400 text-xs">Vol {(parseFloat(item.volume) / 1_000_000).toFixed(2)}M</div>
                    </div>
                    <div className="w-1/3 text-center">{parseFloat(item.lastPrice).toFixed(4)}</div>
                    <div className={`w-1/3 text-right ${parseFloat(item.priceChangePercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {parseFloat(item.priceChangePercent).toFixed(2)}%
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MarketList;
