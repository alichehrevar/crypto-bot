import React, { useEffect, useState } from "react";
import {addToast, Skeleton} from "@heroui/react";

import { AssetSummaryResponse, Summary } from "@/types/profile/AssetSummary";
import { getData } from "@/actions/get";
import ReusableAreaChart from "@/components/shared/charts/ReusableAreaChart";

const mockData = [
  { date: '10 Dec', value: 25000 }, { date: '11 Dec', value: 45000 },
  { date: '12 Dec', value: 35000 }, { date: '13 Dec', value: 55000 },
  { date: '14 Dec', value: 20000 }, { date: '15 Dec', value: 65000 },
  { date: '16 Dec', value: 89000 }, { date: '17 Dec', value: 32000 },
  { date: '18 Dec', value: 72000 }, { date: '19 Dec', value: 68000 },
  { date: '20 Dec', value: 85000 }, { date: '21 Dec', value: 99475 },
  { date: '22 Dec', value: 95000 },
]

export default function AssetSummary() {

  const [assetData, setAssetData] = useState<Summary>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetSummary()
      .then((response: AssetSummaryResponse) => {
        setAssetData(response.summary)
      })
      .catch((err) => {
        addToast({
          title: `Error fetching assets distribution: ${err}`,
          color: 'danger'
        })
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
        </div>
        <div className="w-[500px] h-[180px]">
          <ReusableAreaChart data={mockData} />
        </div>
      </div>
    </>
  )
}
