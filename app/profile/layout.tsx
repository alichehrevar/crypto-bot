import React from "react";

import SideBar from "@/components/profile/SideBar";
import ProfileHeader from "@/components/profile/ProfileHeader";

export default function ProfileLayout ({
 children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-screen h-screen">
      <div className="flex items-center justify-center w-full">
        <div className="flex w-1/6 self-stretch">
          <SideBar />
        </div>
        <div className="flex w-5/6 self-stretch overflow-y-auto scrollbar-hide">
          <div className="flex items-start justify-start h-screen w-full flex-col gap-4 relative">
            <ProfileHeader />
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
