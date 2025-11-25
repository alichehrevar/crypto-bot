import Image from "next/image";
import React, { useState } from "react";

import DynamicModal from "@/components/pre-launch/shared/ui/DynamicModal";
import AvatarCard from "@/components/pre-launch/shared/ui/AvatarCard";
import QuantumLeadDetails from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/QuantumLeadDetails";
import { ApiJob } from "@/types/preLaunch/TopROI";

/**
 * The API delivers the full SVG as string.
 * This component injects the SVG from DB dynamically.
 */
const DynamicSketch = ({ svg }: { svg: string }) => {
    return (
        <div
            dangerouslySetInnerHTML={{ __html: svg }}
            className="w-[150px] h-[50px] overflow-hidden"
        />
    );
};

interface QuantumLeadCardProps {
    data: ApiJob;
}

const QuantumLeadCard = ({ data }: QuantumLeadCardProps) => {
    const [isOpen, setIsOpen] = useState(false);

    // ROI formatting
    const roiDecimal = parseFloat(data.backtest.roi || "0");
    const roiPercent = (roiDecimal * 100).toFixed(2); // "0.0835" -> "8.35"

    // Colors
    const roiColor = roiDecimal >= 0 ? "#59CF73" : "#F87171";

    // For details modal — we will update this later
    const handleOpen = () => setIsOpen(true);

    return (
        <>
            <button
                className="w-full rounded-2xl bg-[#121212] p-6 text-white border-1 border-[#262626] hover:border-[#C4C4C4] transition-all duration-300 cursor-pointer group"
                type="button"
                onClick={handleOpen}
            >
                {/* Header */}
                <AvatarCard
                    description={`by ${data.owner?.userId || "andromeda"}`}
                    image="/images/pre-launch/demo/user-1.jpg"
                    name={data.input.backtestSymbol || "Strategy"}
                />

                <hr className="my-5 border-[#262626]" />

                {/* ROI + Chart */}
                <div className="flex items-center justify-between">
                    <div className="text-left">
                        <span className="text-sm font-medium text-[#C4C4C4]">7D ROI</span>
                        <p
                            className="text-3xl font-bold"
                            style={{ color: roiColor }}
                        >
                            {roiDecimal >= 0 ? "+" : ""}
                            {roiPercent}%
                        </p>
                    </div>

                    <div>
                        {/* Injected chart from MongoDB */}
                        {data.backtest.fullBalanceSketch ? (
                            <DynamicSketch svg={data.backtest.fullBalanceSketch} />
                        ) : (
                            <div className="text-xs text-[#666]">No chart</div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-5 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-[#C4C4C4]">7D Equity</span>
                        <span className="font-medium text-white">
                            {/* Temporary fallback until API provides this */}
                            {data.backtest.pnl ? `$${data.backtest.pnl}` : "—"}
                        </span>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span className="text-[#C4C4C4]">Total trades</span>
                        <span className="font-medium text-white">
                            {data.backtest.debug?.totalTrades ?? "—"}
                        </span>
                    </div>
                </div>

                <hr className="my-5 border-[#262626]" />

                {/* Token logos — these can also be dynamic based on symbol */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[#C4C4C4]">Token</span>

                    <div className="flex -space-x-2">
                        <div className="relative w-[24px] border-1 border-black rounded-full aspect-square">
                            <Image
                                fill
                                alt="token"
                                className="object-cover"
                                src={`/images/pre-launch/demo/${data.input.backtestSymbol.toLowerCase().split("usdt")[0]}.svg`}
                            />
                        </div>
                        <div className="relative w-[24px] border-1 border-black rounded-full aspect-square">
                            <Image
                                fill
                                alt="coin"
                                className="object-cover"
                                src="/images/pre-launch/demo/usdt.svg"
                            />
                        </div>
                    </div>
                </div>

                {/* Button */}
                <div
                    className="mt-6 w-full rounded-full bg-[#F2F3F71A] py-3.5 text-base font-semibold text-white transition-colors duration-300 group-hover:bg-[#F2F3F72A]"
                >
                    View details
                </div>
            </button>

            {/* Dynamic Modal */}
            <DynamicModal
                actionLabel="Save Changes"
                direction="right"
                isOpen={isOpen}
                position="fixed"
                showFooter={false}
                size="lg"
                onAction={() => setTimeout(() => setIsOpen(false), 200)}
                onClose={() => setIsOpen(false)}
            >
                <QuantumLeadDetails job={data} />
            </DynamicModal>
        </>
    );
};

export default QuantumLeadCard;
