import PreLaunchLogoSection from "@/components/pre-launch/layouts/partials/PreLaunchLogoSection";

export default function PreLaunchHeader() {
    return (
        <header className="h-[64px] w-full grid grid-cols-3 items-center sticky top-0 px-2 lg:px-4 z-50">
            <PreLaunchLogoSection />
        </header>
    )
}
