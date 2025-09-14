'use client'

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect} from "react";

export default function Home() {

    const route = useRouter()

    useEffect(() => {
        route.replace('/dashboard')
    })

    return (
        <section className="flex flex-col items-center justify-center gap-4 py-3 px-2 lg:px-4 w-full">
            <div className="flex items-center justify-end w-full">
                <Link href="/dashboard">Dashboard</Link>
            </div>
        </section>
    );
}
