import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Skeleton } from "@heroui/react";

import { AssetSummaryResponse, Summary } from "@/types/profile/AssetSummary";
import { getData } from "@/actions/get";

export default function AssetSummary() {

  const [assetData, setAssetData] = useState<Summary>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetSummary()
      .then((response: AssetSummaryResponse) => {
        console.log(response);
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
            {loading
              ? <div className="h-[40px] w-full flex items-center justify-between gap-4">
                  <Skeleton className="h-3 w-[90px] rounded-lg" />
                  <Skeleton className="h-1 w-[20px] rounded-lg" />
                </div>
              : <>
                  <p className="font-extrabold text-[28px]">{`$ ${assetData?.totalBalance === undefined ? 0.00 : assetData?.totalBalance}`}</p>
                  {assetData && assetData.pctChange !== undefined &&
                    <span className={`text-[14px] font-bold mt-2.5 ${assetData && assetData.pctChange < 0 ? 'text-red-500' : 'text-success-500'}`}>
                      {`${assetData?.pctChange}%`}
                    </span>
                  }
                </>
            }
          </div>
        </div>
        <Image alt="Overview" className="object-cover" height={120} src="/images/profile/overview.png" width={500} />
      </div>
      <div className="flex space-x-4">
        <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
          <span className="text-[13px]">
            Portfolio Balance
          </span>
          {loading
            ? <Skeleton className="h-1.5 w-[40px] mt-2.5 rounded-lg" />
            : <span className="dark:text-white text-black font-semibold text-[14px]">
              {`$ ${assetData?.portfolioBalance === undefined ? 0.00 : assetData?.portfolioBalance}`}
            </span>
          }
        </div>
        <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
          <span className="text-[13px]">
            Available Funds
          </span>
          {loading
            ? <Skeleton className="h-1.5 w-[40px] mt-2.5 rounded-lg" />
            : <span className="dark:text-white text-black font-semibold text-[14px]">
              {`$ ${assetData?.availableFunds === undefined ? 0.00 : assetData?.availableFunds}`}
            </span>
          }
        </div>
      </div>
    </>
  )
}
