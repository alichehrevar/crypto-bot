import React, { useState } from 'react'

import PricingPlansSection from "@/components/profile/account-tabs/subscriptions/PricingPlansSection";
import CompareFeatures from "@/components/profile/account-tabs/subscriptions/CompareFeatures";

export default function PricingPage() {
  const [period, setPeriod] = useState<'monthly'|'annually'>('monthly')

  return (
    <div className="space-y-16 dark:bg-[#0D0D0D] text-white p-8">
      {/* Header & Toggle */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold mb-3">Get membership right now</h1>
        <div className="inline-flex bg-default-100 rounded-full p-1">
          {['monthly','annually'].map(p => (
            <button
              key={p}
              className={`
                px-4 py-1 rounded-full text-[14px]
                ${period===p ? 'bg-white text-black' : 'text-gray-400'}
              `}
              onClick={()=>setPeriod(p as any)}
            >
              {p[0].toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[url(/images/profile/sub-bg.png)] bg-center bg-cover">
        {/* Plans */}
        <PricingPlansSection />

        {/* Compare Features */}
        <CompareFeatures />
      </div>

    </div>
  )
}
