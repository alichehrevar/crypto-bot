'use client'

import AcademyGettingStarted from "@/components/academy/AcademyGettingStarted";

export default function AcademyPage() {
    return (
        <div className="container px-2 lg:px-4 mx-auto mt-4">
            <div className="grid grid-cols-1 w-full">
                <AcademyGettingStarted />
            </div>
        </div>
    )
}
