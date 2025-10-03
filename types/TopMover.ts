export type TopMover = {
    symbol: string,
    priceChangePercent: number,
    lastPrice: number,
    volume: number,
    imageUrl: string
}
export type TopMoversResponse = {
  success: boolean,
  data: TopMover[],
  error: string
}
