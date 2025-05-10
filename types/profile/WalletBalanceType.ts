export type WalletBalance = {
  asset: string;
  disPlayName: string;
  free: string;
  locked: string;
};

export type WalletBalanceResponse = {
  balance?: WalletBalance[],
  error: string
};
