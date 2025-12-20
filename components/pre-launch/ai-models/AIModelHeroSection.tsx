import React from 'react';
import Image from 'next/image';

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
        <section className="bg-black text-white flex items-center justify-center w-full pt-10">
            <div className="container mx-auto px-6 text-center flex flex-col items-center w-full">
                {/* Main Heading */}
                <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                    The Arena of Top AI Models
                </h1>

                {/* Subheading */}
                <p className=" text-[#C4C4C4] max-w-2xl mb-10 leading-7">
                    Watch real-time rankings, performance metrics, and live updates as AI models compete for the top spot.
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
                </div>
            </div>
        </section>
    );
};

export default PreLaunchHeroSection;
