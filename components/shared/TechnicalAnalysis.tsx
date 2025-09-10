import React, { FC } from 'react';

import MarketPulse from "@/components/shared/MarketPulse";
import FearAndGreedGauge from "@/components/shared/charts/FearAndGreedGauge";


// --- COMPONENT ---
const TechnicalAnalysis: FC = () => {

    // --- RENDER ---
    return (
        <div className="bg-dark-gray rounded-lg p-6 w-full h-full overflow-y-auto relative">
            <FearAndGreedGauge />

            <MarketPulse className="mt-6" />
        </div>
    );
};

export default TechnicalAnalysis;
