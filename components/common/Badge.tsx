// components/common/Badge.tsx
import { ReactNode } from 'react'

interface BadgeProps {
    variant: string
    children: ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
    const styles: Record<string, string> = {
        ACTIVE: 'bg-white text-black border-white font-bold',
        RUNNING: 'bg-white text-black border-white font-bold',
        FILLED: 'text-emerald-400 border-emerald-900/50 bg-emerald-900/10',
        PRO: 'bg-white text-black font-bold border-black',
        ESSENTIAL: 'bg-zinc-900 text-zinc-300 border-zinc-700',
        BASIC: 'text-zinc-500 border-zinc-800',

        TECHNICAL: 'text-indigo-400 border-indigo-900/50 bg-indigo-900/10',
        GRID: 'text-emerald-400 border-emerald-900/50 bg-emerald-900/10',
        DCA: 'text-cyan-400 border-cyan-900/50 bg-cyan-900/10',
        CUSTOM_AI: 'text-white border-zinc-700 bg-zinc-800',

        SUSPENDED: 'text-rose-400 border-rose-900/50',
        ERROR: 'text-rose-400 border-rose-900/50',
        REJECTED: 'text-rose-400 border-rose-900/50',
        PAUSED: 'text-zinc-500 border-zinc-800',

        PAPER: 'bg-amber-900/20 text-amber-500 font-bold border-transparent',
        LIVE: 'bg-emerald-900/20 text-emerald-400 font-bold border-transparent',
        PAID: 'text-emerald-400 font-bold',
    }

    const className = styles[variant] || 'border-zinc-800 text-zinc-500'

    return (
        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border rounded-sm ${className}`}>
      {children}
    </span>
    )
}
