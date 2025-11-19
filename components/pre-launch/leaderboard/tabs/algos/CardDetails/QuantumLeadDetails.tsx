import React from 'react';

import AvatarCard from "@/components/pre-launch/shared/ui/AvatarCard";
import OverviewCard from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/OverviewCard";
import PerformanceCard from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/PerformanceCard";
import TradingStrategy from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/TradingStrategy";
import RoiChartCard from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/RoiChartCard";
import {ApiJob} from "@/types/preLaunch/TopROI";

// Types for our data props to make the component reusable
export interface OverviewData {
    amu: string;
    marginBalance: string;
    sharpeRatio: string;
    totalTrades: string;
}

export interface PerformanceData {
    roi: string;
    pnl: string;
    maxDrawdown: string;
    sharpeRatio: string;
    winRate: string;
    winningTrades: number;
    losingTrades: number;
}

interface QuantumLeadDetailsProps {
    job: ApiJob
}

const QuantumLeadDetails = ({job}: QuantumLeadDetailsProps) => {
    // Mock data matching the screenshot
    const overviewData: OverviewData = {
        amu: "59,066.60",
        marginBalance: "215",
        sharpeRatio: "215",
        totalTrades: "215",
    };

    const performanceData: PerformanceData = {
        roi: "+25.34%",
        pnl: "+22,526.24",
        maxDrawdown: "59,066.60",
        sharpeRatio: "215",
        winRate: "215",
        winningTrades: 17,
        losingTrades: 5,
    };

    return (
        <div className="bg-black text-white flex flex-col items-center justify-center">
            <div className="w-full space-y-4">
                <AvatarCard
                    description="by andromeda"
                    image="/images/pre-launch/demo/user-1.jpg"
                    name="QuantumLead"
                />
                <OverviewCard data={overviewData}/>
                <PerformanceCard data={performanceData}/>
                <RoiChartCard
                    backtestInterval={job.input.backtestInterval}
                    createdAt={job.createdAt}
                    periodDays={7}
                    roi={parseFloat(job.backtest.roi)}
                    svg={job.backtest.fullBalanceSketch}
                />
                <TradingStrategy/>
            </div>
        </div>
    );
};

export default QuantumLeadDetails;
