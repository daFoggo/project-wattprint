export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  authRefreshUrl: process.env.EXPO_PUBLIC_AUTH_REFRESH_URL ?? '',
} as const;

export type Env = typeof env;
