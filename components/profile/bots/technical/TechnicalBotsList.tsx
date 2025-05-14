import React, { useEffect, useState } from "react";
import { addToast, Spinner } from "@heroui/react";
import TradesList from "./TradesList";
import CloseBotModal from "./modals/closeBotModal";
import PlayPauseBotModal from "./modals/playPauseBotModal";
import { Bot } from "@/types/profile/bots/DeployedBots";
import { getData } from "@/actions/get";
import { ChevronDownIcon } from "@/utils/icons";

export default function TechnicalBotsList({ refreshList }: { refreshList: boolean }) {
  const [isLoading, setIsLoading] = useState(true);
  const [deployedBots, setDeployedBots] = useState<Bot[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const loadBots = async () => {
    setIsLoading(true);
    try {
      const resp = await getData("/bots");
      if (resp.success) setDeployedBots(resp.bots);
      else throw new Error(resp.error || "Unknown error");
    } catch (err: any) {
      addToast({ title: err.message || "Failed to load bots", color: "danger" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBots();
  }, [refreshList]);

  const toggleExpand = (i: number) => {
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center h-24 bg-[#1A1A1A] rounded-2xl">
          <Spinner variant="wave" color="primary" size="sm" className="mr-2" />
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
        const pnlColor = bot.pnl.pct > 0 ? "text-green-400" : bot.pnl.pct < 0 ? "text-red-400" : "text-gray-400";

        return (
          <div
            key={bot._id}
            className="bg-[#1A1A1A] rounded-2xl overflow-hidden transition-shadow hover:shadow-xl"
          >
            {/* summary row */}
            <button
              className="flex items-center justify-between px-6 py-4 cursor-pointer"
              type="button"
              onClick={() => toggleExpand(idx)}
            >
              <div className="space-y-1">
                <div className="text-white font-semibold text-[14px]">Indicator Bot</div>
                <div className="text-gray-400 text-[12px]">{bot.accountType.toUpperCase()} {bot.marketInfo.baseFund.toLocaleString()}</div>
              </div>
              <div className={`font-bold text-medium ${pnlColor}`}>+{bot.pnl.pct}%</div>
              {/* placeholder sparkline */}
              <div className="w-24 h-6 bg-green-700 rounded-lg" />
              <div className="text-gray-400 transform transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "" }}>
                <ChevronDownIcon />
              </div>
            </button>

            {/* expanded details */}
            {isExpanded && (
              <div className="border-t border-default-200 px-6 py-4 space-y-4 capitalize">
                <DetailRow label="STRATEGY" value={bot.strategy} />
                <DetailRow label="ACCOUNT" value={bot.accountType.toUpperCase()} />
                <DetailRow label="SYMBOL" value={bot.symbol.split("/")[0]} />
                <DetailRow label="TRADE FUND" value={`${bot.marketInfo.tradeFund} USDT`} />
                <DetailRow label="LEVERAGE" value={`${bot.tradeInfo.leverage}x`} />
                <DetailRow label="RISK STRATEGY" value={bot.riskStrategy.replace(/([A-Z])/g, " $1").trim()} />
                <DetailRow label="TECHNICAL VALUE" value={`${bot.indicators[0]?.name}: ${bot.indicators[0]?.params.period ?? "—"}`} />
                <DetailRow label="SIGNAL" value={bot.marketInfo.lastSignal || "—"} />
                <DetailRow label="PNL" value={`x${bot.tradeInfo.leverage} (${bot.pnl.pct > 0 ? "+" : ""}${bot.pnl.pct}%)`} valueClass={pnlColor} />

                {/* action buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <TradesList
                    bot={bot}
                    onCollapse={() => setExpandedIndex(null)}
                    refreshBotsList={loadBots}
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
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 uppercase text-xs font-semibold">{label}</span>
      <span className={`text-white text-sm ${valueClass || ""}`}>{value}</span>
    </div>
  );
}
