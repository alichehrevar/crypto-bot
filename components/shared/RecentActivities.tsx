import React, {useEffect, useState} from "react";
import {
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell, addToast, Spinner
} from "@heroui/react";

import {getData} from "@/actions/get";
import {AllPnLData, PnLData} from "@/types/profile/PnLTypes";
import {OrderIcon} from "@/utils/icons";

async function getAllPnL() {
    return await getData('/pnl/all')
}

const getCryptoIcon = (symbol: string) => {
    if (symbol.includes('BTC')) return '₿';
    if (symbol.includes('ETH')) return 'Ξ';
    if (symbol.includes('LTC')) return 'Ł';
    if (symbol.includes('XMR')) return 'ɱ';
    if (symbol.includes('BNB')) return '♢';

    return '●';
};

const getCryptoColor = (symbol: string) => {
    if (symbol.includes('BTC')) return 'text-orange-400';
    if (symbol.includes('ETH')) return 'text-green-400';
    if (symbol.includes('LTC')) return 'text-yellow-400';
    if (symbol.includes('XMR')) return 'text-orange-400';
    if (symbol.includes('BNB')) return 'text-green-400';

    return 'text-gray-400';
};

const getPnlColor = (pnl: string) => {
    if (pnl === 'MARKET') return 'text-red-400';
    if (pnl.startsWith('+')) return 'text-green-400';
    if (pnl.startsWith('-')) return 'text-red-400';

    return 'text-gray-400';
};

export const RecentActivities = ({ showTabs = true, visibleTab = 'open' }: { showTabs?: boolean; visibleTab?: 'closed' | 'open' }) => {
    const [activeTab, setActiveTab] = useState(visibleTab);
    const [pnLData, setPnlData] = useState<PnLData>()
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(() => {
        try {
            getAllPnL()
                .then((res: AllPnLData) => {
                    if (res.success) {
                        setPnlData(res.data)
                    } else {
                        addToast({
                            title: 'Error loading PnL data !',
                            description: res.message,
                            color: "danger",
                        })
                    }
                })
                .catch(error => {
                    addToast({
                        title: 'Error getting PnL data !',
                        description: error.message,
                        color: "danger",
                    })
                })
                .finally(() => {
                    setLoading(false)
                })
        } catch {
            addToast({
                title: 'Error fetching PnL data !',
                color: "danger",
            })
        }
    }, [])

    const handleClosePosition = (index: number) => {
        addToast({
            title: `Closing position for ${pnLData!.open[index].symbol}`,
            color: "warning"
        })
    };

    return (
        <div className="rounded-xl">
            <div className="flex items-center justify-center w-full flex-col gap-2">
                <div className="flex items-center justify-between mb-3 px-4 w-full">
                    <h3 className="text-lg font-semibold text-white">Recent Trading Activities</h3>

                    {showTabs &&
                        <div className="flex rounded-lg p-1 backdrop-blur-sm border border-gray-700/30">
                            <button
                                className={`px-4 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'open'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`}
                                onClick={() => setActiveTab('open')}
                            >
                                Open
                            </button>
                            <button
                                className={`px-4 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'closed'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`}
                                onClick={() => setActiveTab('closed')}
                            >
                                Closed
                            </button>
                        </div>
                    }
                </div>

                {loading &&
                    <div className="flex items-center justify-center flex-row-reverse gap-3 h-24 bg-[#1A1A1A] rounded-lg w-full">
                        <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
                        Loading PnL Data…
                    </div>
                }

                {/* ========== No Data ========== */}
                {!loading && pnLData && pnLData[activeTab].length === 0 &&
                    <div className="flex items-center justify-center flex-col gap-2 w-full">
                        <OrderIcon className="w-[120px] h-[120px]"/>
                        <span className="text-gray-600 text-sm">No Data</span>
                    </div>
                }
            </div>

            {!loading && pnLData && pnLData[activeTab].length !== 0 &&
                <Table className="bg-none" classNames={{
                    wrapper: 'bg-transparent shadow-none',
                }}>
                    <TableHeader>
                        <TableHeader className="border-gray-800/50">
                            <TableColumn className="dark:text-white font-bold">Symbol</TableColumn>
                            <TableColumn className="dark:text-white font-bold">Broker</TableColumn>
                            <TableColumn className="dark:text-white font-bold">Execution</TableColumn>
                            <TableColumn className="dark:text-white font-bold">Strategy</TableColumn>
                            <TableColumn className="dark:text-white font-bold">Leverage</TableColumn>
                            <TableColumn className="dark:text-white font-bold">TP/SL</TableColumn>
                            <TableColumn className="dark:text-white font-bold">Unrealized Pnl</TableColumn>
                            <TableColumn className="dark:text-white font-bold"><span/></TableColumn>
                        </TableHeader>
                    </TableHeader>
                    <TableBody>
                        <>
                            {pnLData[activeTab].map((activity, index) => (
                                <TableRow key={index} className={`border-gray-800/30 hover:bg-gray-900/40 ${index === 0 ? 'font-bold' : ''}`}>
                                    <TableCell className="text-white text-sm">
                                        <div className="flex items-center gap-2">
                                        <span
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getCryptoColor(activity.symbol)} bg-gray-800`}>
                                            {getCryptoIcon(activity.symbol)}
                                        </span>
                                            {activity.symbol}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-400 text-sm capitalize">{activity.broker}</TableCell>
                                    <TableCell className="text-white text-sm">{activity.execution}</TableCell>
                                    <TableCell className="text-gray-400 text-sm capitalize">{activity.strategy}</TableCell>
                                    <TableCell className="text-white text-sm">{activity.leverage}</TableCell>
                                    <TableCell className="text-sm">
                                        <span className="text-green-400">{activity.tpsl.split('/')[0]}</span>
                                        <span className="text-gray-400"> / </span>
                                        <span className="text-red-400">{activity.tpsl.split('/')[1]}</span>
                                    </TableCell>
                                    <TableCell className={`text-sm font-medium ${getPnlColor(activity.unrealizedPnl)}`}>
                                        {activity.unrealizedPnl}
                                    </TableCell>
                                    <TableCell className="flex items-center justify-end">
                                        <button
                                            className="bg-white text-black hover:bg-gray-200 px-3 py-1 rounded text-xs font-medium transition-colors"
                                            onClick={() => handleClosePosition(index)}
                                        >
                                            Close
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </>
                    </TableBody>
                </Table>
            }
        </div>
    );
};
