'use client'

import React from "react";
import TechnicalBotsList from "@/components/profile/bots/technical/TechnicalBotsList";

export default function TechnicalBotsPage() {
  return (
    <div className="container mt-4 relative px-5">
      <div className="grid grid-cols-1 dark:bg-[#161616] bg-white mt-4 rounded-2xl py-6 px-3">
        <h3 className="text-xl font-bold ml-4 mb-4">Bots List</h3>
        <TechnicalBotsList refreshList={false} />
      </div>
    </div>
  )
}
