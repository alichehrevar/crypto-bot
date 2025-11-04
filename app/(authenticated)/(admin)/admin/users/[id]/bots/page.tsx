import UserBotsList from "@/components/admin/users/BotsList";

export default async function UserBotsListPage ({ params }: { params: { id: string } }) {

    const { id } = params;

    return (
        <UserBotsList userId={id} />
    )
}
