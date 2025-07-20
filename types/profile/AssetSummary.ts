
export type AssetSummaryResponse = {
  success: boolean,
  summary: Summary
};

export type Summary = {
  portfolioBalance: number,
  availableFunds: number,
  totalBalance: number,
  pctChange: number,
}
