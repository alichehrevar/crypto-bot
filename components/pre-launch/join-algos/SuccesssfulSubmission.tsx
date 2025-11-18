import React from "react";
import {ArrowRight} from "@/utils/icons";
import Link from "next/link";

export default function SuccessfulSubmission ({backToFirst}: {backToFirst: () => void}) {
    return (
        <div className="flex items-center justify-center flex-col gap-3">
            <div className="bg-[#B9F641] flex items-center justify-center w-[72px] h-[72px] rounded-full">
                <svg
                    className="w-11 h-11 text-white stroke-2 transition-all duration-200 opacity-100 scale-100"
                    fill="none"
                    stroke="#242424"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                >
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <h3 className="block text-[#030303] font-semibold text-2xl text-center mt-6">
                Your algos submitted successfully!
            </h3>
            <p className="text-[#606060] text-sm text-center leading-6">
                Thank you, John! your algorithm has been submitted for evaluation. You’ll receive updates at <span className="text-[#262626]">j.doe@gmail.com</span>.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8">
                <Link
                    className="flex items-center justify-center gap-2 border-1 border-[#030303] text-[#030303] rounded-3xl w-full h-[48px] text-sm px-4"
                    href="/"
                >
                    Back to home
                </Link>
                <button
                    className="flex items-center justify-center gap-2 bg-[#030303] text-white rounded-3xl w-full h-[48px] text-sm text-nowrap px-4"
                    type="button"
                    onClick={backToFirst}
                >
                    <span>Submit another algos</span>
                </button>
            </div>
        </div>
    )
}
