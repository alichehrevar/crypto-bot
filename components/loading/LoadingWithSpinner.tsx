import React from "react";
import {Spinner} from "@heroui/react";

export default function LoadingWithSpinner () {
    return (
        <div className="flex items-center justify-center flex-row-reverse gap-3 h-56 w-full">
            <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
            Loading Data…
        </div>
    )
}
