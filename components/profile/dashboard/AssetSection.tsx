import React from "react";

import AssetsPieChart from "@/components/profile/charts/PieChart";

export default function AssetSection() {
  return (
    <>
      <h4 className="font-bold text-[16px]">Assets</h4>
      <div className="h-[160px] w-full overflow-x-hidden">
        <div className="h-[120px] mt-5">
          <AssetsPieChart />
        </div>
      </div>
    </>
  )
}
