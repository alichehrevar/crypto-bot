import React, {useEffect, useState} from "react";

import MoversAndVolatility, {MoversData} from "@/components/shared/charts/MoversAndVolatility";
import SectorPerformanceRanking from "@/components/shared/charts/SectorPerformanceRanking";
import ComparativeSectorRotation from "@/components/shared/charts/ComparativeSectorRotation";

// =====================================================================
// --- TYPE DEFINITIONS ---
// =====================================================================
interface SectorData { performance: { sector: string; performance1D: number; }[]; }

// =====================================================================
// --- MOCK DATA GENERATION ---
// =====================================================================
const random = (min: number, max: number): number => Math.random() * (max - min) + min;
const generateMoversData = (): MoversData => {
    const assets = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XRP', 'LINK', 'RNDR', 'FET', 'AGIX', 'GALA', 'MANA', 'SAND', 'AVAX', 'NEAR', 'ATOM', 'ICP', 'FTM', 'LTC', 'BCH'];
    const data = assets.map(asset => {
        const change = random(-15, 15); const volume = random(50e6, 2e9); const avgVolume = random(100e6, 1e9);
        let currentValue = 100; const sparkline = Array.from({ length: 24 }, () => { currentValue += random(-2, 2) + (change / 25);

            return currentValue; });

        return { asset, change, volume, rVol: volume / avgVolume, sparkline };
    });

    return {
        gainers: data.filter(d => d.change >= 0).sort((a, b) => b.change - a.change).slice(0, 10),
        losers: data.filter(d => d.change < 0).sort((a, b) => a.change - b.change).slice(0, 10),
        volatilityScatter: data,
    };
};

const generateSectorsData = (): SectorData => ({ performance: ['DeFi 2.0', 'Layer 1 protocols', 'Layer 2 scaling', 'AI & big data', 'Gaming & metaverse', 'Infrastructure', 'Real world assets (RWA)'].map(sector => ({ sector, performance1D: random(-4, 8) })).sort((a, b) => b.performance1D - a.performance1D) });

// =====================================================================
// --- PAGE COMPONENT ---
// =====================================================================
export default function MomentumRotationTab() {

    const [moversData, setMoversData] = useState<MoversData | null>(null);
    const [sectorsData, setSectorsData] = useState<SectorData | null>(null);

    useEffect(() => {
        setSectorsData(generateSectorsData());
        setMoversData(generateMoversData());
    }, [])

    return (
        <>
            <MoversAndVolatility data={moversData} />
            <SectorPerformanceRanking data={sectorsData} />
            <ComparativeSectorRotation height={340} />
        </>
    )
}
