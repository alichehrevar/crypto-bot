'use client';

import React from 'react';
import Image from 'next/image';

import {AdjustmentsVerticalIcon, SearchIcon, WavyArrowIcon} from "@/utils/icons";

// --- MAIN HEADER COMPONENT ---

export default function AcademyHeader() {
    return (
        <div className="w-full flex flex-col items-center text-center py-12 md:py-8">
            {/* Main Title and Subtitle */}
            <h1 className="text-4xl md:text-5xl font-bold text-white">Trading Academy</h1>
            <p className="text-lg text-gray-400 mt-2">Learn, Trade, Succeed</p>

            {/* Search Bar */}
            <div className="relative mt-8 w-full max-w-lg">
                <SearchIcon className="absolute left-4 top-[15px] text-gray-500" />
                <input
                    className="w-full bg-[#2d2d2d] text-white placeholder-gray-500 border border-gray-700 rounded-full py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Search cours"
                    type="text"
                />
                <AdjustmentsVerticalIcon className="absolute right-4 top-[15px] text-gray-500" />
            </div>

            {/* CTA Banner */}
            <div className="relative w-full mt-12 p-6 md:py-4 md:px-8 bg-gradient-to-r from-[#c2d1ff] to-[#d9c6ff] rounded-3xl overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Left Side: Avatar and Info */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                            <Image alt="Alexim" className="w-20 h-20 rounded-full border-4 border-white" height={20} src="https://i.pravatar.cc/150?u=alexim" width={20} />
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-semibold px-2 py-0.5 rounded-full">
                                Alexim
                            </span>
                        </div>
                        <div className="text-left text-black">
                            <h3 className="font-bold text-xl">Unlock Your Path to Trading Success!</h3>
                            <p className="text-sm opacity-70 mt-1">Discover how DesignGuru simplifies your creative process</p>
                            <div className="flex items-center gap-1 mt-2">
                                <span className="font-bold text-2xl bg-white text-black w-[40px] text-center py-0.5 rounded-md">03</span>
                                <span className="font-bold text-2xl bg-white text-black w-[40px] text-center py-0.5 rounded-md">01</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Arrow and Button */}
                    <div className="flex items-center gap-4">
                        <WavyArrowIcon className="hidden md:block size-20" />
                        <button className="bg-black text-white font-semibold py-3 px-8 rounded-xl hover:bg-gray-800 transition-colors">
                            Join
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
