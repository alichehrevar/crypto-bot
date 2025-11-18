import type { NextPage } from 'next';

import Image from "next/image";

/**
 * Chart SVG Component
 * This is a close representation of the chart in the image.
 */
const ChartSvg = () => (
    <svg
        fill="none"
        height="50"
        viewBox="0 0 150 50"
        width="150"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Gradient Definition */}
        <defs>
            <linearGradient id="chartGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="35%" stopColor="#F87171" stopOpacity="0.2" />
                <stop offset="35%" stopColor="#4ADE80" stopOpacity="0.2" />
            </linearGradient>
        </defs>
        {/* Area Fill */}
        <path
            d="M5 40 C 30 40, 40 10, 50 10 C 60 10, 70 25, 95 25 C 120 25, 130 20, 145 20 V 45 H 5 Z"
            fill="url(#chartGradient)"
        />
        {/* Red Line */}
        <path
            d="M5 40 C 30 40, 40 10, 50 10"
            fill="none"
            stroke="#F87171"
            strokeWidth="2"
        />
        {/* Green Line */}
        <path
            d="M50 10 C 60 10, 70 25, 95 25 C 120 25, 130 20, 145 20"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
        />
    </svg>
);

const QuantumLeadCard: NextPage = () => {
    return (
        <div className="w-full rounded-2xl bg-[#121212] p-6 text-white border-1 border-[#262626] hover:border-[#C4C4C4] transition-all duration-300 cursor-pointer group">
            {/* Header */}
            <div className="flex items-center space-x-4">
                {/* Replaced Next.js Image with standard <img> tag */}
                <div className="w-[48px] h-[48px] relative">
                    <Image
                        fill
                        alt="Andromeda"
                        className="rounded-full object-cover"
                        src="/images/pre-launch/demo/user-1.jpg"
                    />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">QuantumLead</h2>
                    <p className="text-sm text-[#757575]">by andromeda</p>
                </div>
            </div>

            {/* Separator */}
            <hr className="my-5 border-[#262626]" />

            {/* 7D ROI & Chart */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-[#C4C4C4]">7D ROI</span>
                    <p className="text-3xl font-bold text-[#59CF73]">+8.35%</p>
                </div>
                <div>
                    {/* This SVG is a recreation of the one in the image.
                      The user-provided SVG was just a simple grey line.
                      I've used this one to match the design.
                    */}
                    <ChartSvg />
                </div>
            </div>

            {/* Stats */}
            <div className="mt-5 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-[#C4C4C4]">7D Equity</span>
                    <span className="font-medium text-white">$154,260</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-[#C4C4C4]">Total trades</span>
                    <span className="font-medium text-white">500</span>
                </div>
            </div>

            {/* Separator */}
            <hr className="my-5 border-[#262626]" />

            {/* Token */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-[#C4C4C4]">Token</span>
                <div className="flex -space-x-2">
                    {/* Using inline SVGs for the icons as requested.
                      These components are defined at the top of the file.
                    */}
                    <div className="relative w-[24px] border-1 border-black rounded-full aspect-square">
                        <Image fill alt="coin" className="object-cover" src="/images/pre-launch/demo/btc.svg" />
                    </div>
                    <div className="relative w-[24px] border-1 border-black rounded-full aspect-square">
                        <Image fill alt="coin" className="object-cover" src="/images/pre-launch/demo/dgb.svg" />
                    </div>
                    <div className="relative w-[24px] border-1 border-black rounded-full aspect-square">
                        <Image fill alt="coin" className="object-cover" src="/images/pre-launch/demo/usdt.svg" />
                    </div>
                </div>
            </div>

            {/* View Details Button */}
            <button className="mt-6 w-full rounded-full bg-[#F2F3F71A] py-3.5 text-base font-semibold text-white transition-colors duration-300 group-hover:bg-[#F2F3F72A]">
                View details
            </button>
        </div>
    );
};

export default QuantumLeadCard;
