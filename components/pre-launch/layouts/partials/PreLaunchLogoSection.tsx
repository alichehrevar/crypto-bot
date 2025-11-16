import Image from "next/image";
import Link from "next/link";

export default function PreLaunchLogoSection({className = 'w-[190px]', responsive}: {className?: string, responsive: boolean}) {
    return (
        <Link className={`relative ${responsive ? 'aspect-[101/115]' : 'aspect-[191/40]'} lg:aspect-[191/40] ${className}`} href="/">
            <Image
                fill
                alt={process.env.NAME || 'United Algos'}
                className={`aspect-[191/40] object-contain ${responsive ? 'hidden lg:block' : 'block'}`}
                src="/images/logos/logotype-white-light.png"
            />
            {responsive &&
                <Image
                    fill
                    alt={process.env.NAME || 'United Algos'}
                    className="aspect-[101/115] object-contain block lg:hidden"
                    src="/images/logos/logo-white.png"
                />
            }
        </Link>
    )
}
