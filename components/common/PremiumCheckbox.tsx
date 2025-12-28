// components/common/PremiumCheckbox.tsx
'use client'

import { Check } from 'lucide-react'

interface PremiumCheckboxProps {
    label: string
    checked: boolean
    onChange: () => void
    colorClass?: string
}

export function PremiumCheckbox({ label, checked, onChange, colorClass = 'bg-white' }: PremiumCheckboxProps) {
    return (
        <div
            onClick={onChange}
            className="flex items-center gap-2 cursor-pointer group select-none"
        >
            <div
                className={`w-3 h-3 border border-zinc-700 flex items-center justify-center transition-all ${
                    checked ? `${colorClass} border-transparent` : 'bg-transparent group-hover:border-zinc-500'
                }`}
            >
                {checked && <Check size={10} className="text-black" strokeWidth={3} />}
            </div>
            <span
                className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    checked ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
                }`}
            >
        {label}
      </span>
        </div>
    )
}
