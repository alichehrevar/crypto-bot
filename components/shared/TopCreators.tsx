// components/shared/TopCreators.tsx

'use client'

import React, { useState, useEffect } from 'react'
import Marquee from "react-fast-marquee";

import TopCreatorCard, { TopCreatorCardProps } from "@/components/shared/TopCreatorCard";

export default function TopCreators() {

    const [creators, setCreators] = useState<TopCreatorCardProps[]>([])

    useEffect(() => {
        // generate only on the client, after mount
        const generated = Array.from({ length: 20 }, (_, i) => ({
            id: String(i + 1),
            name: `Creator ${i + 1}`,
            avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
            isFollowing: Math.random() < 0.3,
        }))

        setCreators(generated)
    }, [])

    return (
        <section>
            <h2 className="text-white text-xl font-bold mb-4">
                Top creators
            </h2>
            <div className="px-4 pt-4">
                <Marquee pauseOnHover={true} speed={20}>
                    {creators.map((c) => (
                        <TopCreatorCard key={c.id} {...c} onToggleFollow={() => {
                            setCreators((prev) =>
                                prev.map((x) =>
                                    x.id === c.id ? { ...x, isFollowing: !x.isFollowing } : x
                                )
                            )
                        }} />
                    ))}
                </Marquee>
            </div>
        </section>
    )
}
