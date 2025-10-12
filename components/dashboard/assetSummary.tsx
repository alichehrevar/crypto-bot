import React, {useEffect, useState} from "react";
import {addToast, Skeleton} from "@heroui/react";

import {AssetSummaryResponse, Summary} from "@/types/profile/AssetSummary";
import {ChartData} from "@/types/chart";
import {getData} from "@/actions/get";
import ReusableAreaChart from "@/components/shared/charts/ReusableAreaChart";

export default function AssetSummary({showExtraDetails = false}: { showExtraDetails?: boolean}) {

    const [assetData, setAssetData] = useState<Summary>();
    const [chartData, setChartData] = useState<ChartData>();
    const [currency, setCurrency] = useState<'dollar' | 'euro'>('dollar')
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssetSummary()
            .then((response: AssetSummaryResponse) => {
                setAssetData(response.data.summary)
                setChartData(response.data.history)
                console.log(response)
                setCurrency(response.data.currency as string === 'euro' ? 'euro' : 'dollar')
            })
            .catch((err) => {
                addToast({
                    title: `Error fetching assets distribution: ${err}`,
                    color: 'danger'
                })
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    async function fetchAssetSummary() {
        return await getData('/accounts/summary');
    }

    return (
        <>
            <div className={`flex flex-col lg:flex-row gap-5 lg:gap-0 items-center justify-between w-full ${showExtraDetails ? 'mb-10' : ''}`}>
                <div className="flex items-end justify-between gap-3 w-full lg:w-[45%]">
                    <div className="flex flex-col gap-3">
                        <h4 className="font-bold text-[24px]">
                            {showExtraDetails ? 'Portfolio Summary' : 'Welcome back !'}
                        </h4>
                        <h6 className="font-semibold text-[16px]">Total Balance</h6>
                        <div className="flex items-center gap-5">
                            {loading
                                ? <div className="h-[40px] w-full flex items-center justify-between gap-4">
                                    <Skeleton className="h-3 w-[90px] rounded-lg"/>
                                    <Skeleton className="h-1 w-[20px] rounded-lg"/>
                                </div>
                                : <>
                                    <p className="font-extrabold text-[28px]">{`${currency === 'euro' ? '€' : '$'} ${assetData?.totalBalance ?? 0.00}`}</p>
                                    {assetData && assetData.pctChange !== undefined &&
                                        <span
                                            className={`text-[14px] font-bold mt-2.5 ${assetData && assetData.pctChange < 0 ? 'text-[var(--text-red)]' : 'text-[var(--text-green)]'}`}>
                                        {`${assetData?.pctChange}%`}
                                    </span>
                                    }
                                </>
                            }
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
                            <span className="text-[13px]">
                                Available Funds
                            </span>
                                {loading
                                    ? <Skeleton className="h-1.5 w-[40px] mt-2.5 rounded-lg"/>
                                    : <span className="dark:text-white text-black font-semibold text-[14px]">
                                    {`${currency === 'euro' ? '€' : '$'} ${assetData?.availableFunds === undefined ? 0.00 : assetData?.availableFunds}`}
                            </span>}
                            </div>
                            <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
                            <span className="text-[13px]">
                                Portfolio Balance
                            </span>
                                {loading
                                    ? <Skeleton className="h-1.5 w-[40px] mt-2.5 rounded-lg"/>
                                    : <span className="dark:text-white text-black font-semibold text-[14px]">
                                    {`${currency === 'euro' ? '€' : '$'} ${assetData?.portfolioBalance === undefined ? 0.00 : assetData?.portfolioBalance}`}
                            </span>}
                            </div>
                        </div>
                    </div>
                    {showExtraDetails &&
                        <div className="flex flex-col items-start w-[35%] gap-2">
                            <div className="flex items-start justify-between w-full gap-1 text-gray-400">
                                <span className="text-[13px]">
                                    Connected Brokers
                                </span>
                                <span className="dark:text-white text-black font-semibold text-[14px]">
                                    1
                                </span>
                            </div>
                            <div className="flex items-start justify-between w-full gap-1 text-gray-400">
                                <span className="text-[13px]">
                                    Bots Deployed
                                </span>
                                <span className="dark:text-white text-black font-semibold text-[14px]">
                                    1
                                </span>
                            </div>
                            <div className="flex items-start justify-between w-full gap-1 text-gray-400">
                                <span className="text-[13px]">
                                    Active Bots
                                </span>
                                <span className="dark:text-white text-black font-semibold text-[14px]">
                                    0
                                </span>
                            </div>
                            <div className="flex items-start justify-between w-full gap-1 text-gray-400">
                                <span className="text-[13px]">
                                    Open Positions
                                </span>
                                <span className="dark:text-white text-black font-semibold text-[14px]">
                                    0
                                </span>
                            </div>
                            <div className="flex items-start justify-between w-full gap-1 text-gray-400">
                                <span className="text-[13px]">
                                    Total Trades
                                </span>
                                <span className="dark:text-white text-black font-semibold text-[14px]">
                                    1
                                </span>
                            </div>
                            <div className="flex items-start justify-between w-full gap-1 text-gray-400">
                                <span className="text-[13px]">
                                    Win Ratio
                                </span>
                                <span className="dark:text-red-500 text-red-500 font-semibold text-[14px]">
                                    -9.11%
                                </span>
                            </div>
                        </div>
                    }
                </div>
                {chartData && chartData.length > 1 &&
                    <div className="w-full lg:w-[500px] h-[180px]">
                        <ReusableAreaChart data={chartData}/>
                    </div>
                }
            </div>
        </>
    )
}
