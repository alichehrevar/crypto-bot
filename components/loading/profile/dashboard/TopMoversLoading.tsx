import React from "react";
import { Skeleton } from "@heroui/react";

export default function TopMoversBarLoading() {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-4 items-end h-40">
      {Array.from({ length: 5 }).map((_, index) => {
        return (
          <div key={index} className="flex flex-col items-center gap-2">
            {/* percentage */}
            <Skeleton className="w-3/5 rounded-lg">
              <div className="h-3 w-3/5 rounded-lg bg-default-200" />
            </Skeleton>

            {/* bar */}
            <Skeleton className="w-3/5 rounded-lg">
              <div className="h-28 w-3/5 rounded-lg bg-default-300" />
            </Skeleton>

            {/* icon */}
            <Skeleton className="w-2/5 rounded-lg">
              <div className="h-5 w-5 rounded-full bg-default-300" />
            </Skeleton>

            {/* symbol (just the base asset) */}
            <Skeleton className="w-2/5 rounded-lg">
              <div className="h-2.5 w-2/5 rounded-lg bg-default-300" />
            </Skeleton>
          </div>
        )
      })}
    </div>
  )
}
