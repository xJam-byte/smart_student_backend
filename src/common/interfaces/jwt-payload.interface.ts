export interface JwtPayload {
  sub: string; // userId
  email?: string;
  phone?: string;
  role: string;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}
