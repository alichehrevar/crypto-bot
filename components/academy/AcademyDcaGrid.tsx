'use client';

import React, {useState, useEffect} from 'react';
import {Swiper, SwiperSlide} from "swiper/react";
import {Navigation, Pagination} from "swiper/modules";

import LessonCard from "@/components/academy/LessonCard";
import {Lesson} from "@/types/LessonCard";


const lessons: Lesson[] = [
    { title: "Dollar-Cost-Averaging (DCA)", duration: "3:45", description: "Mastering the strategy of regular investments.", iconId: "dca" },
    { title: "Grid Bots Deep Dive", duration: "5:20", description: "Understanding and configuring grid trading bots.", iconId: "grid" },
    { title: "Capital Allocation", duration: "4:55", description: "Strategically dividing funds across strategies.", iconId: "allocation" },
    { title: "Entries that Work", duration: "6:10", description: "Identifying high-probability entry points.", iconId: "entries" },
    { title: "Taking Profit", duration: "3:30", description: "Securing gains with effective exit strategies.", iconId: "takeprofit" },
    { title: "Volatility Filters", duration: "2:50", description: "Adapting bots to different market volatility conditions.", iconId: "volatility" },
];


// --- Main Component ---
const AcademyDcaGrid = () => {

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const pagination = {
        clickable: true,
        el: '.swiper-pagination',
        bulletActiveClass: 'swiper-pagination-bullet-active',
        bulletClass: 'swiper-pagination-bullet',
    };

    return (
        <div className="w-full">
            <div className="pl-4 mb-4">
                <h2 className="text-3xl font-bold">Tutorials</h2>
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
                                <LessonCard lesson={lesson} section="dca-grid" />
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
};

export default AcademyDcaGrid;
