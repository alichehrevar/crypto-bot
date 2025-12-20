import Image from "next/image";
import React from "react";

import { ABOUT_CONTENT } from '@/constants/about';
import JoinCommunity from "@/components/pre-launch/layouts/partials/JoinCommunity";

export default function AboutPage () {

    const { hero, about, testimonial } = ABOUT_CONTENT;

    const renderHeadline = () => {
        const parts = hero.headline.split(hero.highlightedText);

        return (
            <h1 className="text-3xl font-bold text-white">
                {parts[0]}
                <span className="bg-linear-to-r from-[#B9F641] to-[#CCF777] bg-clip-text text-transparent">
                    {hero.highlightedText}
                </span>
                {parts[1]}
            </h1>
        );
    };

    return (
        <section className="bg-black text-gray-300 py-12 px-6 w-full">
            <div className="flex flex-col items-center justify-center gap-3 mb-7">
                <div className="relative w-20 aspect-square bg-white rounded-3xl">
                    <Image fill alt="united-algos" className="object-contain p-2" src="/images/logos/logo-black.png" />
                </div>
                <p className="text-[#CBCBCB]">We’re United Algos</p>
            </div>
            {/* Hero Headline */}
            <div className="text-center max-w-4xl mx-auto mb-16">
                {renderHeadline()}
            </div>

            {/* Story Section */}
            <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-semibold text-white text-center mb-8">
                    {about.title}
                </h2>

                <div className="space-y-6 leading-relaxed">
                    {about.paragraphs.map((paragraph, index) => (
                        <p key={index} className="text-justify">
                            {paragraph}
                        </p>
                    ))}
                </div>

                <div className="relative bg-[#262626] mt-20 rounded-2xl p-12 lg:p-16">
                    <Image alt="quate" className="absolute -top-4 left-3 rotate-180" height={60} src="/images/icons/quate.png" width={42} />
                    <p className="font-semibold text-xl leading-relaxed">{testimonial.paragraph}</p>
                    <div className="flex items-center justify-start gap-2 mt-6">
                        <small className="text-white">{testimonial.author}</small>
                        <small>|</small>
                        <small className="text-[#C4C4C4]">{testimonial.specialization}</small>
                    </div>
                    <Image alt="quate" className="absolute -bottom-4 right-3" height={60} src="/images/icons/quate.png" width={42} />
                </div>
            </div>
            <JoinCommunity className="mb-10 mt-32 mx-auto" />
        </section>
    )
}
