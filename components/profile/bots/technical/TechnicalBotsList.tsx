import React from "react";
import { useEffect, useState } from "react";
import { addToast, Spinner } from "@heroui/react";

import TradesList from "./TradesList";
import CloseBotModal from "./modals/closeBotModal";
import PlayPauseBotModal from "./modals/playPauseBotModal";

import { Bot, DeployedBotsResponse } from "@/types/profile/bots/DeployedBots";
import { getData } from "@/actions/get";

export default function TechnicalBotsList(props: {refreshList: boolean}) {

  const [isLoading, setIsLoading] = useState<boolean>(true)
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

  const loadBots = async () => {
    return await fetchDeployedBots();
  };

  useEffect(() => {
    setIsLoading(true);
    loadBots()
      .then((response) => {
        if (response.success) setDeployedBots(response.bots);
        else addToast({ title: response.error, color: "danger" });
      })
      .catch(() => {
        addToast({ title: "Error getting deployed bots!", color: "danger" });
      })
      .finally(() => {
        setIsLoading(false);
      })
  }, [props.refreshList]);


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
      {deployedBots.length > 0 && deployedBots.map((bot: Bot, botIndex) => (
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
            className="bot-content max-h-0 overflow-hidden transition-all duration-500 ease-in-out opacity-0"
            id={`bot-content-${botIndex}`}
          >
            <TradesList bot={bot} />
          </div>
        </React.Fragment>
      ))}
      {isLoading &&
        <div className="flex items-center justify-center bg-default-100 rounded-2xl h-[70px]">
          <span>Loading deployed bots</span>
          <Spinner color="primary" variant="wave" size={'sm'} className="ml-3 mb-2" />
        </div>
      }
      {!isLoading && deployedBots.length === 0 &&
        <div className="flex items-center justify-center bg-default-100 rounded-2xl h-[70px]">No bots deployed yet.</div>
      }
    </div>
  );
}
