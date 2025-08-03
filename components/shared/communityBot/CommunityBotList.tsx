import React, {useEffect, useState} from "react";
import {Navigation, Pagination} from "swiper/modules";
import {Swiper, SwiperSlide} from "swiper/react";

import {CommunityBotCard} from "@/components/shared/communityBot/CommunityBotCard";

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface BotData {
    name: string;
    active: boolean;
    changePct: number;
    sparklineData: number[];
    transactions: number;
    successRate: number;
    avatarUrl: string;
    creatorName: string;
    likes: number;
    followers: number;
}

export default function CommunityBotList () {
    const [bots, setBots] = useState<BotData[]>([]);

    const pagination = {
        clickable: true,
        dynamicBullets: true,
        renderBullet: function (index: number, className: string) {
            return '<span class="' + className + '"></span>';
        },
    };

    // Generate random data on mount
    useEffect(() => {
        const names = ["Alice", "Bob", "Carol", "Dave"];
        const generateOne = (): BotData => ({
            name: `Bot ${Math.ceil(Math.random() * 100)}`,
            active: Math.random() > 0.5,
            changePct: parseFloat(((Math.random() - 0.5) * 20).toFixed(2)),
            sparklineData: Array.from({ length: 7 }, () =>
                Math.floor(100 + Math.random() * 100)
            ),
            transactions: Math.floor(Math.random() * 200),
            successRate: Math.floor(80 + Math.random() * 20),
            avatarUrl: `https://i.pravatar.cc/150?img=${Math.ceil(Math.random() * 70)}`,
            creatorName: names[Math.floor(Math.random() * names.length)],
            likes: Math.floor(Math.random() * 100),
            followers: Math.floor(Math.random() * 1000),
        });

        setBots(Array.from({ length: 12 }, generateOne));
    }, []);

    return (
        <div className="shadow-xl backdrop-blur-sm mt-4">
            <h3 className="text-xl font-semibold text-white mb-6">Community Bot</h3>
            <Swiper
                centeredSlides={false}
                className="today-bots-swiper"
                grabCursor={true}
                loop={true}
                modules={[Pagination, Navigation]}
                navigation={true}
                pagination={pagination}
                slidesPerView={'auto'}
                spaceBetween={10}
            >
                {bots.map((bot, idx) => (
                    <SwiperSlide key={idx}>
                        <CommunityBotCard onChangeSettings={function (): void {
                            throw new Error("Function not implemented.");
                        }} onDeploy={function (): void {
                            throw new Error("Function not implemented.");
                        }} {...bot} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    )
}
