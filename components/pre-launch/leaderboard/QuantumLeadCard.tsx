import type { NextPage } from 'next';

import Image from "next/image";

const BtcIcon = () => (
    <svg
        className="h-6 w-6"
        fill="none"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="12" cy="12" fill="#F7931A" r="12" />
        <path
            d="M17.18 13.9161C16.66 14.3261 15.93 14.6161 15.11 14.7361V17.0061H13.88V15.0161C13.3 14.9361 12.75 14.8161 12.24 14.6561L12.01 14.5861L11.5 14.7861L10.59 15.1461L10.57 15.1561L10.05 15.3461L10.04 15.3561V17.0061H8.81V14.8961L8.25 14.7161L7.18 14.3561L6.91 14.2661L7.54 13.9361L7.56 13.9261L8.33 13.5661C8.61 13.4361 8.87 13.3161 9.1 13.2061C9.07 13.1761 9.04 13.1461 9.01 13.1161C8.1 12.4261 7.6 11.3661 7.6 10.1661C7.6 8.0461 9.21 6.3161 11.2 6.1361V6.0061H12.43V6.1161C12.98 6.1661 13.5 6.2761 13.97 6.4461L14.2 6.5261L14.71 6.3261L15.62 5.9661L15.64 5.9561L16.16 5.7661L16.17 5.7561V5.7061L16.18 4.0061L17.41 4.0061V5.9161L17.97 6.0961L19.04 6.4561L19.31 6.5461L18.68 6.8761L18.66 6.8861L17.89 7.2461C17.61 7.3761 17.35 7.4961 17.12 7.6061C17.15 7.6361 17.18 7.6661 17.21 7.6961C18.12 8.3861 18.62 9.4461 18.62 10.6461C18.62 12.6361 17.2 13.7961 15.49 13.9461V13.9561C16.16 13.7861 16.76 13.6261 17.18 13.9161ZM15.11 12.8061C15.91 12.3561 16.34 11.5861 16.34 10.6461C16.34 9.5461 15.82 8.6361 14.9 8.1661V13.1461C14.96 13.1361 15.03 13.1261 15.11 13.1061V12.8061ZM11.2 7.9961V12.0361C10.37 11.6661 9.88 10.9661 9.88 10.1661C9.88 9.2261 10.43 8.3861 11.2 7.9961Z"
            fill="white"
        />
    </svg>
);

const EthIcon = () => (
    <svg
        className="h-6 w-6"
        fill="none"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="12" cy="12" fill="#627EEA" r="12" />
        <path d="M12 1.45453L11.9045 3.7018L12 3.82907L12.0955 3.7018L12 1.45453Z" fill="#23292B" />
        <path d="M12 6.32726L7.90906 11.92L12 15.3636L16.0909 11.92L12 6.32726Z" fill="white" fillOpacity="0.6" />
        <path d="M12 16.4364L7.90906 12.9927L12 22.5454L16.0909 12.9927L12 16.4364Z" fill="white" />
        <path d="M12 6.32726V15.3636L16.0909 11.92L12 6.32726Z" fill="white" fillOpacity="0.6" />
        <path d="M12 16.4364V22.5454L16.0909 12.9927L12 16.4364Z" fill="white" fillOpacity="0.2" />
    </svg>
);

const UsdtIcon = () => (
    <svg
        className="h-6 w-6"
        fill="none"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="12" cy="12" fill="#26A17B" r="12" />
        <path
            d="M12.0013 16.875C14.693 16.875 16.8763 14.6917 16.8763 12C16.8763 9.30833 14.693 7.125 12.0013 7.125C9.30962 7.125 7.12628 9.30833 7.12628 12C7.12628 14.6917 9.30962 16.875 12.0013 16.875Z"
            fill="white"
        />
        <path
            d="M12.5188 13.9114H14.12V12.7538H12.5188V10.875H9.4762V12.7538H8.05127V10.0238C8.05127 9.6915 8.12752 9.4215 8.28002 9.21375C8.43252 9.006 8.65002 8.87925 8.93252 8.8335V8H13.0625V8.8335C13.345 8.87925 13.5625 9.006 13.715 9.21375C13.8675 9.4215 13.9438 9.6915 13.9438 10.0238V11.8388H14.12V10.0238C14.12 9.46875 13.9638 8.9955 13.6513 8.604C13.3388 8.2125 12.9125 7.9425 12.3725 7.80375V7H9.62252V7.80375C9.08252 7.9425 8.65627 8.2125 8.34377 8.604C8.03127 8.9955 7.87502 9.46875 7.87502 10.0238V12.9225H9.4762V15H12.5188V13.9114Z"
            fill="#26A1TBD"
        />
    </svg>
);

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
                    <BtcIcon />
                    <EthIcon />
                    <UsdtIcon />
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
