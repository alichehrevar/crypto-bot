'use client'

import Image from "next/image";
import { Divider } from "@heroui/react";
import React from "react";

import PnLSection from "@/components/profile/dashboard/PnLSection";
import AssetSection from "@/components/profile/dashboard/AssetSection";
import CryptoCurrencyReportSection from "@/components/profile/dashboard/CryptoCurrencyReportSection";

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
      <Divider className="my-10" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[220px]">
        <div className="flex items-start justify-start flex-col dark:bg-[#161616] light:bg-white rounded-2xl p-6 gap-4">
          <AssetSection />
        </div>
        <div className="flex items-start justify-start flex-col dark:bg-[#161616] light:bg-white rounded-2xl py-6 px-3 gap-4">
          <PnLSection />
        </div>
        <div className="flex items-center justify-start flex-col dark:bg-[#161616] light:bg-white rounded-2xl py-6 px-3 gap-4 h-full">
          <CryptoCurrencyReportSection />
        </div>
      </div>
    </section>
  )
}
