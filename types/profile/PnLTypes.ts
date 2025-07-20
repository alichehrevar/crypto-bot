// /types/profile/PnLTypes.ts

/** A single bar in the Realized PnL bar‐chart */
export interface RealizedPoint {
  /** x‐axis label (e.g. “Jan 1” or ISO date string) */
  date: string;
  /** y‐axis value */
  value: number;
}

/** A single radial slice in the Unrealized PnL chart */
export interface UnrealizedPoint {
  /** slice label */
  x: string;
  /** slice value (percent) */
  y: number;
}

export interface RealizedPnLResponse {
  success: boolean;
  data: RealizedPoint[] | [];
}

export interface UnrealizedPnLResponse {
  success: boolean;
  data: UnrealizedPoint[] | [];
}

export interface AllPnLData {
  success: boolean,
  data: PnLData,
  message?: string
}

export interface PnLData {
  open: PnLDetails[],
  closed: PnLDetails[]
}

export interface PnLDetails {
  symbol: string,
  broker: string,
  execution: string,
  strategy: string,
  leverage: string,
  tpsl: string,
  action: string,
  unrealizedPnl: string
}
