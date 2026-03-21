export type WalletUser = {
  id: string;
  partnerUserId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  visualEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SiteSession = {
  userId: string;
  partnerUserId: string;
  email: string;
  fullName: string;
};

export type PendingVisual = {
  loginId: string;
  state: string;
  sessionToken: string;
  partnerId: string;
  partnerUserId: string;
  email: string;
  userId: string;
  fullName: string;
};

export type InitAuthResponse = {
  sessionToken: string;
  expiresAt: string;
  verifyPath: string;
};

export type ConsumeResultResponse = {
  result: "PASS";
  sessionToken: string;
  partnerId: string;
  userId: string;
  state: string;
  consumedAt: string;
};

export type InitEnrollResponse = {
  enrollToken: string;
  enrollPath: string;
  expiresAt: string;
  partnerId: string;
  userId: string;
};
