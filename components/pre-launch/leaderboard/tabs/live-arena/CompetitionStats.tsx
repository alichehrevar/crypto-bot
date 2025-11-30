import React from 'react';
import Image from "next/image";

interface Leader {
    name: string;
    avatarUrl: string;
}

interface CompetitionStatsProps {
    endDate: string; // e.g., "Nov 15, 2025 • 23:59 UTC"
    daysRemaining: number;
    leader: Leader;
    className?: string;
}

const CompetitionStatsBar: React.FC<CompetitionStatsProps> = ({
      endDate,
      daysRemaining,
      leader,
      className = "",
}) => {
    return (
        <div className={`w-full mx-auto ${className}`}>
            {/* Main Container */}
            <div className="bg-[#121212] border border-[#4A4A4A] rounded-2xl p-4 md:py-5 md:px-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-0">

                    {/* Section 1: Competition Ends */}
                    <div className="flex-1 flex flex-row lg:flex-col items-center justify-between lg:justify-center text-center">
                        <span className="text-zinc-500 text-sm font-medium mb-1">
                            Competition ends
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-100 font-semibold text-sm lg:text-lg tracking-tight">
                                {endDate}
                            </span>
                        </div>
                    </div>

                    {/* Divider 1 (Hidden on mobile) */}
                    <div className="hidden md:block w-px h-12 bg-zinc-800 mx-4" />

                    {/* Section 2: Days Remaining */}
                    <div className="flex-1 flex flex-row lg:flex-col items-center justify-between lg:justify-center text-center">
                        <span className="text-zinc-500 text-sm font-medium mb-1">
                            Days remaining
                        </span>
                        <span className="text-zinc-100 font-semibold text-sm lg:text-lg tracking-tight">
                            {daysRemaining} days
                        </span>
                    </div>

                    {/* Divider 2 (Hidden on mobile) */}
                    <div className="hidden md:block w-px h-12 bg-zinc-800 mx-4" />

                    {/* Section 3: Leader */}
                    <div className="flex-1 flex flex-row lg:flex-col items-center justify-between lg:justify-center text-center">
                        <span className="text-zinc-500 text-sm font-medium mb-1">
                            Leader
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="relative w-6 h-6">
                                <Image
                                    fill
                                    alt={leader.name}
                                    className="w-6 h-6 rounded-full ring-2 ring-zinc-800 object-cover"
                                    src={leader.avatarUrl}
                                />
                            </div>
                            <span className="text-zinc-100 font-semibold text-sm lg:text-lg tracking-tight">
                                {leader.name}
                            </span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- Example Usage Component ---

export default function CompetitionStats() {
    const mockData = {
        endDate: "Nov 15, 2025 • 23:59 UTC",
        daysRemaining: 5,
        leader: {
            name: "Quantum99",
            avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80"
        }
    };

    return (
        <CompetitionStatsBar
            daysRemaining={mockData.daysRemaining}
            endDate={mockData.endDate}
            leader={mockData.leader}
        />
    );
}
