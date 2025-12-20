import React from "react";

import CardWrapper from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/CardWrapper";
import StatRow from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/StatRow";
import {OverviewData} from "@/components/pre-launch/leaderboard/tabs/algos/CardDetails/QuantumLeadDetails";

const OverviewCard = ({ data }: { data: OverviewData }) => {
    return (
        <CardWrapper>
            <h2 className="text-lg font-bold text-white mb-4">Overview</h2>
            <div className="space-y-1">
                <StatRow label="AMU (USDT)" value={data.amu} />
                <StatRow label="Account margin balance" value={data.marginBalance} />
                <StatRow label="Profit Sharpe ratio" value={data.sharpeRatio} />
                <StatRow label="Total trades" value={data.totalTrades} />
            </div>
        </CardWrapper>
    );
};

export default OverviewCard;
