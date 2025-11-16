import Image from "next/image";
import Link from "next/link";

export default function PreLaunchLogoSection({className = 'w-[190px]'}: {className?: string}) {
    return (
        <Link className={`relative aspect-[191/40] ${className}`} href="/">
            <Image fill alt={process.env.NAME || 'United Algos'} className="aspect-[191/40]" src="/images/logos/logotype-white-light.png" />
        </Link>
    )
}
