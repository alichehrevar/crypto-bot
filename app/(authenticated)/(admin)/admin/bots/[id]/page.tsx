import BotDetails from "@/components/admin/users/bots/details/BotDetails";
import RecentBotLogs from "@/components/admin/users/bots/details/RecentBotLogs";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function BotDetailsPage ({ params }: PageProps) {

    const { id } = await params;

    return (
        <section className="space-y-4">
            <div className="glass-card">
                <BotDetails botId={id} />
            </div>
            <div className="glass-card">
                <RecentBotLogs botId={id} />
            </div>
        </section>
    )
}
