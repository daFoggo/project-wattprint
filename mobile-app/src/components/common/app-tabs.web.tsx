import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, Text } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Trang chủ</TabButton>
          </TabTrigger>
          <TabTrigger name="usage" href="/usage" asChild>
            <TabButton>Tiêu thụ</TabButton>
          </TabTrigger>
          <TabTrigger name="copilot" href="/copilot" asChild>
            <TabButton>Trợ lý AI</TabButton>
          </TabTrigger>
          <TabTrigger name="experiment" href="/experiment" asChild>
            <TabButton>Thử nghiệm</TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton>Tài khoản</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          isFocused && styles.tabButtonActive,
        ]}>
        <Text
          style={[
            styles.tabText,
            isFocused ? styles.tabTextActive : styles.tabTextInactive,
          ]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.brandText}>WattPrint</Text>
        <View style={styles.navGroup}>
          {props.children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: WattPrintTokens.colors.neutralLine,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 640,
  },
  brandText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.primary,
  },
  navGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  tabButtonView: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: WattPrintTokens.colors.primaryContainer,
  },
  tabText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
  },
  tabTextActive: {
    color: WattPrintTokens.colors.primary,
  },
  tabTextInactive: {
    color: WattPrintTokens.colors.secondary,
  },
});
