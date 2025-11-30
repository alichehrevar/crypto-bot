import CompetitionStats from "@/components/pre-launch/leaderboard/tabs/live-arena/CompetitionStats";
import CryptoChart from "@/components/pre-launch/leaderboard/tabs/live-arena/CryptoChart";
import CryptoUsersList from "@/components/pre-launch/leaderboard/tabs/live-arena/CryptoUsersList";

export default function LiveArenaContent () {
    return (
        <>
            <CompetitionStats />
            <CryptoChart />
            <CryptoUsersList />
        </>
    )
}
