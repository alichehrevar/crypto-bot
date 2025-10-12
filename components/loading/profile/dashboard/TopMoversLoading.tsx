import React from "react";
import { Skeleton } from "@heroui/react";

export default function TopMoversBarLoading() {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-4 items-end h-72 mt-6">
      {Array.from({ length: 5 }).map((_, index) => {
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            {/* percentage */}
            <Skeleton className="w-1/5 rounded-lg">
              <div className="h-3 w-1/5 rounded-lg bg-default-200" />
            </Skeleton>

            {/* bar */}
            <Skeleton className="w-1/5 rounded-lg mt-2">
              <div className="h-48 w-1/5 rounded-lg bg-default-300" />
            </Skeleton>

            {/* icon */}
            <Skeleton className="h-[24px] w-[24px] rounded-full">
              <div className="block h-[24px] w-[24px] rounded-full bg-default-300" />
            </Skeleton>

            {/* symbol (just the base asset) */}
            <Skeleton className="w-1/5 rounded-lg">
              <div className="h-2.5 w-1/5 rounded-lg bg-default-300" />
            </Skeleton>
          </div>
        )
      })}
    </div>
  )
}
