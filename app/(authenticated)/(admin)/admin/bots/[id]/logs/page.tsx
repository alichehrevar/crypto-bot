import BotLogViewer from "@/components/admin/users/bots/details/BotLogViewer";

export default async function BotLogViewerPage ({ params }: { params: { id: string } }) {

    const { id } = params;

    return (
        <BotLogViewer botId={id} />
    )
}
