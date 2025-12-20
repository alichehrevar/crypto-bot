// components/RoiChartCard.tsx
import React from "react";

type RoiChartCardProps = {
    /** ROI as decimal, e.g. 0.317 for 31.7% */
    roi: number;
    /** Interval used in the backtest, e.g. "1h", "5m" */
    backtestInterval: string;
    /** ISO string from API: createdAt */
    createdAt: string;
    /** Raw <svg> string from DB (backtest.fullBalanceSketch) */
    svg: string;
    /** Number of days covered by the sketch (default: 7) */
    periodDays?: number;
};

const RoiChartCard: React.FC<RoiChartCardProps> = ({
   roi,
   backtestInterval,
   createdAt,
   svg,
   periodDays = 7,
}) => {
    const isPositive = roi >= 0;
    const roiPercent = roi * 100;

    // --- X axis labels: last `periodDays` days ending at createdAt ---
    const dateLabels = React.useMemo(() => {
        const end = new Date(createdAt);

        // Normalize to midnight to avoid TZ weirdness
        end.setHours(0, 0, 0, 0);

        const labels: string[] = [];

        for (let i = periodDays - 1; i >= 0; i--) {
            const d = new Date(end);

            d.setDate(end.getDate() - i);
            labels.push(
                d.toLocaleDateString(undefined, {
                    month: "short", // e.g. "Nov"
                    day: "numeric", // e.g. "19"
                })
            );
        }

        return labels;
    }, [createdAt, periodDays]);

    // Static Y axis values (you can tune these later)
    const yTicks = [0, 25, 50, 75, 100];

    return (
        <div className="w-full rounded-2xl bg-[#0a0a0a] border border-zinc-800 p-4 shadow-md backdrop-blur">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                        ROI (Backtest)
                    </span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-slate-50">
                          {roiPercent.toFixed(1)}%
                        </span>
                        <span
                            className={
                                "rounded-full px-2 py-0.5 text-xs font-medium " +
                                (isPositive
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400")
                            }
                        >
                            {isPositive ? "Profitable" : "Loss"}
                        </span>
                    </div>
                    <span className="text-xs text-slate-400">
                        {periodDays}d · {backtestInterval} backtest
                    </span>
                </div>

                {/* Small badge with symbol / label if you want later */}
            </div>

            {/* Chart area */}
            <div className="flex gap-2">
                {/* Y axis */}
                <div className="flex flex-col justify-between py-1 text-[10px] text-slate-500">
                    {yTicks
                        .slice() // copy
                        .reverse()
                        .map((v) => (
                            <div key={v} className="flex items-center gap-1">
                                <span>{v}</span>
                                <span className="h-px flex-1 bg-[#0a0a0a]" />
                            </div>
                        ))}
                </div>

                {/* SVG chart */}
                <div className="relative flex-1 overflow-hidden rounded-xl bg-[#0a0a0a] px-2 py-1">
                    {/* SVG from DB */}
                    <div
                        // SVG string straight from MongoDB (fullBalanceSketch)
                        dangerouslySetInnerHTML={{ __html: svg }}
                        className="w-full"
                    />
                </div>
            </div>

            {/* X axis */}
            <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                {dateLabels.map((label) => (
                    <span key={label} className="flex-1 text-center">
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default RoiChartCard;
