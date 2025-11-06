import BotDetails from "@/components/admin/users/bots/details/BotDetails";
import RecentBotLogs from "@/components/admin/users/bots/details/RecentBotLogs";

export default async function BotDetailsPage ({ params }: { params: { id: string } }) {

    const { id } = params;

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
