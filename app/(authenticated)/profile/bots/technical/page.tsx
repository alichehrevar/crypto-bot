'use client'

import React, { useState } from "react";
import TechnicalBotsList from "@/components/profile/bots/technical/TechnicalBotsList";
import DeployBotModal from "@/components/profile/bots/deploy/DeployBotModal";
import { PlusIcon } from "@/utils/icons";
import BotSelectionComponent from "@/components/profile/bots/BotSelectionComponent";

export default function TechnicalBotsPage() {

  const [refreshBotsList, setRefreshBotsList] = useState<boolean>(false)

  return (
    <div className="container mt-4 relative px-5">
      <BotSelectionComponent />
      <div className="grid grid-cols-1 dark:bg-[#161616] bg-white mt-4 rounded-2xl py-6 px-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold ml-4 mb-4">Bots List</h3>
          {/* New Bot button */}
          <DeployBotModal onSuccessAction={() => setRefreshBotsList(true)}>
            <button
              className="inline-flex items-center justify-center w-[120px] h-[40px] bg-white hover:bg-gray-100 text-black rounded-full transition"
            >
              <div className="bg-black mr-2 h-6 w-6 rounded-full flex items-center justify-center">
                <PlusIcon className="size-4" stroke="white" />
              </div>
              <span className="text-[14px]">
              New Bot
            </span>
            </button>
          </DeployBotModal>
        </div>
        <TechnicalBotsList refreshList={refreshBotsList} />
      </div>
    </div>
  )
}
