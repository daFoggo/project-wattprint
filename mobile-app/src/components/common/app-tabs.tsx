import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Fonts, WattPrintTokens } from '@/constants/theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#FFFFFF"
      indicatorColor={WattPrintTokens.colors.primaryContainer}
      labelVisibilityMode="labeled"
      iconColor={{
        default: WattPrintTokens.colors.secondary,
        selected: WattPrintTokens.colors.primary,
      }}
      labelStyle={{
        default: {
          color: WattPrintTokens.colors.secondary,
          fontFamily: Fonts.sansMedium,
          fontSize: 12,
        },
        selected: {
          color: WattPrintTokens.colors.primary,
          fontFamily: Fonts.sansSemiBold,
          fontSize: 12,
        },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Trang chủ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="usage">
        <NativeTabs.Trigger.Label>Tiêu thụ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="copilot">
        <NativeTabs.Trigger.Label>Trợ lý AI</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="experiment">
        <NativeTabs.Trigger.Label>Thử nghiệm</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flask.fill" md="science" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Tài khoản</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
