'use client'

import AcademyHeader from "@/components/academy/AcademyHeader";
import AcademyGettingStarted from "@/components/academy/AcademyGettingStarted";
import AcademyAdvanced from "@/components/academy/AcademyAdvanced";
import AcademyDcaGrid from "@/components/academy/AcademyDcaGrid";

export default function AcademyPage() {
    return (
        <div className="container px-2 lg:px-4 mx-auto mt-4">
            <div className="flex flex-col items-center w-full gap-8">
                <AcademyHeader />
                <AcademyGettingStarted />
                <AcademyAdvanced />
                <AcademyDcaGrid />
            </div>
        </div>
    )
}
