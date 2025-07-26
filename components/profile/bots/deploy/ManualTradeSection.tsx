'use client'

import React from "react";

import ManualTradeForm from "@/components/profile/bots/deploy/ManualTradeForm";

export default function TechnicalDeployBotSection ({
  onSuccessAction
}: {
  onSuccessAction: () => void
}) {

  return (
    <div className="flex w-full h-full flex-col bg-dark-gray backdrop-blur-md rounded-2xl">
      <ManualTradeForm onTradeExecuted={() => onSuccessAction()} />
    </div>
  )
}
