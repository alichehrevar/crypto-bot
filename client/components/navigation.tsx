import Link from "next/link";

export default function Navigation() {
    return (
        <nav className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <Link href="/" className="font-mono text-xl font-bold">
                        TradingX
                    </Link>
                    <div className="space-x-6">
                        <Link href="/bots" className="hover:text-blue-600 transition-colors">
                            Bots
                        </Link>
                        <Link href="/bots/select" className="hover:text-blue-600 transition-colors">
                            Select Currency/Timeframe
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
