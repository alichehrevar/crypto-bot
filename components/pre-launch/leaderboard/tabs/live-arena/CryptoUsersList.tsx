import React from 'react';
import { ChevronRight } from 'lucide-react';
import Image from "next/image";

// --- Types ---
interface TraderData {
    rank: number;
    username: string;
    roi: number;
    avatarUrl: string;
}

// --- Mock Data ---
const MOCK_TRADERS: TraderData[] = Array(6).fill(null).map((_, index) => ({
    rank: index + 1,
    username: "Quantum99",
    roi: 23.14,
    avatarUrl: `https://i.pravatar.cc/150?u=quantum${index}`, // Using dynamic placeholder avatars
}));

// --- Sub-Component: Trader Card ---
const TraderCard: React.FC<{ trader: TraderData }> = ({ trader }) => {
    return (
        <div className="group relative flex items-center p-4 bg-[#121212] border border-[#4A4A4A] rounded-2xl hover:bg-[#1a1a1a] hover:border-white/20 transition-all duration-200 cursor-pointer">
            {/* Rank */}
            <div className="w-8 flex-shrink-0 text-white font-bold text-lg">
                #{trader.rank}
            </div>

            {/* Avatar */}
            <div className="relative mx-3 flex-shrink-0">
                <div className="w-12 h-12 relative rounded-full overflow-hidden border border-white/10 group-hover:border-white/30 transition-colors">
                    <Image
                        fill
                        alt={trader.username}
                        className="w-full h-full object-cover"
                        src={trader.avatarUrl}
                    />
                </div>
            </div>

            {/* Info Section */}
            <div className="flex flex-col flex-grow">
                <span className="text-white font-semibold text-base">
                    {trader.username}
                </span>
                <div className="text-sm font-medium text-gray-400 mt-0.5">
                    ROI: <span className="text-emerald-400 ml-1">+{trader.roi}%</span>
                </div>
            </div>

            {/* Chevron Icon */}
            <div className="flex-shrink-0 text-white/50 group-hover:text-white transition-colors">
                <ChevronRight size={20} />
            </div>
        </div>
    );
};

// --- Main Component ---
const CryptoUsersList: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_TRADERS.map((trader) => (
                <TraderCard key={trader.rank} trader={trader} />
            ))}
        </div>
    );
};

export default CryptoUsersList;
