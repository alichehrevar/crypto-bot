import CryptoNews from "@/components/CryptoNews";

export default function NewsPage() {
    return (
        <section className="container no-scrollbar flex-1 h-screen overflow-y-hidden w-full px-2 lg:px-4 mx-auto">
            <CryptoNews />
        </section>
    )
}
