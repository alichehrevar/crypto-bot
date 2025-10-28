import React, {useState} from 'react'

import PricingPlansSection from "@/components/profile/account-tabs/subscriptions/PricingPlansSection";
import CompareFeatures from "@/components/profile/account-tabs/subscriptions/CompareFeatures";

export default function PricingPage() {
    const [type, setType] = useState<'non-professional' | 'professional'>('non-professional')
    const [period, setPeriod] = useState<'monthly' | 'annually'>('monthly')

    return (
        <div className="space-y-16 text-white py-8 max-w-5xl">
            {/* Header & Toggle */}
            <div className="text-center space-y-4">
                <div className="inline-flex gap-2 border border-gray-600 rounded-xl p-1 mb-10">
                    {['non-professional', 'professional'].map(p => (
                        <button
                            key={p}
                            className={`px-4 py-1 rounded-lg text-[14px] ${type === p ? 'border border-white' : 'text-gray-400'}`}
                            onClick={() => setType(p as any)}
                        >
                            {p[0].toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
                <h1 className="block text-3xl font-bold pb-5">Get membership right now</h1>
                <div className="inline-flex gap-2 border border-gray-600 rounded-xl p-1 mt-5">
                    {['monthly', 'annually'].map(p => (
                        <button
                            key={p}
                            className={`px-4 py-1 rounded-lg text-[14px] ${period === p ? 'border border-white' : 'text-gray-400'}`}
                            onClick={() => setPeriod(p as any)}
                        >
                            {p[0].toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative z-0">
                {/* Plans */}
                <PricingPlansSection/>

                {/* Compare Features */}
                <CompareFeatures/>
            </div>

        </div>
    )
}
