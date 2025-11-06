import UserBotsList from "@/components/admin/users/bots/BotsList";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function UserBotsListPage({ params }: PageProps) {
    const { id } = await params;

    return (
        <section className="glass-card">
            <UserBotsList userId={id} />
        </section>
    );
}
