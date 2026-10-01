import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';

export interface UnderlineTabItem {
  key: string;
  label: string;
}

interface UnderlineTabRowProps {
  tabs: UnderlineTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  fullWidth?: boolean;
}

export function UnderlineTabRow({ tabs, activeKey, onChange, fullWidth = false }: UnderlineTabRowProps) {
  return (
    <View style={[styles.container, fullWidth && styles.containerFull]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            hitSlop={8}
            style={[styles.tabButton, fullWidth && styles.tabButtonFull]}>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            <View
              style={[
                styles.indicator,
                fullWidth && styles.indicatorFull,
                isActive && styles.indicatorActive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  containerFull: {
    width: '100%',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: WattPrintTokens.colors.neutralLine, // #E7EBE1
    justifyContent: 'space-between',
  },
  tabButton: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  tabButtonFull: {
    flex: 1,
    paddingVertical: 10,
    position: 'relative',
    gap: 0,
  },
  tabLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  tabLabelActive: {
    color: WattPrintTokens.colors.primary, // #164437
  },
  indicator: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  indicatorFull: {
    position: 'absolute',
    bottom: -1,
    width: 44,
  },
  indicatorActive: {
    backgroundColor: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
});
