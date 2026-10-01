import { ApiError } from '@/lib/api-client';
import { energyKeys } from '@/features/energy/api';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Network from 'expo-network';
import { PropsWithChildren, useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        // phải >= maxAge của persister, nếu không dữ liệu đã lưu bị xoá khỏi cache trước khi khôi phục
        gcTime: ONE_WEEK,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// Lưu xuống đĩa số liệu năng lượng: mốc demo cố định nên khoá truy vấn không đổi, mở app là có số ngay rồi mới làm mới.
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'wattprint-query-cache' });

const persistOptions = {
  persister,
  maxAge: ONE_WEEK,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
      query.state.status === 'success' && query.queryKey[0] === energyKeys.all[0],
  },
};

function DevToolsPlugin({ client }: { client: QueryClient }) {
  if (__DEV__) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useReactQueryDevTools(client);
  }
  return null;
}

export function QueryProvider({ children }: PropsWithChildren) {
  const client = getQueryClient();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      onlineManager.setEventListener((setOnline) => {
        const subscription = Network.addNetworkStateListener((state) => {
          setOnline(state.isConnected ?? true);
        });
        return () => subscription.remove();
      });
    }

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
      <DevToolsPlugin client={client} />
      {children}
    </PersistQueryClientProvider>
  );
}
