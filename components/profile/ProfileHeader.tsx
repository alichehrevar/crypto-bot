'use client'

import { Avatar, Badge } from "@heroui/react";

import { ThemeSwitch } from "@/components/shared/ThemeSwitch";

export default function ProfileHeader() {
  return (
    <div className="flex items-center justify-end w-full h-[68px] border-b-1 dark:border-gray-900 light:border-gray-50 px-4 py-3 gap-4 sticky top-0 z-50 bg-white dark:bg-black shadow-md">
      <ThemeSwitch />
      <div className="flex items-center justify-center px-4 border-r-1 border-l-1 border-gray-400">
        <Badge className="cursor-pointer" color="danger" content={<span className="text-[8px]">5</span>} shape="circle" size="sm">
          <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" strokeLinecap="round"
                  strokeLinejoin="round" />
          </svg>
        </Badge>
      </div>
      <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
        <span className="text-[13px]">
          Portfolio Balance
        </span>
        <span className="dark:text-white text-black font-semibold text-[14px]">
          $ 623,098.17
        </span>
      </div>
      <div className="flex items-start justify-center flex-col gap-1 text-gray-400">
        <span className="text-[13px]">
          Available Funds
        </span>
        <span className="dark:text-white text-black font-semibold text-[14px]">
          $ 122,912.50
        </span>
      </div>
      <Avatar isBordered className="w-[40px] h-[40px] hover:border-white" src="https://i.pravatar.cc/150?u=a04258a2462d826712d" />
    </div>
  )
}
