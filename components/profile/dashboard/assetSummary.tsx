import React, { useEffect, useState } from "react";
import Image from "next/image";
import { AssetSummaryResponse, Summary } from "@/types/profile/AssetSummary";
import { getData } from "@/actions/get";

export default function AssetSummary() {

  const [assetData, setAssetData] = useState<Summary>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetSummary()
      .then((response: AssetSummaryResponse) => {
        setAssetData(response.summary)
      })
      .catch((err) => {
        console.error('Error fetching assets distribution:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function fetchAssetSummary() {
    return await getData('/accounts/summary');
  }

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-start justify-center flex-col gap-3">
          <h4 className="font-bold text-[24px]">Welcome back !</h4>
          <h6 className="font-semibold text-[16px]">Total Balance</h6>
          <div className="flex items-center gap-5">
            <p className="font-extrabold text-[28px]">{`$ ${assetData?.totalBalance}`}</p>
            <span className={`text-[14px] font-bold mt-2.5 ${assetData && assetData.pctChange < 0 ? 'text-red-500' : 'text-success-500'}`}>
              {`${assetData?.pctChange}%`}
            </span>
          </div>
        </div>
        <Image alt="Overview" className="object-cover" height={120} src="/images/profile/overview.png" width={500} />
      </div>
      <div className="flex space-x-4">
        <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
          <span className="text-[13px]">
            Portfolio Balance
          </span>
          <span className="dark:text-white text-black font-semibold text-[14px]">
            {`$ ${assetData?.totalBalance}`}
          </span>
        </div>
        <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
          <span className="text-[13px]">
            Available Funds
          </span>
          <span className="dark:text-white text-black font-semibold text-[14px]">
            {`$ ${assetData?.availableFunds}`}
          </span>
        </div>
      </div>
    </>
  )
}
