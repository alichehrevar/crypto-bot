import React, { useEffect, useState } from "react";
import { addToast, Spinner } from "@heroui/react";

import TradesList from "./TradesList";
import CloseBotModal from "./modals/closeBotModal";
import PlayPauseBotModal from "./modals/playPauseBotModal";

import { Bot } from "@/types/profile/bots/DeployedBots";
import { getData } from "@/actions/get";
import { ChevronDownIcon } from "@/utils/icons";

export default function TechnicalBotsList({ refreshList }: { refreshList: boolean }) {
  // Shared state & loader
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deployedBots, setDeployedBots] = useState<Bot[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const loadBots = async () => {
    setIsLoading(true);
    try {
      const resp = await getData("/bots");

      if (resp.success) setDeployedBots(resp.bots);
      else addToast({ title: resp.error || "Unknown error", color: "danger" })
    } catch (err: any) {
      addToast({ title: err.message || "Failed to load bots", color: "danger" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBots();
  }, [refreshList]);

  // Desktop toggle
  function handleDesktopClick(botIndex: number) {
    const botContent = document.getElementById(`bot-content-${botIndex}`);

    if (botContent && deployedBots[botIndex].trades.length > 0) {
      botContent.classList.toggle("max-h-0");
      botContent.classList.toggle("max-h-120");
      botContent.classList.toggle("opacity-0");
      botContent.classList.toggle("opacity-100");
    }
  }

  // Mobile toggle
  const toggleExpand = (i: number) => {
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  // Desktop headers
  const tableHeaderItems = [
    "Bot",
    "Strategy",
    "Account",
    "Symbol",
    "Trade Fund",
    "Leverage",
    "Risk Strategy",
    "Technical Value",
    "Signal",
    "PnL",
    ""
  ];

  return (
    <>
      {/* ========== MOBILE (below lg) ========== */}
      <div className="space-y-4 lg:hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-24 bg-[#1A1A1A] rounded-2xl">
            <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
            Loading bots…
          </div>
        )}

        {!isLoading && deployedBots.length === 0 && (
          <div className="flex items-center justify-center h-24 bg-[#1A1A1A] rounded-2xl">
            No bots deployed yet.
          </div>
        )}

        {deployedBots.map((bot, idx) => {
          const isExpanded = expandedIndex === idx;
          const pnlColor =
            bot.pnl.pct > 0
              ? "text-green-400"
              : bot.pnl.pct < 0
                ? "text-red-400"
                : "text-gray-400";

          return (
            <div
              key={bot._id}
              className="bg-[#1A1A1A] rounded-2xl overflow-hidden transition-shadow hover:shadow-xl"
            >
              {/* summary row */}
              <button
                className="flex items-center justify-between px-6 py-4 w-full"
                type="button"
                onClick={() => toggleExpand(idx)}
              >
                <div className="space-y-1">
                  <div className="text-white font-semibold text-[14px]">Indicator Bot</div>
                  <div className="text-gray-400 text-[12px]">
                    {bot.accountType.toUpperCase()} {bot.marketInfo.baseFund.toLocaleString()}
                  </div>
                </div>
                <div className={`font-bold text-medium ${pnlColor}`}>
                  {bot.pnl.pct > 0 ? "+" : ""}
                  {bot.pnl.pct}%
                </div>
                <div className="w-24 h-6 bg-green-700 rounded-lg" />
                <div
                  className="text-gray-400 transform transition-transform"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "" }}
                >
                  <ChevronDownIcon />
                </div>
              </button>

              {/* expanded details */}
              {isExpanded && (
                <div className="border-t border-default-200 px-6 py-4 space-y-4 capitalize">
                  <DetailRow label="STRATEGY" value={bot.strategy} />
                  <DetailRow
                    label="ACCOUNT"
                    value={`${bot.accountType.toUpperCase()}`}
                  />
                  <DetailRow label="SYMBOL" value={bot.symbol.split("/")[0]} />
                  <DetailRow label="TRADE FUND" value={`${bot.marketInfo.tradeFund} USDT`} />
                  <DetailRow label="LEVERAGE" value={`${bot.tradeInfo.leverage}x`} />
                  <DetailRow
                    label="RISK STRATEGY"
                    value={bot.riskStrategy.replace(/([A-Z])/g, " $1").trim()}
                  />
                  <DetailRow
                    label="TECHNICAL VALUE"
                    value={`${bot.indicators[0]?.name}: ${bot.indicators[0]?.params.period ?? "—"}`}
                  />
                  <DetailRow label="SIGNAL" value={bot.marketInfo.lastSignal || "—"} />
                  <DetailRow
                    label="PNL"
                    value={`x${bot.tradeInfo.leverage} (${bot.pnl.pct > 0 ? "+" : ""}${bot.pnl.pct}%)`}
                    valueClass={pnlColor}
                  />

                  {/* action buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    {/* you could swap this for a "View Trades" button if desired */}
                    <TradesList
                      bot={bot}
                      refreshBotsList={loadBots}
                      onCollapse={() => setExpandedIndex(null)}
                    />
                    <PlayPauseBotModal botId={bot._id} />
                    <CloseBotModal botId={bot._id} refreshBotsList={loadBots} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========== DESKTOP (lg+) ========== */}
      <div className="hidden lg:flex flex-col w-full gap-2 p-4 rounded-md overflow-y-auto thin-scrollbar">
        {/* header row */}
        <div className="grid grid-cols-11 font-semibold text-sm pb-2 mb-4">
          {tableHeaderItems.map((item, ix) => (
            <div key={ix} className="truncate">
              {item}
            </div>
          ))}
        </div>

        {/* bots list */}
        {deployedBots.length > 0 &&
          deployedBots.map((bot, botIndex) => (
            <React.Fragment key={botIndex}>
              <div
                aria-controls={`bot-content-${botIndex}`}
                className="grid grid-cols-11 items-center text-[13px] dark:bg-[#1A1A1A] rounded-md px-4 py-3 cursor-pointer hover:shadow-lg transition-all duration-300"
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
                <span>Indicator Bot</span>
                <span className="capitalize">{bot.strategy}</span>
                <span className="capitalize">{bot.accountType}</span>
                <span>{bot.symbol}</span>
                <span>{bot.marketInfo.tradeFund}</span>
                <span>x{bot.tradeInfo.leverage}</span>
                <span>{bot.riskStrategy}</span>
                <span>{bot.indicators?.[0]?.name ?? "—"}</span>
                <span>{bot.marketInfo.lastSignal ?? "—"}</span>
                <span
                  className={`${
                    bot.pnl.pct > 0 ? "text-green-500" : bot.pnl.pct < 0 ? "text-red-500" : ""
                  }`}
                >
                  x{bot.tradeInfo.leverage}({bot.pnl.pct}%)
                </span>
                <div className="flex space-x-2">
                  <PlayPauseBotModal botId={bot._id} />
                  <CloseBotModal botId={bot._id} refreshBotsList={loadBots} />
                </div>
              </div>

              <div
                className="bot-content max-h-0 overflow-hidden transition-all duration-500 ease-in-out opacity-0"
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
          <div className="flex items-center justify-center bg-default-100 rounded-2xl h-[70px]">
            <span>Loading deployed bots</span>
            <Spinner className="ml-3 mb-2" color="primary" size={'sm'} variant="wave" />
          </div>
        )}
        {!isLoading && deployedBots.length === 0 && (
          <div className="flex items-center justify-center bg-default-100 rounded-2xl h-[70px]">
            No bots deployed yet.
          </div>
        )}
      </div>
    </>
  );
}

// Helper for mobile detail rows
function DetailRow({
   label,
   value,
   valueClass,
 }: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 uppercase text-xs font-semibold">{label}</span>
      <span className={`text-white text-sm ${valueClass || ""}`}>{value}</span>
    </div>
  );
}
