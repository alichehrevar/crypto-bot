import Link from "next/link";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen ">
            <main className="container mx-auto p-4">
                {children}
            </main>
        </div>
    );
}
