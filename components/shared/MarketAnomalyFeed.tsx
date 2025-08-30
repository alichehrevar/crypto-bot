'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// =====================================================================
// MarketAnomalyFeed (Next + Tailwind)
// - Self-contained: uses internal mock data; parent passes nothing
// - Styles are fully Tailwind-based (no external CSS)
// - Smooth enter/exit animations via Framer Motion
// - Small, composable subcomponents (InfoButton, CardHeader, AnomalyIcon)
// =====================================================================

// -----------------------------
// Types
// -----------------------------
export type Severity = 'High' | 'Medium' | 'Low'
export type AnomalyType = 'Volume' | 'Funding' | 'On-Chain' | 'OI' | 'Price' | (string & {})

export interface Anomaly {
    id: string | number
    type: AnomalyType
    asset?: string
    detail: string
    time: string
    severity: Severity
}

// -----------------------------
// Helpers
// -----------------------------
function severityClasses(sev: Severity): string {
    switch (sev) {
        case 'High':
            return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25'
        case 'Medium':
            return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
        case 'Low':
        default:
            return 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/25'
    }
}

// -----------------------------
// UI Subcomponents
// -----------------------------
function InfoButton({ title, content }: { title: string; content: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!ref.current) return
            if (!ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', onDocClick)

        return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])

    return (
        <div ref={ref} className="relative inline-flex items-center">
            <button
                aria-expanded={open}
                aria-label="More info"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-500/70 text-[10px] italic font-semibold text-neutral-400 hover:text-white hover:border-neutral-400"
                type="button"
                onClick={() => setOpen((s) => !s)}
            >
                i
            </button>
            {open && (
                <div className="absolute left-0 top-[140%] z-50 w-72 rounded-lg border border-white/10 bg-neutral-800/90 p-3 text-sm shadow-xl backdrop-blur-md">
                    <h4 className="mb-1 font-semibold text-white">{title}</h4>
                    <p className="leading-5 text-neutral-300">{content}</p>
                </div>
            )}
        </div>
    )
}

function CardHeader({
                        title,
                        infoTitle,
                        infoContent,
                    }: {
    title: string
    infoTitle: string
    infoContent: string
}) {
    return (
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h3 className="m-0 text-base font-semibold text-white">{title}</h3>
                <InfoButton content={infoContent} title={infoTitle} />
            </div>
        </div>
    )
}

function AnomalyIcon({ type }: { type: AnomalyType }) {
    const paths: Record<string, React.ReactNode> = {
        Volume: (
            <>
                <path
                    d="M11 5L6 9H2V15H6L11 19V5Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
                <path
                    d="M15.5 8.5a5 5 0 0 1 0 7"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
                <path
                    d="M18.5 5.5a9 9 0 0 1 0 13"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
            </>
        ),
        Funding: (
            <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        ),
        'On-Chain': (
            <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        ),
        OI: (
            <>
                <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
                <circle cx="12" cy="12" fill="currentColor" r="3" />
            </>
        ),
        Price: (
            <path
                d="M22 12h-4l-3 9L9 3l-3 9H2"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        ),
    }

    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            {paths[type] ?? paths['Volume']}
        </svg>
    )
}

// -----------------------------
// Main Component (self-contained)
// -----------------------------
export default function MarketAnomalyFeed() {
    const title = 'Real-time Anomaly Feed'

    // Mock data lives inside the component — parent passes nothing
    const MOCK_ANOMALIES: Anomaly[] = [
        {
            id: 1,
            type: 'Volume',
            asset: 'RNDR',
            detail: 'RNDR spot volume is 4.2× above 24h average on Binance.',
            time: '2m ago',
            severity: 'High',
        },
        {
            id: 2,
            type: 'Funding',
            asset: 'ETH',
            detail: 'ETH perp funding flipped negative across major venues.',
            time: '7m ago',
            severity: 'Medium',
        },
        {
            id: 3,
            type: 'OI',
            asset: 'BTC',
            detail: 'BTC open interest jumped +18% in the last 30 minutes.',
            time: '12m ago',
            severity: 'High',
        },
        {
            id: 4,
            type: 'On-Chain',
            asset: 'USDT',
            detail: 'USDT treasury transfer of 120M to a known exchange wallet.',
            time: '18m ago',
            severity: 'Medium',
        },
        {
            id: 5,
            type: 'Price',
            asset: 'SOL',
            detail: 'SOL printed a −3.5% 1‑min wick; spreads widened notably.',
            time: '24m ago',
            severity: 'High',
        },
        {
            id: 6,
            type: 'Volume',
            asset: 'AVAX',
            detail: 'AVAX futures volume diverging from spot by ~2.8×.',
            time: '31m ago',
            severity: 'Low',
        },
    ]

    const [items] = useState<Anomaly[]>(MOCK_ANOMALIES)

    const infoTitle = 'About the Anomaly Feed'
    const infoContent =
        'This feed flags market events that deviate from recent baselines. Sudden spikes in volume, funding, OI, or large on-chain transfers can hint at shifting market dynamics.'

    return (
        <div className="rounded-lg bg-dark-gray p-4">
            <CardHeader infoContent={infoContent} infoTitle={infoTitle} title={title} />

            {/* Feed List */}
            <div className="flex h-[365px] flex-col gap-3 overflow-hidden">
                <AnimatePresence initial={false}>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="overflow-hidden"
                            exit={{ height: 0, opacity: 0, scaleY: 0.97 }}
                            initial={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${severityClasses(
                                    item.severity
                                )}`}>
                                    <AnomalyIcon type={item.type} />
                                </div>

                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm text-neutral-200">{item.detail}</span>
                                    <span className="mt-0.5 text-xs text-neutral-500">{item.time}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {items.length === 0 && (
                    <div className="py-8 text-center text-sm text-neutral-500">
                        No significant market anomalies detected right now.
                    </div>
                )}
            </div>
        </div>
    )
}
