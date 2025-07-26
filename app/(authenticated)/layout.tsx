import React from "react";

import TopMenu from "@/components/profile/TopMenu";

export default function ProfileLayout ({
 children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-screen overflow-x-hidden">
      <div className="flex items-center justify-center flex-col w-full">
        <div className="hidden lg:flex lg:w-full relative">
          <TopMenu />
        </div>
        <div className="flex w-full">
          <div className="flex items-start justify-start h-screen w-full flex-col gap-4 relative">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
