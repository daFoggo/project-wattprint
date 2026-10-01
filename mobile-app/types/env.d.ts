declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL?: string;
      EXPO_PUBLIC_AUTH_REFRESH_URL?: string;
    }
  }
}

export {};