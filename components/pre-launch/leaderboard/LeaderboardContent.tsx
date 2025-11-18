'use client'

import React, {useState} from "react";
import {motion} from "framer-motion";

import LeaderboardAlgosTab from "@/components/pre-launch/leaderboard/tabs/algos/LeaderboardAlgosTab";

export default function LeaderboardContent () {

    const [type, setType] = useState<'Algos' | 'Live arena'>('Algos')

    return (
        <div className="bg-[#0D0D0D] w-full my-16 py-16">
            <div className="container pre-launch-container mx-auto px-2 md:px-3 lg:px-4">
                <div className="flex items-center justify-between w-full mb-6">
                    <h2 className="text-xl font-semibold">Lead traders</h2>
                    <div className="inline-flex items-center gap-2 border border-[#F2F3F799] rounded-xl p-0.5 h-[40px]">
                        {['Algos', 'Live Arena'].map(p => (
                            <motion.button
                                key={p}
                                className={`relative px-4 h-[32px] rounded-lg text-[14px] ${
                                    type === p ? 'text-white' : 'text-[#C4C4C4]'
                                }`}
                                style={{ WebkitTapHighlightColor: "transparent" }}
                                onClick={() => setType(p as any)}
                            >
                                {type === p && (
                                    <motion.div
                                        className="absolute inset-0 bg-[#F2F3F733] rounded-lg"
                                        layoutId="active-pill"
                                        style={{ zIndex: 0 }}
                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    />
                                )}

                                <span className="relative z-10">
                                    {p[0].toUpperCase() + p.slice(1)}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </div>
                {type === 'Algos' && <LeaderboardAlgosTab />}
            </div>
        </div>
    )
}
