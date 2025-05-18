import React from 'react'
import { CheckIcon } from '@heroui/shared-icons'

const plans = [
  { key: 'Basic', limit: '10/day' },
  { key: 'Standard', limit: '20/day' },
  { key: 'Premium', limit: '40/day' },
  { key: 'Expert', limit: '50/day' },
  { key: 'Ultimate', limit: '100/day' },
]

const features: { label: string; values: (string | boolean)[] }[] = [
  { label: 'Bot limit', values: plans.map(p => p.limit) },
  { label: 'Community access', values: [true, true, true, true, true] },
  { label: 'DCA bots',        values: [true, true, true, true, true] },
  { label: 'Grid bots',       values: [true, true, true, true, true] },
  { label: 'Advanced DCA bot',values: [true, true, true, true, true] },
  { label: 'Advanced Grid bot',values:[true, true, true, true, true] },
  { label: 'Strategy testing',values: [true, true, true, true, true] },
  { label: 'Technical bots',  values: ['30/month','30/month','30/month','30/month','30/month'] },
  { label: 'Strategy optimization', values: [true, true, true, true, true] },
  { label: 'Grid optimizations',      values: [true, true, true, true, true] },
  { label: 'Gaussian optimizations',  values: [false,false,true, true, true] },
  { label: 'Machine learning algorithms', values: [false,false,false,true, true] },
  { label: 'Creators club',           values: [false,false,true, true, true] },
  { label: 'AI-supercharged bots',    values: ['Standard','Standard','Standard','VIP 1','VIP 2'] },
  { label: 'Support',                 values: [false,false,false,true, true] },
  { label: 'Live stream',             values: [false,false,false,true, true] },
  { label: 'Video sharing',           values: [false,false,false,true, true] },
  { label: 'Creators reward program', values: [false,false,false,true, true] },
  { label: 'TradingView strategy integration', values: [true, true, true, true, true] },
  { label: 'Manual trading',          values: [false,false,false,true, true] },
  { label: 'Strategy lab',            values: [true, true, true, true, true] },
  { label: 'Custom indicators',       values: [false,false,false,true, true] },
  { label: 'Creators dashboard',      values: [false,false,false,true, true] },
  { label: 'Smart settings',          values: [false,false,false,true, true] },
  { label: 'Early access to research bots', values: [false,false,false,true, true] },
  { label: 'Code editor',             values: [false,false,false,true, true] },
  { label: 'Bots sharing',            values: [false,false,false,true, true] },
]

export default function CompareFeatures() {
  return (
    <section className="mt-16">
      <h2 className="text-white text-2xl font-semibold mb-6">Compare Features</h2>

      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden">
        <div
          className="
            grid
            grid-cols-[1.5fr_repeat(5,1fr)]
          "
        >
          {/* header row */}
          <div className="px-4 py-5">
            <span className="text-white text-xs uppercase tracking-wide">Plan</span>
          </div>
          {plans.map(plan => (
            <div
              key={plan.key}
              className="px-4 py-5 text-white text-lg font-semibold text-center border-b border-gray-600"
            >
              {plan.key}
            </div>
          ))}

          {/* feature rows */}
          {features.map(row => (
            <React.Fragment key={row.label}>
              {/* feature label */}
              <div className="px-4 py-4 border-b border-gray-700">
                <span className="text-gray-400 text-sm">{row.label}</span>
              </div>
              {/* feature values */}
              {row.values.map((val, i) => (
                <div
                  key={i}
                  className="px-4 py-4 text-white text-base text-center border-b border-gray-700"
                >
                  {typeof val === 'boolean'
                    ? val
                      ? <CheckIcon className="w-5 h-5 mx-auto text-green-400" />
                      : '—'
                    : <span className="whitespace-nowrap">{val}</span>
                  }
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}
