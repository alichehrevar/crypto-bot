import React, { FC } from 'react';

import MarketPulse from "@/components/shared/MarketPulse";
import FearAndGreedGauge from "@/components/shared/charts/FearAndGreedGauge";


// --- COMPONENT ---
const TechnicalAnalysis: FC = () => {

    // --- RENDER ---
    return (
        <div className="p-2 pt-0 w-full h-[96%] overflow-y-auto relative no-scrollbar">
            <FearAndGreedGauge />

            <MarketPulse className="mt-6" />
        </div>
    );
};

export default TechnicalAnalysis;
