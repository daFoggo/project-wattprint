import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'wattprint_auth_token';
const REFRESH_TOKEN_KEY = 'wattprint_refresh_token';

const isWeb = Platform.OS === 'web';

type SecureStoreModule = typeof import('expo-secure-store');

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

function loadSecureStore(): Promise<SecureStoreModule | null> {
  if (!secureStorePromise) {
    secureStorePromise = import('expo-secure-store').catch((error) => {
      console.warn('expo-secure-store is unavailable; tokens will not persist.', error);
      return null;
    });
  }
  return secureStorePromise;
}

function webStorage(): Storage | null {
  if (isWeb && typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

async function readKey(key: string): Promise<string | null> {
  const web = webStorage();
  if (web) {
    return web.getItem(key);
  }

  const store = await loadSecureStore();
  if (!store) {
    return null;
  }

  try {
    return await store.getItemAsync(key);
  } catch (error) {
    console.warn(`Error reading ${key} from secure store:`, error);
    return null;
  }
}

async function writeKey(key: string, value: string): Promise<void> {
  const web = webStorage();
  if (web) {
    web.setItem(key, value);
    return;
  }

  const store = await loadSecureStore();
  if (!store) {
    return;
  }

  try {
    await store.setItemAsync(key, value);
  } catch (error) {
    console.warn(`Error writing ${key} to secure store:`, error);
  }
}

async function deleteKey(key: string): Promise<void> {
  const web = webStorage();
  if (web) {
    web.removeItem(key);
    return;
  }

  const store = await loadSecureStore();
  if (!store) {
    return;
  }

  try {
    await store.deleteItemAsync(key);
  } catch (error) {
    console.warn(`Error deleting ${key} from secure store:`, error);
  }
}

export const tokenStorage = {
  getToken: () => readKey(AUTH_TOKEN_KEY),
  setToken: (token: string) => writeKey(AUTH_TOKEN_KEY, token),
  removeToken: () => deleteKey(AUTH_TOKEN_KEY),
  getRefreshToken: () => readKey(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => writeKey(REFRESH_TOKEN_KEY, token),
  async clearAll(): Promise<void> {
    await Promise.allSettled([deleteKey(AUTH_TOKEN_KEY), deleteKey(REFRESH_TOKEN_KEY)]);
  },
};
