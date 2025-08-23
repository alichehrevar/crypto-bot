'use client';

import React, {useEffect, useState} from 'react';
import { Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

// Assuming LessonCard and its dependencies are in this file or imported correctly
import LessonCard, { Lesson } from "@/components/academy/LessonCard";

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';


// --- Main Component ---
export default function AcademyGettingStarted() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const lessons: Lesson[] = [
        { title: "Welcome to United Algos", duration: "3:45", iconId: "welcome" },
        { title: "What is Algorithmic trading?", duration: "5:30", iconId: "algo" },
        { title: "How to Backtest a strategy", duration: "14:00", iconId: "backtest" },
        { title: "How to connect your broker", duration: "12:15", iconId: "broker" },
        { title: "What is Creators Hub", duration: "7:50", iconId: "creators" },
        { title: "Advanced Technical Config", duration: "16:30", iconId: "config" },
        { title: "Utilizing the AI Engine", duration: "22:00", iconId: "ai" },
    ];

    const pagination = {
        clickable: true,
        el: '.swiper-pagination',
        bulletActiveClass: 'swiper-pagination-bullet-active',
        bulletClass: 'swiper-pagination-bullet',
    };

    return (
        <div className="w-full">
            <div className="pl-4 mb-4">
                <h2 className="text-3xl font-bold">Getting Started</h2>
            </div>
            <div className="relative">
                {isClient ? (
                    <Swiper
                        className="today-bots-swiper academy-swiper"
                        effect={'slide'}
                        grabCursor={true}
                        modules={[Pagination, Navigation]}
                        navigation={true}
                        pagination={pagination}
                        slidesPerView={'auto'}
                    >
                        {lessons.map((lesson, index) => (
                            <SwiperSlide key={index}>
                                <LessonCard lesson={lesson} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                ) : (
                    <div className="flex overflow-hidden gap-6">
                        {lessons.slice(0, 4).map((_, index) => (
                            <div key={index} className="w-72 h-[220px] bg-dark-gray rounded-xl flex-shrink-0 animate-pulse" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
