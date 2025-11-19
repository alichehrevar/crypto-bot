import React from "react";

const QuantumLeadCardLoading = () => {
    return (
        <div className="w-full rounded-2xl bg-[#121212] p-6 border border-[#262626] animate-pulse">
            {/* Header: Avatar + Text */}
            <div className="flex items-center gap-3">
                {/* Avatar Circle */}
                <div className="h-10 w-10 shrink-0 rounded-full bg-[#262626]" />

                {/* Name and Desc */}
                <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 bg-[#262626] rounded" />
                    <div className="h-3 w-20 bg-[#262626] rounded" />
                </div>
            </div>

            <hr className="my-5 border-[#262626]" />

            {/* ROI + Chart */}
            <div className="flex items-center justify-between">
                <div>
                    {/* Label */}
                    <div className="h-3 w-12 bg-[#262626] rounded mb-2" />
                    {/* Big ROI Number */}
                    <div className="h-8 w-24 bg-[#262626] rounded" />
                </div>

                {/* Chart Placeholder - matches w-[150px] h-[50px] */}
                <div className="w-[150px] h-[50px] bg-[#262626] rounded" />
            </div>

            {/* Stats */}
            <div className="mt-5 space-y-3">
                <div className="flex justify-between">
                    <div className="h-3 w-16 bg-[#262626] rounded" />
                    <div className="h-3 w-10 bg-[#262626] rounded" />
                </div>

                <div className="flex justify-between">
                    <div className="h-3 w-20 bg-[#262626] rounded" />
                    <div className="h-3 w-8 bg-[#262626] rounded" />
                </div>
            </div>

            <hr className="my-5 border-[#262626]" />

            {/* Token Logos */}
            <div className="flex items-center justify-between">
                <div className="h-3 w-10 bg-[#262626] rounded" />

                <div className="flex -space-x-2">
                    {/* Circle 1 with border matching bg to simulate mask */}
                    <div className="h-6 w-6 rounded-full bg-[#262626] border border-[#121212]" />
                    {/* Circle 2 */}
                    <div className="h-6 w-6 rounded-full bg-[#262626] border border-[#121212]" />
                </div>
            </div>

            {/* Button */}
            <div className="mt-6 w-full rounded-full bg-[#262626] h-[52px]" />
        </div>
    );
};

export default QuantumLeadCardLoading;
