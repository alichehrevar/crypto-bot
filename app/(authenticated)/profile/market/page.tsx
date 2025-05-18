import HeatMapWidget from "@/components/profile/market/HeatMap";
import TopMoversList from "@/components/profile/market/TopMoversList";

export default function MarketPage () {
  return (
    <div className="container px-2 lg:px-4">
      <h2 className="font-bold text-xl mb-8">Heat Map</h2>
      <div className="h-[600px] w-full">
        <HeatMapWidget />
      </div>
      <div className="h-[600px] w-full">
        <TopMoversList />
      </div>
    </div>
  )
}
