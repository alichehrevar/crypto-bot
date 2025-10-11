"use client";

import React, { useState } from 'react';
import Link from "next/link";

// Define the types for our step data for better type safety
interface Step {
    num: number;
    title: string;
    description: string;
}

interface Cta {
    num: number;
    text: string;
    linkText: string;
    icon: JSX.Element;
    link: string;
}

// --- SVG Icon Components ---
const LinkIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
);

const GridIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect height="7" width="7" x="3" y="3" />
        <rect height="7" width="7" x="14" y="3" />
        <rect height="7" width="7" x="14" y="14" />
        <rect height="7" width="7" x="3" y="14" />
    </svg>
);

// --- Data for Steps and CTAs ---
const stepsData: Step[] = [
    { num: 1, title: "Connect Broker", description: "Link your preferred crypto exchange." },
    { num: 2, title: "Select Strategy", description: "Browse smart bots, community bots or build your own." },
    { num: 3, title: "Deploy & Monitor", description: "Launch and track performance in real-time." },
];

const ctaData: Cta[] = [
    {
        num: 1,
        text: "Connect Now",
        linkText: "How to connect?",
        icon: <LinkIcon />,
        link: '/profile/settings?tab=connect-broker'
    },
    {
        num: 2,
        text: "Browse Bots",
        linkText: "How it works?",
        icon: <SearchIcon />,
        link: '/bots'
    },
    {
        num: 3,
        text: "Manage My Bots",
        linkText: "View Performance Guide",
        icon: <GridIcon />,
        link: '/bots'
    },
];

// --- Main Component ---
const Instructions: React.FC = () => {
    const [activeStep, setActiveStep] = useState<number>(1);

    // NOTE: In a real Next.js project, these custom colors would be defined
    // in your `tailwind.config.js` file under `theme.extend.colors` for reusability.
    // For this self-contained component, we'll use them to dynamically apply styles.
    const colors = {
        bgPrimary: '#0A0908',
        bgCard: '#1A1918',
        border: '#333333',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0A0',
        accentLime: '#9EF01A',
    };

    return (
        <div className="my-7 items-center justify-center font-sans bg-dark-gray" style={{ color: colors.textPrimary }}>
            <div className="w-full">
                <div
                    className="rounded-xl p-8 border"
                    style={{ backgroundColor: colors.bgCard, borderColor: colors.accentLime }}
                >
                    <h2 className="text-2xl font-bold mb-4 text-white">Activate Your Trading Engine</h2>
                    <p className="mb-8" style={{ color: colors.textSecondary }}>
                        Connect your exchange securely via API to deploy automated strategies and start trading.
                    </p>

                    {/* Interactive Control Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {stepsData.map((step) => (
                            <button
                                key={step.num}
                                className="flex items-center gap-4 cursor-pointer"
                                onClick={() => setActiveStep(step.num)}
                            >
                                <div
                                    className="rounded-full w-8 h-8 flex-shrink-0 flex items-center justify-center font-bold text-lg transition-all duration-300"
                                    style={{
                                        backgroundColor: activeStep === step.num ? colors.accentLime : colors.border,
                                        color: activeStep === step.num ? colors.bgPrimary : colors.textSecondary
                                    }}
                                >
                                    {step.num}
                                </div>
                                <div>
                                    <h3 className="text-white text-start font-semibold">{step.title}</h3>
                                    <p className="text-sm" style={{ color: colors.textSecondary }}>{step.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Dynamic CTA Sections */}
                    <div>
                        {ctaData.map((cta) => (
                            <div
                                key={cta.num}
                                className={`flex items-center gap-4 transition-opacity duration-300 ${activeStep === cta.num ? 'opacity-100' : 'opacity-0 hidden'}`}
                            >
                                <Link
                                    className="flex items-center justify-center gap-2 hover:opacity-90 transition-opacity duration-300 font-bold py-2 px-3 rounded-full text-sm"
                                    href={cta.link}
                                    style={{ backgroundColor: colors.textPrimary, color: colors.bgPrimary }}
                                >
                                    {cta.icon}
                                    <span>{cta.text}</span>
                                </Link>
                                <Link
                                    className="text-sm hover:text-white transition-colors"
                                    href={cta.link}
                                    style={{ color: colors.textSecondary }}
                                >
                                    {cta.linkText}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Instructions;

