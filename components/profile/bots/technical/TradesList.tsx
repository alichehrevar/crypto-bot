import { Bot, Trade } from "@/types/profile/DeployedBots";
import React from "react";
import CloseTradeModal from "@/components/profile/bots/technical/modals/closeTradeModal";

export default function TradesList (props: {bot: Bot}) {

  const tradeTableHeaderItems = [
    "Positions",
    "Date",
    "Status",
    "Amount",
    "Side",
    "Open Price",
    "Close Price",
    "Result"
  ];

  return (
    <div className="flex flex-col w-full gap-4 p-4 dark:bg-black rounded-md">
      <div className="grid grid-cols-9 font-semibold text-sm pb-2 mb-2">
        {tradeTableHeaderItems.map((item, index) => (
          <div key={index} className="truncate">
            {item}
          </div>
        ))}
      </div>
      {props.bot.trades.map((trade: Trade, tradeIndex) => {
        const asset = props.bot.symbol.split("/")[0];                         // e.g. "BTC"
        const entryPrice = trade.entryPrice;
        const exitPrice = trade.exitPrice;
        const isClosed = exitPrice != null;

        // current price for unrealized
        const currentPrice = props.bot.marketInfo.currentCandle?.price ?? entryPrice;

        // profit in quote‐currency (e.g. USDT)
        const profit = isClosed
          ? trade.profit
          : (currentPrice - entryPrice) * trade.quantity;

        // percent PnL relative to entry
        const pct = (((isClosed ? exitPrice! : currentPrice) - entryPrice) / entryPrice) * 100;

        // status text
        const statusText = isClosed ? "Closed" : "Open";

        // formatted result
        let resultText = "—";
        if (isClosed) {
          resultText = profit >= 0
            ? `Win (+${pct.toFixed(2)}%)`
            : `Loss (${pct.toFixed(2)}%)`;
        }

        return (
          <div
            key={tradeIndex}
            className="grid grid-cols-9 text-[12px] text-sm pb-2 items-center"
          >
            <span>{`Position ${tradeIndex + 1}`}</span>
            <span>
              {new Date(trade.timestamp).toLocaleString("en-US", {
                dateStyle: "short",
                timeStyle: "short",
                hour12: false
              })}
            </span>
            <span>{statusText}</span>
            <span
              className={
                profit > 0
                  ? "text-green-500"
                  : profit < 0
                    ? "text-red-500"
                    : ""
              }
            >
              {profit >= 0 ? "+" : ""}
              {profit.toFixed(2)} {asset}
            </span>
            <span className={trade.type === "BUY" ? "text-green-500" : "text-red-500"}>
              {trade.type === "BUY" ? "Buy" : "Sell"}
            </span>
            <span>{entryPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} USDT</span>
            <span>
              {isClosed
                ? exitPrice!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT"
                : "—"}
            </span>
            <span
              className={
                isClosed
                  ? profit >= 0
                    ? "text-green-500"
                    : "text-red-500"
                  : ""
              }
            >
              {resultText}
            </span>
            <span>
              {!isClosed && (
                <CloseTradeModal botId={props.bot._id} tradeId={trade._id} />
              )}
            </span>
          </div>
        );
      })}
    </div>
  )
}
