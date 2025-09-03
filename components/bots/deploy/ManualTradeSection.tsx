'use client'

import React from "react";

import ManualTradeForm from "@/components/bots/deploy/ManualTradeForm";
import {MarketListItem} from "@/types/MarketList";

export default function TechnicalDeployBotSection({
  onSuccessAction,
  selectedSymbol
}: {
    onSuccessAction: () => void,
    selectedSymbol?: MarketListItem | null
}) {

  return (
    <div className="flex w-full h-full flex-col bg-dark-gray backdrop-blur-md rounded-lg">
      <ManualTradeForm selectedSymbol={selectedSymbol} onTradeExecuted={() => onSuccessAction()} />
    </div>
  )
}
