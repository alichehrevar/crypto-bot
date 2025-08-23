'use client';

import React, {useState, useEffect} from 'react';
import {Swiper, SwiperSlide} from "swiper/react";
import {Navigation, Pagination} from "swiper/modules";

import {AdvancedTopicIcons} from "@/utils/TopicIcons";
import LessonCard from "@/components/academy/LessonCard";

// --- Type Definitions ---
interface Lesson {
    title: string;
    duration: string;
    description: string;
    iconId: keyof typeof AdvancedTopicIcons;
}

// --- Main Component ---
export default function AcademyAdvanced() {

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const lessons: Lesson[] = [
        { title: "Signal Engines", duration: "3:45", description: "RSI, MACD, Moving averages, Bollinger bands.", iconId: "signal" },
        { title: "Custom Precision", duration: "5:20", description: "Introducing custom strategies, using AI.", iconId: "precision" },
        { title: "Dynamic Strategies", duration: "4:55", description: "Leveraging dynamic use of indicators.", iconId: "dynamic" },
        { title: "Optimization Methods", duration: "6:10", description: "Grid vs. Bayesian vs. Genetic.", iconId: "optimization" },
        { title: "Regime Detection", duration: "3:30", description: "Trend, Mean-Reversion, Chop, and Hurst.", iconId: "regime" },
        { title: "Community Bots", duration: "2:50", description: "Ready-to-use smart bots, Community bots.", iconId: "community" },
        { title: "Capstone Project", duration: "7:40", description: "Optimize, Validate, and Launch a Pro Technical Bot.", iconId: "capstone" },
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
                <h2 className="text-3xl font-bold">Advanced Bot Configuration & Optimization</h2>
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
