// components/shared/TopCreators.tsx
import React from 'react'
import Image from 'next/image'
import {Navigation, Pagination} from "swiper/modules"
import {Swiper, SwiperSlide} from "swiper/react"

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export interface Creator {
    id: string
    name: string
    avatarUrl: string
    isFollowing?: boolean
}

export default function TopCreators() {
    const pagination = {
        clickable: true,
        dynamicBullets: true,
        renderBullet: (index: number, className: string) =>
            `<span class="${className}"></span>`,
    }

    // Generate 20 dummy creators
    const sampleCreators: Creator[] = Array.from({length: 20}, (_, i) => ({
        id: String(i + 1),
        name: `Creator ${i + 1}`,
        avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
        isFollowing: Math.random() < 0.3, // ~30% chance already following
    }))

    return (
        <section className="px-4 py-6 bg-dark-gray rounded-xl">
            <h2 className="text-white text-2xl font-semibold mb-4">
                Top creators
            </h2>
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
                {sampleCreators.map((c) => (
                    <SwiperSlide key={c.id}>
                        <div className="flex items-center gap-3 w-[200px] h-[60px]">
                            {/* Avatar with double ring */}
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 rounded-full ring-4 ring-gray-800"/>
                                <div className="absolute inset-1 rounded-full ring-2 ring-gray-600"/>
                                <Image
                                    fill
                                    alt={c.name}
                                    className="rounded-full object-cover"
                                    src={c.avatarUrl}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                {/* Name */}
                                <span className="text-white text-sm font-medium">
                                    {c.name}
                                </span>

                                {/* Follow button */}
                                <button
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-200
                                          ${c.isFollowing
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-600 text-white hover:bg-gray-500'}
                                    `}
                                >
                                    {c.isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    )
}
