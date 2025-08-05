import {ChartData} from "@/types/chart";

export type AssetSummaryResponse = {
  success: boolean,
  data: {
    summary: Summary,
    history: ChartData
  }
};

export type Summary = {
  portfolioBalance: number,
  availableFunds: number,
  totalBalance: number,
  pctChange: number,
}
