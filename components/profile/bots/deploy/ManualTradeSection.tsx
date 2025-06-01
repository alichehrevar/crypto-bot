'use client'

import React from "react";

import ManualTradeForm from "@/components/profile/bots/deploy/ManualTradeForm";

export default function TechnicalDeployBotSection ({
  onSuccessAction
}: {
  onSuccessAction: () => void
}) {

  const tabs = [
    { key: "standard",   title: "Standard"   },
    { key: "infinity", title: "Infinity" },
    { key: 'dynamic', title: 'Dynamic' }
  ] as const;

  return (
    <div className="flex w-full flex-col bg-white/10 backdrop-blur-md rounded-2xl bot-config-form__tabs-screen-height">
      <ManualTradeForm onTradeExecuted={() => onSuccessAction()} />
    </div>
  )
}
