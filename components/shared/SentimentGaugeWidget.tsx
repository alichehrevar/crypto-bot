'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import {addToast} from "@heroui/react";

import {getData} from "@/actions/get";
import {SentimentResponse} from "@/types/market/Sentiment";
import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";

// =====================================================================
// Fear & Greed Gauge — Next.js + Tailwind (self-contained widget)
// - Drop into /components as SentimentGaugeWidget.tsx
// - Tailwind-only styling (no external CSS)
// - SVG semicircle gauge with smooth animation
// - Small, reusable subcomponents: InfoButton, CardHeader, SentimentGauge
// =====================================================================

// -----------------------------
// Helpers
// -----------------------------
function clamp(n: number, min = 0, max = 100) {
    return Math.max(min, Math.min(max, n))
}

function scoreMeta(score: number) {
    // Thresholds and colors mirror the original widget logic
    if (score < 25) return { label: 'Extreme Fear', color: '#F44336' } // red
    if (score < 45) return { label: 'Fear', color: '#FF5722' } // orange
    if (score > 75) return { label: 'Extreme Greed', color: '#4CAF50' } // green
    if (score > 55) return { label: 'Greed', color: '#8BC34A' } // light green

    return { label: 'Neutral', color: '#9E9E9E' } // grey
}

// -----------------------------
// UI Subcomponents
// -----------------------------
function InfoButton({ title, content }: { title: string; content: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!ref.current) return
            if (!ref.current.contains(e.target as Node)) setOpen(false)
        }

        if (open) document.addEventListener('mousedown', onDoc)

        return () => document.removeEventListener('mousedown', onDoc)
    }, [open])

    return (
        <div ref={ref} className="relative inline-flex items-center">
            <button
                aria-expanded={open}
                aria-label="More info"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-500/70 text-[10px] italic font-semibold text-neutral-400 transition-colors hover:border-neutral-300 hover:text-white"
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
                        children,
                    }: {
    title: string
    infoTitle: string
    infoContent: string
    children?: React.ReactNode
}) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h3 className="m-0 text-base font-semibold text-white">{title}</h3>
                <InfoButton content={infoContent} title={infoTitle} />
            </div>
            {children}
        </div>
    )
}

function SentimentGauge({ score }: { score: number }) {
    const radius = 100
    const circumference = Math.PI * radius // half circle length
    const gradId = useId()

    const n = clamp(score)
    const visual = n === 0 ? 1 : n // keep a sliver visible at 0
    const offset = circumference * (1 - visual / 100)
    const { label, color } = scoreMeta(n)

    return (
        <div className="flex flex-1 items-center justify-center">
            <svg className="block" height="140" viewBox="0 0 240 140" width="240">
                <defs>
                    <linearGradient id={`gaugeGradient-${gradId}`} x1="0%" x2="100%" y1="0%" y2="0%">
                        <stop offset="0%" stopColor="#F44336" />
                        <stop offset="50%" stopColor="#FFC107" />
                        <stop offset="100%" stopColor="#4CAF50" />
                    </linearGradient>
                </defs>

                {/* Background arc */}
                <path
                    d="M 20 120 A 100 100 0 0 1 220 120"
                    fill="none"
                    stroke="#333"
                    strokeLinecap="round"
                    strokeWidth="18"
                />

                {/* Foreground arc (animated) */}
                <path
                    d="M 20 120 A 100 100 0 0 1 220 120"
                    fill="none"
                    stroke={`url(#gaugeGradient-${gradId})`}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    strokeWidth="18"
                    style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                />

                {/* Score */}
                <text fontSize="32" fontWeight="700" style={{ fill: color }} textAnchor="middle" x="120" y="95">
                    {n}
                </text>

                {/* Label */}
                <text fontSize="16" fontWeight="600" style={{ fill: color }} textAnchor="middle" x="120" y="125">
                    {label}
                </text>
            </svg>
        </div>
    )
}

// -----------------------------
// Main Export
// -----------------------------
export default function SentimentGaugeWidget() {

    const [score, setScore] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const infoTitle = 'Fear & Greed Index'
    const infoContent =
        'This gauge aggregates factors like volatility, momentum, and social activity to approximate market sentiment. Extreme readings can hint at potential mean reversion.'

    async function fetchSentimentScore () {
        return await getData('/sentiment');
    }

    useEffect(() => {
        fetchSentimentScore()
            .then((response: SentimentResponse) => {
                if (response.success) {
                    setScore(response.data.score);
                } else {
                    addToast({
                        title: response.error || 'Error fetching sentiment data !',
                        color: 'warning'
                    })
                }
            })
            .catch((error) => {
                addToast({
                    title: error.message,
                    color: 'danger'
                })
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, []);

    return (
        <div className="w-full rounded-lg bg-dark-gray p-4 shadow-sm h-full ua-card">
            <CardHeader infoContent={infoContent} infoTitle={infoTitle} title="Fear & Greed Index" />
            <div className="flex h-full flex-col">
                {isLoading
                    ? <LoadingWithSpinner />
                    : <SentimentGauge score={score || 0} />
                }
            </div>
        </div>
    )
}
