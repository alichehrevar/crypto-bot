'use client'

import React from "react";
import Image from "next/image";
import { Divider } from "@heroui/react";

import PnLSection from "@/components/profile/dashboard/PnLSection";
import AssetSection from "@/components/profile/dashboard/AssetSection";
import CryptoCurrencyReportSection from "@/components/profile/dashboard/CryptoCurrencyReportSection";
import TechnicalBotsList from "@/components/profile/bots/technical/TechnicalBotsList";
import Link from "next/link";
import { ArrowDownIcon, PlusIcon } from "@/utils/icons";

export default function Dashboard() {

  return (
    <section className="container px-2 lg:px-8 mt-16 mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-start justify-center flex-col gap-3">
          <h4 className="font-bold text-[24px]">Welcome back Max!</h4>
          <h6 className="font-semibold text-[16px]">Total Balance</h6>
          <div className="flex items-center gap-5">
            <p className="font-extrabold text-[28px]">$659.15</p>
            <span className="text-[14px] font-bold mt-2.5 text-success-500">+14.8 %</span>
          </div>
        </div>
        <Image alt="Overview" className="object-cover" height={120} src="/images/profile/overview.png" width={500} />
      </div>
      <div className="flex space-x-4">
        {/* Deposit button */}
        <button
          className="inline-flex items-center px-4 h-[40px] dark:bg-[#161616] hover:bg-gray-700 text-white rounded-full transition"
        >
          <ArrowDownIcon className="mr-2 size-4" />
          Deposit
        </button>

        {/* New Bot button */}
        <Link href={'/profile/bots/technical/deploy'}
          className="inline-flex items-center px-4 h-[40px] bg-white hover:bg-gray-100 text-black rounded-full transition"
        >
          <div className="bg-black mr-2 h-6 w-6 rounded-full flex items-center justify-center">
            <PlusIcon className="size-4" stroke="white" />
          </div>
          New Bot
        </Link>
      </div>
      <Divider className="my-10" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[220px]">
        <div className="flex items-start justify-start flex-col dark:bg-[#161616] bg-white rounded-2xl p-6 gap-4">
          <AssetSection />
        </div>
        <div className="flex items-start justify-start flex-col dark:bg-[#161616] bg-white rounded-2xl py-6 px-3 gap-4">
          <PnLSection />
        </div>
        <div className="flex items-center justify-start flex-col dark:bg-[#161616] bg-white rounded-2xl py-6 px-3 gap-4 h-full">
          <CryptoCurrencyReportSection />
        </div>
      </div>
      <div className="grid grid-cols-1 dark:bg-[#161616] bg-white mt-4 rounded-2xl py-6 px-3">
        <TechnicalBotsList />
      </div>
    </section>
  )
}
