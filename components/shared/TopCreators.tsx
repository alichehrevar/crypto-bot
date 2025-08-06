// components/shared/TopCreators.tsx

'use client'

import React, { useState, useEffect } from 'react'
import {Navigation, Pagination} from "swiper/modules"
import {Swiper, SwiperSlide} from "swiper/react"

import TopCreatorCard, { TopCreatorCardProps } from "@/components/shared/TopCreatorCard";

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export default function TopCreators() {

    const [creators, setCreators] = useState<TopCreatorCardProps[]>([])

    const pagination = {
        clickable: true,
        dynamicBullets: true,
        renderBullet: (index: number, className: string) =>
            `<span class="${className}"></span>`,
    }

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
            <div className="px-4 pt-4 bg-dark-gray rounded-xl">
                <Swiper
                    centeredSlides={false}
                    className="today-bots-swiper top-creators-swiper h-[80px]"
                    grabCursor={true}
                    loop={true}
                    modules={[Pagination, Navigation]}
                    navigation={true}
                    pagination={pagination}
                    slidesPerView={'auto'}
                    spaceBetween={12}
                >
                    {creators.map((c) => (
                        <SwiperSlide key={c.id}>
                            <TopCreatorCard {...c} onToggleFollow={() => {
                                setCreators((prev) =>
                                    prev.map((x) =>
                                        x.id === c.id ? { ...x, isFollowing: !x.isFollowing } : x
                                    )
                                )
                            }} />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    )
}
