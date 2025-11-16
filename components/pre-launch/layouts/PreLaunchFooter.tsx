import JoinCommunity from "@/components/pre-launch/layouts/partials/JoinCommunity";
import PreLaunchLogoSection from "@/components/pre-launch/layouts/partials/PreLaunchLogoSection";
import PreLaunchFooterMenus from "@/components/pre-launch/layouts/partials/PreLaunchFooterMenus";
import PreLaunchFooterSocialsSection from "@/components/pre-launch/layouts/partials/PreLaunchFooterSocialsSection";
import PrelaunchCopyright from "@/components/pre-launch/layouts/partials/PrelaunchCopyright";

export default function PreLaunchFooter() {
    return (
        <section className="flex items-center justify-center flex-col gap-4 w-full">
            <JoinCommunity />
            <footer className="flex items-center justify-center flex-col gap-5 w-full my-12">
                <PreLaunchLogoSection />
                <PreLaunchFooterMenus />
                <PreLaunchFooterSocialsSection />
            </footer>
            <PrelaunchCopyright />
        </section>
    )
}
