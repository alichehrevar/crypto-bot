'use client'

import React, {useEffect, useState} from "react";
import {addToast, Spinner} from "@heroui/react";

import {getData} from "@/actions/get";
import {BotDetailsApi} from "@/types/admin/Bots";
import {BotCard} from "@/components/BotCard";
import {OrderIcon} from "@/utils/icons";
import {Bot} from "@/types/bot";

interface BotDetailsProps {
    botId: string
}

export default function BotDetails({botId}: BotDetailsProps) {

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [botDetails, setBotDetails] = useState<Bot>()

    async function getBotDetails() {
        return await getData(`/admin/bots/${botId}/details`)
    }

    useEffect(() => {
        getBotDetails()
            .then((response: BotDetailsApi) => {
                if (response.success) {
                    const apiBot = response.data;
                    const mappedBots: Bot = {
                        id: Number(apiBot._id),
                        name: apiBot.name || `${apiBot.strategy} Bot`,
                        pair: apiBot.symbol,
                        leverage: apiBot.marketInfo?.leverage ? `${apiBot.marketInfo.leverage}x` : 'N/A',
                        pnlPerc: apiBot.pnl.pct,
                        pnlValue: apiBot.pnl.total,
                        status: apiBot.active ? 'active' : 'paused',
                        transactions: apiBot.trades ? apiBot.trades.length : 0,
                        strategy: apiBot.strategy,
                        initialCapital: apiBot.marketInfo?.tradeFund || 0,
                        lastSignalAction: apiBot.marketInfo?.lastSignal ?? "—",
                        marketType: apiBot.accountType === 'futures' ? 'Future' : 'Spot',
                        tp: apiBot.botTP || null,
                        sl: apiBot.botSL || null,
                        deploymentDate: apiBot.createdAt,
                        runtime: 'N/A',
                        successRate: 0,
                        avgHoldTime: 'N/A',
                        winRate: 0,
                        sharpeRatio: 0,
                        marginType: null,
                        positionMode: null,
                        trades: apiBot.trades?.slice(0, 5).map(t => ({
                            type: t.side === 'buy' ? 'buy' : 'sell',
                            price: t.price || 0,
                            pnl: t.realizedPnl || 0,
                            time: t.time ? new Date(t.time).toLocaleTimeString() : 'N/A',
                        })) || [],
                    };

                    setBotDetails(mappedBots)
                } else {
                    addToast({
                        title: response.message,
                        color: "warning"
                    })
                }
            })
            .catch(() => {
                addToast({
                    title: "Failed to load bot details",
                    color: "danger"
                })
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    return (
        <div className="flex flex-col w-full gap-2 rounded-md overflow-y-auto thin-scrollbar relative">
            <h4 className="font-semibold text-2xl text-white/60 mb-2">Bot Info</h4>
            {isLoading &&
                <div className="flex items-center justify-center flex-row-reverse gap-3 h-24 glass rounded-lg w-full">
                    <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
                    Loading Data…
                </div>
            }
            {!isLoading && !botDetails &&
                <div className={`flex items-center justify-center flex-col w-full h-full`}>
                    <OrderIcon className="w-[120px] h-[120px]" />
                    <span className="text-gray-600 text-sm">No Data</span>
                </div>
            }
            {!isLoading && botDetails &&
                <div className={`transition-all duration-500 ease-in-out opacity-100 scale-100 mt-4`}>
                    <BotCard bot={botDetails} />
                </div>
            }
        </div>
    )
}
