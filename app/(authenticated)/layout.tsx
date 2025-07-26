import React from "react";

import Sidebar from "@/components/profile/Sidebar";
import TopMenu from "@/components/profile/TopMenu";

export default function ProfileLayout ({
 children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-screen overflow-x-hidden">
      <div className="flex items-center justify-center flex-col w-full">
        <div className="hidden lg:flex lg:w-full absolute top-0 right-0 left-0 z-10 border-b-1 dark:border-gray-900">
          <TopMenu />
        </div>
        <div className="flex w-full mt-[60px]">
          <div className="flex items-start justify-start h-screen w-full flex-col gap-4 relative">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
