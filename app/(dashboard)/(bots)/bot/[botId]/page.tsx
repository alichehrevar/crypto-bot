// app/users/[id]/bot/[botId]/page.tsx
import BotDetailsPage from '@/components/users/BotDetails'

interface PageProps {
    params: Promise<{
        id: string
        botId: string
    }>
}

export default async function Page({ params }: PageProps) {
    const { id, botId } = await params

    return <BotDetailsPage userId={id} botId={botId} />
}
