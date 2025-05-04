import React from "react";
import { useEffect, useState } from "react";
import { addToast } from "@heroui/react";

import { getData } from "@/actions/get";
import { Bot, DeployedBotsResponse } from "@/types/profile/DeployedBots";
import TradesList from "./TradesList";
import CloseBotModal from "./modals/closeBotModal";
import PlayPauseBotModal from "./modals/playPauseBotModal";

export default function TechnicalBotsList() {
  const [deployedBots, setDeployedBots] = useState<Bot[]>([]);

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

  useEffect(() => {
    fetchDeployedBots()
      .then((response: DeployedBotsResponse) => {
        if (response.success) {
          setDeployedBots(response.bots);
        } else {
          addToast({
            title: response.error,
            color: "danger"
          });
        }
      })
      .catch(() => {
        addToast({
          title: "Error getting deployed bots!",
          color: "danger"
        });
      });
  }, []);

  async function fetchDeployedBots() {
    return getData("/bots");
  }

  function handleClick(botIndex: number) {
    const botContent = document.getElementById(`bot-content-${botIndex}`);
    if (botContent && deployedBots[botIndex].trades.length > 0) {
      botContent.classList.toggle("max-h-0");
      botContent.classList.toggle("max-h-120");
      botContent.classList.toggle("opacity-0");
      botContent.classList.toggle("opacity-100");
    }
  }

  return (
    <div className="flex flex-col w-full gap-2 p-4 rounded-md">
      {/* Table Header */}
      <div className="grid grid-cols-11 font-semibold text-sm pb-2 mb-4">
        {tableHeaderItems.map((item, index) => (
          <div key={index} className="truncate">
            {item}
          </div>
        ))}
      </div>

      {/* Table Rows */}
      {deployedBots.map((bot: Bot, botIndex) => (
        <React.Fragment key={botIndex}>
          <div
            className="grid grid-cols-11 items-center text-[13px] dark:bg-[#1A1A1A] rounded-md px-4 py-3 cursor-pointer hover:shadow-lg transition-all duration-300"
            role="button"
            tabIndex={botIndex}
            onClick={() => handleClick(botIndex)}
          >
            <span>Indicator Bot</span>
            <span>Default</span>
            <span>BingX</span>
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
              <CloseBotModal botId={bot._id} />
            </div>
          </div>
          <div
            id={`bot-content-${botIndex}`}
            className="bot-content max-h-0 overflow-hidden transition-all duration-500 ease-in-out opacity-0"
          >
            <TradesList bot={bot} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
