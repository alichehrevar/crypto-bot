import React from "react";

import { Bot } from "@/types/profile/bots/DeployedBots";
import { ChevronUpIcon } from "@/utils/icons";

interface DetailRowProps {
  label: string;
  value: string;
  valueClass?: string;
}

function DetailRow({ label, value, valueClass }: DetailRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 uppercase text-xs font-semibold">{label}</span>
      <span className={`text-white text-sm ${valueClass || ""}`}>{value}</span>
    </div>
  );
}

interface TradesListProps {
  bot: Bot;
  onCollapse?: () => void;
  refreshBotsList: () => void;
}

export default function TradesList({ bot, onCollapse }: TradesListProps) {
  if (!bot.trades || bot.trades.length === 0) {
    return (
      <div className="rounded-b-2xl flex items-center justify-start w-full">
        <p className="text-gray-500 text-center">No trades yet.</p>
      </div>
    );
  }

  // For simplicity, we only show the most recent trade
  const trade = bot.trades[0];
  // const asset = bot.symbol.split("/")[0];
  const entry = trade.entryPrice;
  const exit = trade.exitPrice;
  const isClosed = exit != null;
  const current = bot.marketInfo.currentCandle?.price ?? entry;
  const profit = isClosed
    ? trade.profit
    : (current - entry) * trade.quantity;
  const pct = (((isClosed ? exit! : current) - entry) / entry) * 100;

  return (
    <div className="bg-[#1A1A1A] rounded-b-2xl p-4 space-y-3">
      {/* collapse chevron */}
      <div className="flex justify-end">
        <button type="button" onClick={onCollapse}>
          <ChevronUpIcon
            className="w-5 h-5 text-gray-400 cursor-pointer"
          />
        </button>
      </div>

      <DetailRow label="POSITIONS" value={bot.accountType} />
      <DetailRow label="DATE" value={new Date(trade.timestamp).toLocaleDateString()} />
      <DetailRow label="STATUS" value={isClosed ? "Closed" : "Open"} />

      <DetailRow
        label="AMOUNT"
        value={`${(trade.quantity / bot.marketInfo.baseFund * 100).toFixed(0)}% / ${(
          (bot.marketInfo.baseFund - trade.quantity * entry) /
          bot.marketInfo.baseFund *
          100
        ).toFixed(0)}%`}
        valueClass="text-green-400"
      />

      <DetailRow
        label="SIDE"
        value={`${profit >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
        valueClass={profit >= 0 ? "text-green-400" : "text-red-400"}
      />

      <DetailRow label="OPEN PRICE" value={`x ${trade.quantity.toFixed(2)}`} />
      <DetailRow label="CLOSE PRICE" value={isClosed ? `x ${trade.quantity.toFixed(2)}` : "—"} />

      <DetailRow
        label="RESULT"
        value={isClosed ? (profit >= 0 ? `Win +${pct.toFixed(2)}%` : `Loss ${pct.toFixed(2)}%`) : "—"}
        valueClass={isClosed ? (profit >= 0 ? "text-green-400" : "text-red-400") : ""}
      />
    </div>
  );
}
