import React, { Component, type ErrorInfo, type PropsWithChildren, type ReactNode, Suspense } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

import { Fonts, WattPrintTokens } from '@/constants/theme';

interface ErrorBoundaryProps extends PropsWithChildren {
  onReset: () => void;
  renderError: (error: Error, retry: () => void) => ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.warn('[QueryBoundary]', error.message, info.componentStack);
  }

  retry = () => {
    this.props.onReset();
    this.setState({ error: null });
  };

  render() {
    return this.state.error ? this.props.renderError(this.state.error, this.retry) : this.props.children;
  }
}

/** Khối báo lỗi gọn, có nút thử lại; dùng khi một phần của màn hình không tải được. */
export function SectionError({
  message = 'Không tải được dữ liệu.',
  onRetry,
  tone = 'light',
}: {
  message?: string;
  onRetry: () => void;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <View style={[styles.box, dark && styles.boxDark]}>
      <Text style={[styles.message, dark && styles.messageDark]}>{message}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
        <Text style={[styles.retry, dark && styles.retryDark]}>THỬ LẠI</Text>
      </Pressable>
    </View>
  );
}

interface QueryBoundaryProps extends PropsWithChildren {
  /** Skeleton của chính phần này (Tier 2/3): hiện khi dữ liệu cần thiết chưa có. */
  fallback: ReactNode;
  errorMessage?: string;
  errorTone?: 'light' | 'dark';
}

/**
 * Ranh giới cho MỘT phần của màn hình dùng `useSuspenseQuery`: Suspense hiện skeleton, lỗi hiện
 * nút thử lại và chỉ làm lại đúng query lỗi. Các phần độc lập nằm trong ranh giới riêng nên tải
 * song song và hỏng riêng, không kéo cả màn hình xuống.
 */
export function QueryBoundary({ fallback, errorMessage, errorTone, children }: QueryBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          renderError={(error, retry) => (
            <SectionError message={errorMessage ?? error.message} tone={errorTone} onRetry={retry} />
          )}>
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: WattPrintTokens.radii.md,
    backgroundColor: WattPrintTokens.colors.neutralGround,
  },
  boxDark: {
    backgroundColor: WattPrintTokens.colors.primary,
  },
  message: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    textAlign: 'center',
    color: WattPrintTokens.colors.inkBody,
  },
  messageDark: {
    color: WattPrintTokens.colors.inkInverseBody,
  },
  retry: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep,
  },
  retryDark: {
    color: WattPrintTokens.colors.tertiary,
  },
});
