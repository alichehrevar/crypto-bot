'use client'

import React from "react";

import ManualTradeForm from "@/components/bots/deploy/ManualTradeForm";

export default function TechnicalDeployBotSection ({
  onSuccessAction
}: {
  onSuccessAction: () => void
}) {

  return (
    <div className="flex w-full h-full flex-col bg-dark-gray backdrop-blur-md rounded-lg">
      <ManualTradeForm onTradeExecuted={() => onSuccessAction()} />
    </div>
  )
}
