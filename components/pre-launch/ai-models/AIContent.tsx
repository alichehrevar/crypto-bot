'use client'

import React, {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";

import TitleTabs from "@/components/pre-launch/shared/TitleTabs";
import AILeaderboardContent from "@/components/pre-launch/ai-models/LeaderboardContent";
import LiveArenaContent from "@/components/pre-launch/leaderboard/tabs/live-arena/LiveArenaContent";

const formVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
};

export default function AIContent () {

    const [type, setType] = useState<'Algos' | 'Live Arena'>('Algos')

    return (
        <div className="bg-[#0D0D0D] w-full my-16 py-16">
            <div className="container pre-launch-container mx-auto px-2 md:px-3 lg:px-4">
                <TitleTabs
                    setType={setType}
                    tabs={['Algos', 'Live Arena']}
                    type={type}
                />
                {type === 'Algos' && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="step1"
                            animate="visible"
                            className="space-y-5"
                            exit="exit"
                            initial="hidden"
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            variants={formVariants}
                        >
                            <AILeaderboardContent />
                        </motion.div>
                    </AnimatePresence>
                )}

                {type === 'Live Arena' && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="step2"
                            animate="visible"
                            className="space-y-5"
                            exit="exit"
                            initial="hidden"
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            variants={formVariants}
                        >
                            <LiveArenaContent />
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
