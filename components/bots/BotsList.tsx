import React, {useEffect, useState} from "react";
import {addToast, Spinner} from "@heroui/react";

import TradesList from "./technical/TradesList";
import CloseBotModal from "./technical/modals/closeBotModal";
import PlayPauseBotModal from "./technical/modals/playPauseBotModal";

import {Bot, DeployedBotsResponse} from "@/types/bots/DeployedBots";
import {getData} from "@/actions/get";
import {OrderIcon} from "@/utils/icons";
import DeployButton from "@/components/shared/ui/DeployButton";
import {gridBotListHeader, indicatorBotListHeader} from "@/utils/BotType";

export default function BotsList({refreshList = false, title = "Active Bots", listType, active = true, showTitle = true, showDeployButton = true}: {
    refreshList?: boolean,
    title?: string,
    listType?: string,
    active?: boolean,
    showTitle?: boolean,
    showDeployButton?: boolean,
}) {
    // Shared state and loader
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [deployedBots, setDeployedBots] = useState<Bot[]>([]);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const loadBots = async () => {
        return await getData(`/bots?botType=${listType}&active=${active}`);
    };

    useEffect(() => {
        setIsLoading(true);
        loadBots()
            .then((res: DeployedBotsResponse) => {
                if (res.success) {
                    setDeployedBots(res.bots)
                } else {
                    addToast({title: res.error || "Unknown error", color: "danger"})
                }
            })
            .catch((err) => {
                addToast({title: err.message || "Failed to load bots", color: "danger"});
            })
            .finally(() => {
                setIsLoading(false);
            })
    }, [refreshList]);

    function handleDesktopClick(botIndex: number) {
        setExpandedIndex(expandedIndex === botIndex ? null : botIndex);
    }

    const tableHeaderItems = listType === "indicator" ? indicatorBotListHeader : gridBotListHeader;

    return (
        <>
            <div className={`flex items-center ${showTitle ? 'justify-between' : 'justify-end'} w-full px-0 lg:px-4 h-[40px]`}>
                {showTitle &&
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold mb-4">{title}</h3>
                    </div>
                }
                {!isLoading && deployedBots.length === 0 && showDeployButton &&
                    <DeployButton />
                }
            </div>

            {isLoading &&
                <div className="flex items-center justify-center flex-row-reverse gap-3 h-24 bg-dark-gray rounded-lg w-full">
                    <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
                    Loading Data…
                </div>
            }

            {/* ========== No Data ========== */}
            {!isLoading && deployedBots.length === 0 &&
                <div className={`flex items-center justify-center flex-col w-full ${showDeployButton ? 'gap-2' : ''}`}>
                    <OrderIcon className="w-[120px] h-[120px]" />
                    <span className="text-gray-600 text-sm">No Data</span>
                </div>
            }

            {!isLoading && deployedBots.length > 0 &&
                <div className="flex flex-col w-full gap-2 p-4 rounded-md overflow-y-auto thin-scrollbar">
                    {/* header row */}
                    <div className={`grid ${active ? 'grid-cols-9' : 'grid-cols-8'} font-semibold text-sm pb-2 mb-4 mx-4`}>
                        {tableHeaderItems.map((item, ix) => (
                            <div key={ix} className="truncate">
                                {item}
                            </div>
                        ))}
                    </div>

                    {/* indicator bots list */}
                    {listType === 'indicator' && deployedBots.map((bot, botIndex) => (
                        <React.Fragment key={botIndex}>
                            <div
                                aria-controls={`bot-content-${botIndex}`}
                                className={`grid ${active ? 'grid-cols-9' : 'grid-cols-8 min-h-14'} items-center text-[13px] dark:bg-dark-gray rounded-md px-4 py-3 cursor-pointer hover:shadow-lg transition-all duration-300`}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleDesktopClick(botIndex)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleDesktopClick(botIndex);
                                    }
                                }}
                            >
                                <span className="capitalize">{bot.botType}</span>
                                <span className="capitalize">{bot.strategy}</span>
                                <span className="capitalize">{bot.accountType}</span>
                                <span>{bot.symbol}</span>
                                <span>{bot.marketInfo?.tradeFund} <small>USDT</small></span>
                                <span>{bot.trades ? bot.trades.length : 0}</span>
                                <span>{bot.marketInfo?.lastSignal ?? "—"}</span>
                                <span
                                    className={`${
                                        bot.pnl.pct > 0 ? "text-green-500" : bot.pnl.pct < 0 ? "text-red-500" : ""
                                    }`}
                                >
                                  {bot.pnl.pct}%
                                </span>
                                {active &&
                                    <div className="flex space-x-2 justify-end items-center">
                                        <PlayPauseBotModal botId={bot._id}/>
                                        <CloseBotModal botId={bot._id} refreshBotsList={loadBots}/>
                                    </div>
                                }
                            </div>

                            <div
                                className={`bot-content overflow-hidden transition-all duration-500 ease-in-out ${expandedIndex === botIndex ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}`}
                                id={`bot-content-${botIndex}`}
                            >
                                <TradesList
                                    bot={bot}
                                    refreshBotsList={loadBots}
                                />
                            </div>
                        </React.Fragment>
                    ))}
                    {/* grid bots list */}
                    {listType === 'grid' && deployedBots.map((bot, botIndex) => (
                        <React.Fragment key={botIndex}>
                            <div
                                aria-controls={`bot-content-${botIndex}`}
                                className={`grid ${active ? 'grid-cols-9' : 'grid-cols-8 min-h-14'} items-center text-[13px] dark:bg-dark-gray rounded-md px-4 py-3 cursor-pointer hover:shadow-lg transition-all duration-300`}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleDesktopClick(botIndex)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleDesktopClick(botIndex);
                                    }
                                }}
                            >
                                <span className="capitalize">{bot.name}</span>
                                <span className="capitalize">{bot.marketInfo?.tradeFund}</span>
                                <span className="capitalize">{bot.accountType}</span>
                                <span>{bot.symbol}</span>
                                <span>{bot.marketInfo?.tradeFund} <small>USDT</small></span>
                                <span>{bot.trades ? bot.trades.length : 0}</span>
                                <span>{bot.marketInfo?.lastSignal ?? "—"}</span>
                                <span
                                    className={`${
                                        bot.pnl.pct > 0 ? "text-green-500" : bot.pnl.pct < 0 ? "text-red-500" : ""
                                    }`}
                                >
                                  {bot.pnl.pct}%
                                </span>
                                {active &&
                                    <div className="flex space-x-2 justify-end items-center">
                                        <PlayPauseBotModal botId={bot._id}/>
                                        <CloseBotModal botId={bot._id} refreshBotsList={loadBots}/>
                                    </div>
                                }
                            </div>

                            <div
                                className={`bot-content overflow-hidden transition-all duration-500 ease-in-out ${expandedIndex === botIndex ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}`}
                                id={`bot-content-${botIndex}`}
                            >
                                <TradesList
                                    bot={bot}
                                    refreshBotsList={loadBots}
                                />
                            </div>
                        </React.Fragment>
                    ))}

                    {/* loading / empty states */}
                    {isLoading && (
                        <div className="flex items-center justify-center bg-default-100 rounded-lg h-[70px]">
                            <span>Loading deployed bots</span>
                            <Spinner className="ml-3 mb-2" color="primary" size={'sm'} variant="wave"/>
                        </div>
                    )}
                    {!isLoading && deployedBots.length === 0 && (
                        <div className="flex items-center justify-center bg-default-100 rounded-lg h-[70px]">
                            No bots deployed yet.
                        </div>
                    )}
                </div>
            }
        </>
    );
}
