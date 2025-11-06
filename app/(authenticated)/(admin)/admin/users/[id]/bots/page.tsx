import UserBotsList from "@/components/admin/users/bots/BotsList";

export default async function UserBotsListPage ({ params }: { params: { id: string } }) {

    const { id } = params;

    return (
        <section className="glass-card">
            <UserBotsList userId={id} />
        </section>
    )
}
