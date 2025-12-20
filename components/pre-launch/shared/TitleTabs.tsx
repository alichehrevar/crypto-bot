import React from "react";
import {motion} from "framer-motion";

export default function TitleTabs ({tabs, type, setType}: {tabs: string[], type: string, setType: (type: 'Algos' | 'Live Arena') => void}) {
    return (
        <div className="flex items-center justify-between w-full mb-6">
            <h2 className="text-xl font-semibold">Lead traders</h2>
            <div className="inline-flex items-center gap-2 border border-[#F2F3F799] rounded-xl p-0.5 h-[40px]">
                {tabs.map(p => (
                    <motion.button
                        key={p}
                        className={`relative px-4 h-8 rounded-lg text-[14px] ${
                            type === p ? 'text-white' : 'text-[#C4C4C4]'
                        }`}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                        onClick={() => setType(p as any)}
                    >
                        {type === p && (
                            <motion.div
                                className="absolute inset-0 bg-[#F2F3F733] rounded-lg cursor-pointer"
                                layoutId="active-pill"
                                style={{ zIndex: 0 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                        )}

                        <span className="relative z-10 cursor-pointer">
                            {p[0].toUpperCase() + p.slice(1)}
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    )
}
