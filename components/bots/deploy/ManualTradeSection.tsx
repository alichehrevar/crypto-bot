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
    <div className="flex w-full h-full flex-col ua-card">
      <ManualTradeForm selectedSymbol={selectedSymbol} onTradeExecuted={() => onSuccessAction()} />
    </div>
  )
}
