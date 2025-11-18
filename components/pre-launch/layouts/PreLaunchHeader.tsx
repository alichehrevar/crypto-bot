import PreLaunchLogoSection from "@/components/pre-launch/layouts/partials/PreLaunchLogoSection";
import PreLaunchHeaderMenus from "@/components/pre-launch/layouts/partials/PreLaunchHeaderMenus";
import PrelaunchHeaderCTA from "@/components/pre-launch/layouts/partials/PrelaunchHeaderCTA";

export default function PreLaunchHeader({minimal = false} : {minimal?: boolean}) {
    return (
        <header className={`h-[64px] w-full grid ${minimal ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} items-center sticky top-0 px-4 lg:px-8 z-50 ${!minimal ? 'bg-black shadow-lg shadow-black/25' : 'bg-white'}`}>
            <PreLaunchLogoSection className="w-[190px] mx-auto lg:ml-0" displayBlackLogo={minimal} responsive={!minimal} />
            {!minimal &&
                <>
                    <PreLaunchHeaderMenus className="hidden lg:flex" />
                    <PrelaunchHeaderCTA />
                </>
            }
        </header>
    )
}
