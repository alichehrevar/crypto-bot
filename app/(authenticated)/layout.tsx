import React from "react";

import Sidebar from "@/components/profile/Sidebar";

export default function ProfileLayout ({
 children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-screen h-screen">
      <div className="flex items-center justify-center w-full">
        <div className="hidden lg:flex lg:w-1/6 self-stretch">
          <Sidebar />
        </div>
        <div className="flex w-5/6 self-stretch overflow-y-auto scrollbar-hide">
          <div className="flex items-start justify-start h-screen w-full flex-col gap-4 relative">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
