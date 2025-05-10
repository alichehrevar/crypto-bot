export type TopMover = {
  name: string;
  symbol: string;
  changePct: number;
  imageUrl: string;
}
export type TopMoversResponse = {
  success: boolean,
  data: TopMover[],
  error: string
}
