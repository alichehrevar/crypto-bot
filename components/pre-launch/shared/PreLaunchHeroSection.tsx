import React from 'react';
import Image from 'next/image';
import Link from "next/link";

/**
 * A hero section component replicating the provided design.
 * Uses Tailwind CSS for styling.
 */
const PreLaunchHeroSection: React.FC = () => {
    // Placeholder data for the avatars
    const avatars = [
        {
            src: '/images/pre-launch/demo/user-1.jpg',
            alt: 'User 1',
        },
        {
            src: '/images/pre-launch/demo/user-2.jpg',
            alt: 'User 2',
        },
        {
            src: '/images/pre-launch/demo/user-1.jpg',
            alt: 'User 3',
        },
        {
            src: '/images/pre-launch/demo/user-2.jpg',
            alt: 'User 4',
        },
    ];

    return (
        <section className="bg-black text-white flex items-center justify-center">
            <div className="container mx-auto px-6 text-center flex flex-col items-center">
                {/* Main Heading */}
                <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                    The Apex of Algorithmic Trading
                </h1>

                {/* Subheading */}
                <p className=" text-[#C4C4C4] max-w-2xl mb-10 leading-7">
                    Discover the top trading algorithms built by our community.
                    Analyze their performance, get inspired, and join the next wave of
                    innovators redefining automated trading.
                </p>

                {/* Social Proof Section */}
                <div className="flex flex-row items-center gap-4 mb-12">
                    {/* Overlapping Avatars */}
                    <div className="flex -space-x-3">
                        {avatars.map((avatar, index) => (
                            <div key={index} className="w-12 h-12 relative">
                                <Image
                                    fill
                                    alt={avatar.alt}
                                    className="w-12 h-12 rounded-full border-4 border-black object-cover"
                                    src={avatar.src}
                                />
                            </div>
                        ))}
                    </div>
                    {/* Trust Text */}
                    <p className="text-sm text-gray-400 border-l-1 pl-4 py-1 border-[#757575]">
                        Trusted by <span className="font-bold text-white">2000+</span> traders
                    </p>
                </div>

                {/* Call to Action (CTA) Button */}
                <Link
                    className="bg-white text-black font-semibold py-3 px-8 rounded-full transition-all duration-300
                     hover:bg-gray-200 hover:scale-105 focus:outline-none focus:ring-2
                     focus:ring-white focus:ring-opacity-50"
                    href="/join-algos"
                >
                    Submit your algorithm
                </Link>
            </div>
        </section>
    );
};

export default PreLaunchHeroSection;
