export type WalletBalance = {
  asset: string;
  disPlayName: string;
  free: string;
  locked: string;
};

export type RawBalance = {
  accountType: string;
  usdtBalance: string;
};

export type RawBalanceResponse = {
  success: boolean,
  data: RawBalance[],
  error: string
}

export type WalletBalanceResponse = {
  success: boolean,
  balance: WalletBalance[],
  error: string
};
