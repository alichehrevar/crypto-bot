'use client'

import Image from "next/image";
import {Divider} from "@heroui/react";

import AssetsPieChart from "@/components/profile/charts/PieChart";
import { PieChartType } from "@/types/profile/ChartTypes";

export default function Dashboard() {

  const data: PieChartType = [
    {
      "id": "binance",
      "label": "Binance",
      "value": 393,
      "color": "hsl(40, 70%, 100%)"
    },
    {
      "id": "bingx",
      "label": "BingX",
      "value": 514,
      "color": "hsl(128, 70%, 100%)"
    },
    {
      "id": "okx",
      "label": "OKX",
      "value": 162,
      "color": "hsl(101, 70%, 100%)"
    },
  ]

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
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[220px]">
        <div className="flex items-start justify-start flex-col dark:bg-[#161616] light:bg-white rounded-2xl p-6 gap-4">
          <h4 className="font-bold text-[16px]">Assets</h4>
          <div className="h-[160px] w-full">
            <AssetsPieChart data={data} />
          </div>
        </div>
      </div>
    </section>
  )
}
