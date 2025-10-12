import React from "react";

import AssetsPieChart from "@/components/profile/charts/PieChart";

export default function AssetSection() {
    return (
        <div className="ua-card h-[320px] p-4">
            <h4 className="font-bold text-[16px]">Assets</h4>
            <div className="h-[300px] w-full overflow-x-hidden">
                <div className="h-[270px] mt-5">
                    <AssetsPieChart/>
                </div>
            </div>
        </div>
    )
}
