'use client';

import React, {useState, useEffect} from 'react';
import {Swiper, SwiperSlide} from "swiper/react";
import {Navigation, Pagination} from "swiper/modules";

import LessonCard from "@/components/academy/LessonCard";
import {Lesson} from "@/types/LessonCard";


// --- Main Component ---
export default function AcademySection(props: {title: string, section: 'get-started' | 'advanced' | 'dca-grid', lessons: Lesson[]}) {

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
            <div className="pl-2 mb-8 mt-4">
                <h2 className="text-3xl font-bold">{props.title}</h2>
            </div>
            <div className="relative">
                {isClient ? (
                    <Swiper
                        className="today-bots-swiper academy-swiper w-full"
                        effect={'slide'}
                        grabCursor={true}
                        modules={[Pagination, Navigation]}
                        navigation={true}
                        pagination={pagination}
                        slidesPerView={'auto'}
                    >
                        {props.lessons.map((lesson, index) => (
                            <SwiperSlide key={index}>
                                <LessonCard lesson={lesson} section={props.section} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                ) : (
                    <div className="flex overflow-hidden gap-6">
                        {props.lessons.slice(0, 4).map((_, index) => (
                            <div key={index} className="w-72 h-[220px] bg-dark-gray rounded-xl flex-shrink-0 animate-pulse" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
