import PreLaunchHeroSection from "@/components/pre-launch/shared/PreLaunchHeroSection";
import QuantumLeadCard from "@/components/pre-launch/leaderboard/QuantumLeadCard";

export default function PreLunchPage () {
    return  (
        <>
            <PreLaunchHeroSection />
            <div className="bg-[#0D0D0D] w-full my-16 py-16">
                <div className="container mx-auto px-2 md:px-3 lg:px-4">
                    <div className="grid grid-cols-3 gap-6">
                        {[...Array(21)].map((_, index) => (
                            <QuantumLeadCard key={index} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
