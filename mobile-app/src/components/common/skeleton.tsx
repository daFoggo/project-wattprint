import React, { useEffect } from 'react';
import { type DimensionValue, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { WattPrintTokens } from '@/constants/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Bo góc; mặc định theo radii.sm của theme. */
  radius?: number;
  /** `dark` dùng trên khối nền xanh đậm (thẻ cảnh báo). */
  tone?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

const COLORS = {
  light: WattPrintTokens.colors.neutralLine, // #E7EBE1
  dark: 'rgba(255, 255, 255, 0.14)',
};

/**
 * Khối giữ chỗ nhấp nháy. Bố cục của skeleton phải khớp bố cục thật (kích thước cố định) để khi dữ
 * liệu về không bị giật. Tôn trọng "giảm chuyển động" của hệ thống: khi bật thì đứng yên.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = WattPrintTokens.radii.sm,
  tone = 'light',
  style,
}: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [opacity, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width, height, borderRadius: radius, backgroundColor: COLORS[tone] }, animated, style]}
    />
  );
}

export function SkeletonCircle({ size, ...rest }: Omit<SkeletonProps, 'width' | 'height' | 'radius'> & { size: number }) {
  return <Skeleton {...rest} width={size} height={size} radius={size / 2} />;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
