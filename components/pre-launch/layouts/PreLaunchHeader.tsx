import PreLaunchLogoSection from "@/components/pre-launch/layouts/partials/PreLaunchLogoSection";
import PreLaunchHeaderMenus from "@/components/pre-launch/layouts/partials/PreLaunchHeaderMenus";
import PrelaunchHeaderCTA from "@/components/pre-launch/layouts/partials/PrelaunchHeaderCTA";

export default function PreLaunchHeader() {
    return (
        <header className="h-[64px] w-full grid grid-cols-2 lg:grid-cols-3 items-center sticky top-0 px-4 lg:px-8 z-50 bg-black">
            <PreLaunchLogoSection className="w-[36px] lg:w-[190px]" responsive={true} />
            <PreLaunchHeaderMenus className="hidden lg:flex" />
            <PrelaunchHeaderCTA />
        </header>
    )
}
