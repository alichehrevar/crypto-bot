'use client'

import AcademyHeader from "@/components/academy/AcademyHeader";
import AcademySection from "@/components/academy/AcademySection";
import {Lesson} from "@/types/LessonCard";

const items = [
    {
        title: 'Getting Started',
        section: 'get-started',
        lessons: [
            { title: "Inside the AI Engine", description: "Understanding the core mechanics of the AI.", iconId: "insideAI", duration: "4:15" },
            { title: "Prompt-to-Strategy", description: "Creating trading strategies using natural language.", iconId: "promptToStrategy", duration: "5:30" },
            { title: "Your Favorite AI As Strategy", description: "Integrating popular AI models into your trading.", iconId: "favoriteAI", duration: "6:02" },
            { title: "Guardrails that Matter", description: "Implementing safety constraints and risk management.", iconId: "guardrails", duration: "3:55" },
            { title: "Human-in-the-Loop", description: "Combining AI automation with human oversight.", iconId: "humanInTheLoop", duration: "4:48" },
        ]
    },
    {
        title: 'Advanced Bot Configuration & Optimization',
        section: 'advanced',
        lessons: [
            { title: "Signal Engines", duration: "3:45", description: "RSI, MACD, Moving averages, Bollinger bands.", iconId: "signal" },
            { title: "Custom Precision", duration: "5:20", description: "Introducing custom strategies, using AI.", iconId: "precision" },
            { title: "Dynamic Strategies", duration: "4:55", description: "Leveraging dynamic use of indicators.", iconId: "dynamic" },
            { title: "Optimization Methods", duration: "6:10", description: "Grid vs. Bayesian vs. Genetic.", iconId: "optimization" },
            { title: "Regime Detection", duration: "3:30", description: "Trend, Mean-Reversion, Chop, and Hurst.", iconId: "regime" },
            { title: "Community Bots", duration: "2:50", description: "Ready-to-use smart bots, Community bots.", iconId: "community" },
            { title: "Capstone Project", duration: "7:40", description: "Optimize, Validate, and Launch a Pro Technical Bot.", iconId: "capstone" },
        ]
    },
    {
        title: 'Mastering DCA and Grid Bots',
        section: 'dca-grid',
        lessons: [
            { title: "Dollar-Cost-Averaging (DCA)", duration: "3:45", description: "Mastering the strategy of regular investments.", iconId: "dca" },
            { title: "Grid Bots Deep Dive", duration: "5:20", description: "Understanding and configuring grid trading bots.", iconId: "grid" },
            { title: "Capital Allocation", duration: "4:55", description: "Strategically dividing funds across strategies.", iconId: "allocation" },
            { title: "Entries that Work", duration: "6:10", description: "Identifying high-probability entry points.", iconId: "entries" },
            { title: "Taking Profit", duration: "3:30", description: "Securing gains with effective exit strategies.", iconId: "takeprofit" },
            { title: "Volatility Filters", duration: "2:50", description: "Adapting bots to different market volatility conditions.", iconId: "volatility" },
        ]
    },
    {
        title: 'Utilizing the AI Engine for Custom Strategies',
        section: 'dca-grid',
        lessons: [
            { title: "Inside the AI Engine", description: "Understanding the core mechanics of the AI.", iconId: "insideAI", duration: "4:15" },
            { title: "Prompt-to-Strategy", description: "Creating trading strategies using natural language.", iconId: "promptToStrategy", duration: "5:30" },
            { title: "Your Favorite AI As Strategy", description: "Integrating popular AI models into your trading.", iconId: "favoriteAI", duration: "6:02" },
            { title: "Guardrails that Matter", description: "Implementing safety constraints and risk management.", iconId: "guardrails", duration: "3:55" },
            { title: "Human-in-the-Loop", description: "Combining AI automation with human oversight.", iconId: "humanInTheLoop", duration: "4:48" },
        ]
    }
] as {
    title: string;
    section: 'get-started' | 'advanced' | 'dca-grid';
    lessons: Lesson[];
}[];


export default function AcademyPage() {
    return (
        <div className="container px-2 lg:px-4 mx-auto mt-4">
            <div className="flex flex-col items-center w-full gap-8">
                <AcademyHeader />
                {items.map((section, index) => (
                    <AcademySection key={index} lessons={section.lessons} section={section.section} title={section.title} />
                ))}
            </div>
        </div>
    )
}
