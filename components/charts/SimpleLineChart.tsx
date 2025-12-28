// components/charts/SimpleLineChart.tsx
interface SimpleLineChartProps {
    data: Array<{ d: number; v: number }>
    color?: string
}

export function SimpleLineChart({ data, color = '#ffffff' }: SimpleLineChartProps) {
    if (!data || data.length === 0) return null

    const maxVal = Math.max(...data.map((d) => d.v))
    const minVal = Math.min(...data.map((d) => d.v))
    const range = maxVal - minVal || 1

    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - ((d.v - minVal) / range) * 80 - 10
            return `${x},${y}`
        })
        .join(' ')

    const fillPoints = `0,100 ${points} 100,100`

    return (
        <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible pointer-events-none"
        >
            <defs>
                <linearGradient
                    id={`chartGradient-${color.replace('#', '')}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                >
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            <polyline points={fillPoints} fill={`url(#chartGradient-${color.replace('#', '')})`} />

            <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                points={points}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
