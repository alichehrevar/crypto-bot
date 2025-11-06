import BotLogViewer from "@/components/admin/users/bots/details/BotLogViewer";

export default async function BotLogViewerPage ({ params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;

    return (
        <BotLogViewer botId={id} />
    )
}
