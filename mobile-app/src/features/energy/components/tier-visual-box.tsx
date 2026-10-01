import React from 'react';
import { View, StyleSheet } from 'react-native';

export interface TierConfig {
  id: string;
  name: string;
  price: string;
  bgColor: string;
  borderColor?: string;
}

export const EVN_TIERS: Record<string, TierConfig> = {
  t1: {
    id: 't1',
    name: 'Bậc 1',
    price: '1.984đ',
    bgColor: '#DEEEBD',
    borderColor: '#C3DC9C',
  },
  t2: {
    id: 't2',
    name: 'Bậc 2',
    price: '2.050đ',
    bgColor: '#B5E930',
  },
  t3: {
    id: 't3',
    name: 'Bậc 3',
    price: '2.380đ',
    bgColor: '#389E1E',
  },
  t4: {
    id: 't4',
    name: 'Bậc 4',
    price: '2.998đ',
    bgColor: '#164437',
  },
  t5: {
    id: 't5',
    name: 'Bậc 5',
    price: '3.350đ',
    bgColor: '#E5A93C',
  },
  t6: {
    id: 't6',
    name: 'Bậc 6',
    price: '3.460đ',
    bgColor: '#DC2626',
  },
};

export function resolveTier(tierIdentifier: string | undefined): TierConfig {
  if (!tierIdentifier) return EVN_TIERS.t3;
  const lower = tierIdentifier.toLowerCase().trim();
  if (lower === 't1' || lower.includes('bậc 1') || lower.includes('bac 1') || lower === 'muted') return EVN_TIERS.t1;
  if (lower === 't2' || lower.includes('bậc 2') || lower.includes('bac 2') || lower.includes('stripe')) return EVN_TIERS.t2;
  if (lower === 't3' || lower.includes('bậc 3') || lower.includes('bac 3') || lower === 'solid') return EVN_TIERS.t3;
  if (lower === 't4' || lower.includes('bậc 4') || lower.includes('bac 4') || lower === 'grid') return EVN_TIERS.t4;
  if (lower === 't5' || lower.includes('bậc 5') || lower.includes('bac 5') || lower.includes('hatch')) return EVN_TIERS.t5;
  if (lower === 't6' || lower.includes('bậc 6') || lower.includes('bac 6') || lower.includes('cross')) return EVN_TIERS.t6;
  return EVN_TIERS.t3;
}

interface TierVisualBoxProps {
  tierId: string;
  width: number;
  height: number;
  rx?: number;
}

export function TierVisualBox({
  tierId,
  width,
  height,
  rx = 3,
}: TierVisualBoxProps) {
  const tier = resolveTier(tierId);
  const w = Math.max(2, width);
  const h = Math.max(2, height);

  return (
    <View
      style={[
        styles.box,
        {
          width: w,
          height: h,
          borderRadius: rx,
          backgroundColor: tier.bgColor,
          borderColor: tier.borderColor,
          borderWidth: tier.borderColor ? 1 : 0,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
