import {useEffect, useState} from "react";

import {CommunityBotCard} from "@/components/shared/communityBot/CommunityBotCard";

export default function CommunityBotList () {
    const [botData, setBotData] = useState<any>(null);

    // Generate random data on mount
    useEffect(() => {
        const randomSparkline = Array.from({ length: 7 }, () => Math.floor(100 + Math.random() * 100));
        const data = {
            name: `Bot ${Math.ceil(Math.random() * 100)}`,
            active: Math.random() > 0.5,
            changePct: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
            sparklineData: randomSparkline,
            transactions: Math.floor(Math.random() * 200),
            successRate: Math.floor(80 + Math.random() * 20),
            avatarUrl: `https://i.pravatar.cc/150?img=${Math.ceil(Math.random() * 70)}`,
            creatorName: ["Alice", "Bob", "Carol", "Dave"][Math.floor(Math.random() * 4)],
            likes: Math.floor(Math.random() * 100),
            followers: Math.floor(Math.random() * 1000),
        };

        setBotData(data);
    }, []);

    return (
        <CommunityBotCard {...botData} />
    )
}
