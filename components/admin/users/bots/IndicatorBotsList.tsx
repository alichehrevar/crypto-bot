import React from "react";
import Link from "next/link";
import {ScanEye} from "lucide-react";

import {indicatorBotListHeader} from "@/utils/BotType";
import {Bot} from "@/types/bots/DeployedBots";
import {EyeSlashFilledIcon, GlobeIcon} from "@/utils/icons";

interface IndicatorBotsListProps {
    bots: Bot[]
}

export default function IndicatorBotsList({bots}: IndicatorBotsListProps) {
    return (
        <div className="flex flex-col w-full gap-2 rounded-md overflow-y-auto thin-scrollbar relative">
            {/* header row */}
            <h4 className="font-semibold text-2xl text-white/60 mb-2">Indicator Bots</h4>
            <div
                className="grid grid-cols-10 font-semibold gap-2 text-sm pb-4 mb-2 px-2 sticky top-0 pt-4 border-b border-gray-800">
                {indicatorBotListHeader.map((item, ix) => (
                    <div key={ix} className={`truncate ${ix === 0 ? 'col-span-2' : ''}`}>
                        {item}
                    </div>
                ))}
            </div>
            {/* grid bots list */}
            {bots.map((bot, botIndex) => (
                <React.Fragment key={botIndex}>
                    <Link
                        aria-controls={`bot-content-${botIndex}`}
                        className="group grid grid-cols-10 gap-2 items-center text-[13px] px-2 dark:bg-dark-gray rounded-md py-3 cursor-pointer hover:shadow-lg transition-all duration-300 hover:bg-bg-glass"
                        href={`/admin/bots/${bot._id}`}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="capitalize line-clamp-1 w-full flex items-center gap-1 col-span-2">
                            {bot.share ? <GlobeIcon/> : <EyeSlashFilledIcon/>}
                            {bot.botType}
                        </span>
                        <span className="capitalize">{bot.strategy}</span>
                        <span className="capitalize">{bot.accountType}</span>
                        <span>{bot.symbol}</span>
                        <span>{bot.marketInfo?.tradeFund} <small>USDT</small></span>
                        <span>{bot.trades ? bot.trades.length : 0}</span>
                        <span>{bot.marketInfo?.lastSignal ?? "—"}</span>
                        <span
                            className={bot.pnl.pct > 0 ? "text-green-500" : bot.pnl.pct < 0 ? "text-red-500" : ""}
                        >
                            {bot.pnl.pct}%
                        </span>
                        <div className="flex space-x-2 justify-center items-center">
                            <ScanEye className="group-hover:stroke-white/60 transition-all duration-300 size-5" />
                        </div>
                    </Link>
                </React.Fragment>
            ))}
        </div>
    )
}
