import React from 'react'
import {CheckIcon, CloseIcon} from '@heroui/shared-icons'
import Image from "next/image";

interface Plan {
    title: string
    subtitle: string
    roi: string
    price: string
    period: string
    features: { label: string; included: boolean; detail?: string }[]
    highlight?: 'none' | 'primary' | 'badge'
    badgeText?: string
}

const plans: Plan[] = [
    {
        title: 'Essential',
        subtitle: 'For beginner traders!',
        roi: '+150%',
        price: '$29.99',
        period: '/month',
        highlight: 'none',
        features: [
            {label: '10 active bots at the same time', included: true},
            {label: 'access to DCA+ and Grid+', included: true},
            {label: 'Technical bots', included: true},
            {label: 'Machine learning algorithms', included: false},
            {label: '60 advanced strategy optimization', included: false},
            {label: '20 supercharging machine learning strategy', included: false},
        ],
    },
    {
        title: 'Plus',
        subtitle: 'For intermediate traders!',
        roi: '+350%',
        price: '$39.99',
        period: '/month',
        highlight: 'primary',
        features: [
            {label: '20 active bots at the same time', included: true},
            {label: 'access to DCA+ and Grid+', included: true},
            {label: 'Technical bots', included: true},
            {label: 'Unlimited strategy testing', included: true},
            {label: '30 advanced strategy optimization', included: true},
            {label: '20 supercharging machine learning strategy', included: false},
        ],
    },
    {
        title: 'Premium',
        subtitle: 'For advanced traders!',
        roi: '+650%',
        price: '$49.99',
        period: '/month',
        highlight: 'badge',
        badgeText: '7-day free trial',
        features: [
            {label: '40 active bots at the same time', included: true},
            {label: 'access to DCA+ and Grid+', included: true},
            {label: 'Technical bots', included: true},
            {label: 'Machine learning algorithms', included: true},
            {label: '60 advanced strategy optimization', included: true},
            {label: '20 supercharging machine learning strategy', included: true},
        ],
    },
]

export default function PricingPlansSection() {
    return (
        <section className="mt-16 px-4 relative">
            <div className="absolute z-10 inset-0">
                <Image
                    fill
                    alt="subscription background"
                    className="object-contain w-full h-auto opacity-35"
                    src="/assets/images/profile/sub-bg-2.png"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-20">
                {plans.map((plan) => (
                    <div
                        key={plan.title}
                        className={`relative rounded-lg bg-white/10 backdrop-blur-md border ${plan.highlight === 'primary' ? 'border-indigo-500' : plan.highlight === 'badge' ? 'border-yellow-300/70' : 'border-white/20' } overflow-visible flex flex-col`}
                    >
                        {/* badge */}
                        {plan.highlight === 'badge' && plan.badgeText && (
                            <div
                                className="absolute top-[-10px] right-2 z-50 bg-yellow-500 text-black text-xs font-semibold uppercase py-1 px-3 rounded-full">
                                {plan.badgeText}
                            </div>
                        )}

                        {/* header */}
                        <div className="p-8 text-center">
                            <h3 className="text-white text-xl font-bold">{plan.title}</h3>
                            <p className="text-gray-300 mt-1">{plan.subtitle}</p>
                            <p className="text-gray-300 mt-2">
                                Subscribers ROI: <span className="text-green-400">{plan.roi}</span>
                            </p>
                            <div className="mt-4 flex items-baseline justify-center">
                                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                                <span className="ml-2 text-gray-300">{plan.period}</span>
                            </div>

                            <button
                                className={`
                  mt-6 w-full py-2 rounded-full font-semibold
                  ${plan.highlight === 'primary'
                                    ? 'bg-white text-black hover:bg-gray-100'
                                    : 'border border-white text-white hover:bg-white hover:text-black'
                                }
                  transition
                `}
                            >
                                Choose Plan &rarr;
                            </button>
                        </div>

                        <div className="border-t border-gray-700 flex-1 p-6 space-y-4">
                            {plan.features.map((f, i) => (
                                <div key={i} className="flex items-start space-x-3">
                                    {f.included ? (
                                        <CheckIcon className="w-5 h-5 flex-shrink-0 text-green-400 mt-1"/>
                                    ) : (
                                        <CloseIcon className="w-5 h-5 flex-shrink-0 text-gray-500 mt-1"/>
                                    )}
                                    <span className={`text-sm ${f.included ? 'text-white' : 'text-gray-400'}`}>
                    {f.label}
                  </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
