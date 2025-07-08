
export type AssetSummaryResponse = {
  "success": boolean,
  "summary": Summary
};

export type Summary = {
  "totalBalance": number,
  "availableFunds": number,
  "pctChange": number,
}
