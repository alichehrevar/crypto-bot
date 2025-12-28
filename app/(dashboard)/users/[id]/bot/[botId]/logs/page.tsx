// app/users/[id]/bot/[botId]/page.tsx
import BotLogs from "@/components/users/BotLogs";

interface PageProps {
    params: Promise<{
        id: string
        botId: string
    }>
}

export default async function Page({ params }: PageProps) {
    const { id, botId } = await params

    return <BotLogs userId={id} botId={botId} />
}
