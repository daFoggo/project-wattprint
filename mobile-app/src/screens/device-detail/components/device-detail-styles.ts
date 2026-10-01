import { StyleSheet } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 12,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  backBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backChevron: {
    fontFamily: Fonts.monoMedium,
    fontSize: 20,
    lineHeight: 22,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  backBtn: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  pillTrack: {
    flexDirection: 'row',
    backgroundColor: '#E2E6DA',
    borderRadius: WattPrintTokens.radii.pill,
    padding: 3,
    gap: 2,
  },
  pillBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: WattPrintTokens.radii.pill,
  },
  pillBtnActive: {
    backgroundColor: WattPrintTokens.colors.primary,
  },
  pillLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  pillLabelActive: {
    color: '#FFFFFF',
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityBlock: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deviceIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 28,
    lineHeight: 32,
    color: WattPrintTokens.colors.primary, // #164437
  },
  deviceMeta: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.52,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  pairedGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 6,
  },
  statEyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 26,
    color: WattPrintTokens.colors.primary, // #164437
  },
  statUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary,
  },
  statLede: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  dateNavBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateNavBtnDisabled: {
    opacity: 0.3,
  },
  dateNavChevron: {
    fontFamily: Fonts.monoMedium,
    fontSize: 18,
    color: WattPrintTokens.colors.primary,
    fontWeight: '600',
  },
  dateNavChevronDisabled: {
    color: WattPrintTokens.colors.secondary,
  },
  dateNavLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary,
  },
  estimationBanner: {
    alignSelf: 'center',
    backgroundColor: '#E7F2D8',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: WattPrintTokens.radii.pill,
  },
  estimationText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  estimationHighlight: {
    color: WattPrintTokens.colors.accentDeep,
    fontFamily: Fonts.monoMedium,
    fontWeight: '700',
  },
  statsList: {
    gap: 2,
    paddingTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statRowLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  statRowValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary, // #164437
  },
});
