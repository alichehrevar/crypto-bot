'use client'

import React from "react";
import TechnicalBotsList from "@/components/profile/bots/technical/TechnicalBotsList";

export default function TechnicalBotsPage () {
  return (
    <section className="mx-2 lg:mx-4 dark:bg-[#161616] light:bg-white mt-4 rounded-2xl py-6 px-3">
      <TechnicalBotsList />
    </section>
  )
}
