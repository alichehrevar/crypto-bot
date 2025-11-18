import Link from "next/link";

export default function PrelaunchHeaderCTA() {
    return (
        <div className="flex items-center justify-end gap-3">
            <Link className="border border-[#979797] hover:bg-[#F2F3F726] transition-all duration-300 font-semibold rounded-3xl text-sm hidden lg:flex items-center justify-center w-[119px] h-[40px]" href="/">
                Join waitlist
            </Link>
            <Link className="bg-[#B9F641] hover:bg-[#90DB07] text-[#030303] font-semibold transition-all duration-300 rounded-3xl text-sm flex items-center justify-center w-[119px] h-[40px]" href="/join-algos">
                Submit Algos
            </Link>
        </div>
    )
}
