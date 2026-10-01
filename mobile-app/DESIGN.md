# WattPrint Design System

WattPrint's visual language is a **pure flat, data-driven design system** engineered specifically for home electricity disaggregation. The interface has one objective: *make a number believable*. Everything on screen is either a measured figure, the appliance that produced it, or the immediate action suggested by that figure.

---

## 1. Core Philosophy

- **Pure Flat Construction**: Zero borders, zero drop shadows, zero card strokes, and zero decorative gradients. Visual structure is produced solely through solid color blocks and calibrated whitespace.
- **Scarcity of Weight**: High contrast is strictly budgeted. Each screen contains at most **one Weight Block** (an MSU Green `#164437` block) marking the single critical insight or action.
- **Data-Driven Copy**: Every figure inside prose is generated directly from the same array powering the charts. Text and charts never drift out of sync.
- **Semantic Typography Split**: Sans-serif for human language (prose, actions, greetings), Monospace for machine measurements (units, timestamps, table data, eyebrows).

---

## 2. Color System

The palette relies on two greens, tinted off-white containers, and a calibrated 5-step data ramp.

### 2.1 Base Tokens

| Token | Hex Value | Name | Semantic Role |
|---|---|---|---|
| `primary` | `#164437` | MSU Green | Heavy text ink, primary headings, active tab pills, weight block background |
| `tertiary` | `#B5E930` | Green Lizard | High-voltage accent. Strictly reserved for the dominant number, largest bubble, or button in a weight block |
| `accentDeep` | `#2F7A0C` | Deep Forest | High-contrast accent on light backgrounds. Used for small text, active underline indicators, and eyebrows |
| `secondary` | `#4A6B60` | Slate Green | Muted text ink, timestamps, axis ticks, inactive tab labels, metadata |
| `neutralGround` | `#F2F4ED` | Warm Ground | Tinted off-white screen background for card-based screens and grouping boxes |
| `primaryContainer` | `#EFF4E6` | Light Tint | Interactive chip surface (`⇄ VND`), tab tracks, badge backgrounds |
| `neutralLine` | `#E7EBE1` | Line Tint | Continuous 2px timeline rail and layout guides (no borders) |
| `neutral` | `#FFFFFF` | Pure White | Clean card surfaces, bottom navigation bar, toggle knobs |

### 2.2 5-Step Data Ramp

Appliance breakdowns are ranked by percentage share and colored by rank. Brightness signals magnitude:

1. **Step 1 (Dominant)**: `#B5E930` (Green Lizard — dark ink `#164437`)
2. **Step 2 (Major)**: `#8CD41C` (Leaf Green — dark ink `#164437`)
3. **Step 3 (Moderate)**: `#2F7A0C` (Deep Forest — white ink `#FFFFFF`)
4. **Step 4 (Minor)**: `#164437` (MSU Green — white ink `#FFFFFF`)
5. **Step 5 (Base / Standby)**: `#4A6B60` (Slate Green — white ink `#FFFFFF`)

*Rule*: An appliance retains its assigned ramp color across all representations: bubbles, donut arcs, stacked bar segments, and timeline events.

---

## 3. The Two Ground Treatments

Screens belong to one of two structural canvas treatments:

### 3.1 White Throughout (`HomeScreen`, `CopilotScreen`)
- Full white (`#FFFFFF`) canvas flowing continuously behind the status bar and content.
- Visual groups are formed via generous whitespace and `#F2F4ED` sub-containers.
- Cards never have borders or drop shadows.

### 3.2 Tinted Ground with White Cards (`UsageScreen`, `ExperimentScreen`, `AccountScreen`, `DeviceDetailScreen`)
- Screen background is `#F2F4ED`.
- Screen titles, date tags, underline tabs, and identity blocks sit directly on the ground.
- Content sections are grouped inside pure white (`#FFFFFF`) rounded cards (`borderRadius: 20`). Inner sub-sections use `#EFF4E6` or `#F2F4ED` (color changes once per depth tier).

---

## 4. Typography & Font System

### 4.1 Font Families

| Semantic Role | Native Font Family | Web Font Stack |
|---|---|---|
| **Human Prose / UI** | `GoogleSansFlex-Regular`, `GoogleSansFlex-Medium`, `GoogleSansFlex-SemiBold` | `'Google Sans Flex', -apple-system, sans-serif` |
| **Machine Data / Mono** | `GeistMono-Regular`, `GeistMono-Medium`, `GeistMono-SemiBold` | `'Geist Mono', Menlo, monospace` |

*Expo Font Loading*: Fonts are loaded via `useFonts` in `src/app/_layout.tsx` from TTF files in `assets/fonts/`. App render is held via `SplashScreen.preventAutoHideAsync()` until fonts are fully ready.

### 4.2 Type Scale (12px Floor Enforced)

All UI text respects a hard minimum size floor of **12px** to preserve accessibility across mobile display scales:

| Token | Size | Line Height | Tracking | Semantic Use |
|---|---:|---:|---:|---|
| `display` | 46–60 | `1.05` | `-0.03em` | Hero figures (`81.6`, `204,739`) |
| `h1` | 28 | 32 | `-0.5` | Screen titles (`Usage`, `Experiments`, `Account`) |
| `h2` | 24 | 28 | `-0.3` | Section headings (`Grounded in your meter`) |
| `h3` | 18–20 | 24 | `-0.2` | Card titles and prose ledes |
| `bodyLarge` | 17 | 24 | `0` | Emphasized body text |
| `body` | 15–16 | 22 | `0` | Standard body sentences |
| `bodySmall` | 14 | 20 | `0` | Secondary descriptions, explanations |
| `label` | 13–14 | 18 | `0` | Action buttons, segmented pills |
| `caption` | 13 | 18 | `0.4` | Metadata, secondary values |
| `overline` | 12 | 16 | `0.5–0.6` | Smallest UI text: chart axis, eyebrows, table headers |

### 4.3 Android Hermes Monospace Tracking Calibration

On React Native Android (Hermes runtime), CSS-style wide tracking values (`0.96` to `1.2`) on monospace fonts add excessive whitespace padding after spaces and punctuation, creating disjointed gaps (e.g. `TUESDAY,  9  SEP`, `PAST  EXPERIMENTS`).

**Standardized Tracking Rules**:
- **Eyebrow Labels**: `letterSpacing: 0.6` (standardized across all cards and section headers).
- **Date & Tabular Timestamps**: `letterSpacing: 0.5` (prevents comma gaps and awkward numeric shifts).
- **Tabular Units & Column Headers**: `letterSpacing: 0.5`.
- **Caps Action Labels (`SEE ALL`, `BACK`, `EDIT`)**: `letterSpacing: 0.6`.

---

## 5. Component Specifications & Formulas

### 5.1 Dynamic Bubble Breakdown (`BubbleBreakdown`)
- **Diameter Formula**: `size = Math.round(52 + device.pct * 2.0)`
  - Minimum bubble diameter: `68px` (for 8% share).
  - Maximum bubble diameter: `148px` (for 48% share).
- **Internal Typography Scaling**:
  - `size > 120`: `fontSize: 15`, `lineHeight: 19`
  - `size > 80`: `fontSize: 13`, `lineHeight: 16`
  - `size <= 80`: `fontSize: 11` (graphic circle exception), `lineHeight: 14`
- Multi-line bubble labels wrap cleanly with centered vertical layout and zero edge clipping.

### 5.2 Segmented Pills & Tracks
- Pill track container: `backgroundColor: '#EFF4E6'`, `borderRadius: 9999`, `padding: 3`, `flexShrink: 0`.
- Pill items: `paddingHorizontal: 10–11`, `paddingVertical: 5`.
- Active pill: `backgroundColor: '#164437'`, text color `#B5E930` or `#FFFFFF`.
- Inactive pill: transparent background, text color `#4A6B60`.

### 5.3 Tabular Breakdown Columns (`BreakdownTable`, `BillingTariffView`)
- Table header column widths strictly match data row widths:
  - Spacer for color chip: `12px` (matching `width: 12, height: 12` chip).
  - Cost column header: `width: 80` (matching `rowCost: { width: 80 }`).
  - Share column header: `width: 40` (matching `rowPct: { width: 40 }`).

### 5.4 Distribution & Neighbour Comparison (`NeighbourComparison`)
- Multi-band horizontal tracks with 3 distinct labels:
  - Band 0 (`under 1,000 W`): Left-aligned.
  - Band 1 (`1,000 to 1,660`): Center-aligned directly under the median track.
  - Band 2 (`over 1,660`): Right-aligned.
- Font size locked at `11px` with `numberOfLines={1}` to prevent wrapping.

### 5.5 Shell Navigation (`NativeTabs`)
- Built on `expo-router/unstable-native-tabs`.
- Background: `#FFFFFF`.
- Label mode: `labelVisibilityMode="labeled"` (all 5 tab titles remain visible, overriding Android collapsing defaults).
- Icons: Native SF Symbols on iOS, Material Symbols on Android (`home`, `bar_chart`, `auto_awesome`, `science`, `person`).

### 5.6 Native Controls (`@expo/ui`)
- Genuine platform-native controls wrapped within `<Host style={{ flex: 1 }}>` in root layout:
  - `<Switch>`: Integrated in Account screen for preferences with native spring dynamics.
  - `<BottomSheet>`: Rapid appliance inspection bottom sheet with drag indicators.

### 5.7 Copilot Architecture (`ChatThreadList` & `ChatThreadView`)
- **Session List UI (`ChatThreadList`)**:
  - Clean title header: `Copilot` (28px bold Sans) with live `N THREADS` counter in Geist Mono.
  - Search input: Pill container in `#F2F4ED` with live multi-field filtering across thread title, category, and period.
  - Timeline grouping: `TODAY`, `THIS WEEK`, `EARLIER` timeline markers with subtle 0.6 tracking.
  - Row items: Leading DataRamp colored square chips (`10x10px`, `borderRadius: 3`), active session highlighting with quiet `#EFF4E6` background.
  - Floating Action Button (FAB): `+ New thread` in `#164437` + `#B5E930` floating `bottom: 20px` directly above the NativeTabs bar.
- **Unified Chat Block (`ChatMessageBubble` & `ChatThreadView`)**:
  - Editorial, single-block analytical presentation replacing speech bubbles with tails.
  - User turn: Right-aligned compact card in `#164437` with crisp white typography.
  - Copilot turn: Single contiguous `#F2F4ED` card container featuring:
    - Header: `COPILOT` badge + `METER INDEXED` audit stamp in Geist Mono.
    - Narrative prose: Google Sans Flex body text contextualizing meter calculations.
    - Fact Rail: Integrated borderless 3-column data grid (`#EFF4E6` ground, Geist Mono) mapping key metrics (e.g. AC runtime, temp delta, tier shift).
    - Primary CTA: High-voltage `#B5E930` pill button navigating to suggested experiments.
  - Bottom input docking: Sits natively above `NativeTabs` with `paddingBottom: 12` (no redundant overlay insets).

---

## 6. Do's and Don'ts Checklist

- [x] **DO** construct layout entirely with color blocks and whitespace — no border strokes or shadows.
- [x] **DO** enforce the 12px floor for all readable UI text.
- [x] **DO** keep tracking on Geist Mono between `0.5` and `0.6` on Android Hermes.
- [x] **DO** reserve Green Lizard (`#B5E930`) for the primary hero number or single weight button.
- [x] **DON'T** use `#B5E930` for small text on light backgrounds (use `#2F7A0C` instead).
- [x] **DON'T** mix the two ground treatments within the same screen.
- [x] **DON'T** use CSS font fallbacks or numeric `fontWeight` strings on Android Hermes.
