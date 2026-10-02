# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project structure

Two-tier feature architecture inside `src/`: **screens** own page composition, **features** own the
reusable domain slice (data + UI). Backend is an **external FastAPI service** — there are no Expo API
routes or `src/server/`; all HTTP goes through `src/lib/api-client.ts` using `EXPO_PUBLIC_API_URL`.

```
src/
├── app/                 # Expo Router routes ONLY. Every file is a route.
├── screens/             # page tier: one folder per page
│   └── <page>/
│       ├── index.tsx              # page composition; route re-exports it
│       └── components/            # views used by this page only
├── features/            # domain tier: reusable across pages
│   └── <feature>/
│       ├── components/            # domain UI reused by 2+ pages
│       ├── api.ts                 # react-query hooks -> FastAPI
│       ├── use-<x>-store.tsx      # feature state
│       ├── types.ts  mock.ts       # data contract / fixtures
│       └── index.ts               # (avoid barrels — see below)
├── components/
│   └── common/          # domain-agnostic, app-wide UI (shell, chrome, card)
├── lib/                 # infrastructure: api-client, env, token-storage
├── providers/           # app-wide providers (react-query)
├── hooks/  utils/  constants/
```

## Component Placement Rule

Place UI/data by **scope of reuse + domain coupling**, not by "UI vs logic":

| Kind | Home |
|---|---|
| Used by ≥2 pages, or a cross-cutting domain capability | `features/<feature>/` |
| Page-local (rendered by exactly one page) | `screens/<page>/components/` |
| Domain-agnostic, app-wide (layout, shell, chrome) | `components/common/` |
| Native controls (Switch, BottomSheet, Slider, Menu) | `@expo/ui` |

**Promote, don't predict.** When a page-local view gains a second consumer, move it into the owning
feature and update imports. Do not pre-place single-consumer UI in a feature.

## Rules

- `src/app/` holds routes only; each route is a thin re-export of a screen: `export { HomeScreen as default } from '@/screens/home';`
- Screens (page tier) may import from features; **features never import screens**, and never import another feature's UI to compose a page — that composition belongs to the screen.
- UI styling follows WattPrint's pure flat tokens (`#164437`, `#B5E930`, `#F2F4ED`) via pure React Native primitives (`View`, `Text`, `Pressable`, `StyleSheet`).
- Use `@expo/ui` for genuine native platform controls (`Switch`, `BottomSheet`, `Slider`, `Menu`) wrapped in `<Host>`.
- New shared components go to `components/common/`.
- Infrastructure that features depend on (api, env, auth, storage) lives in `lib/`.
- Absolute imports via `@/` (maps to `src/`); **avoid barrel `index.ts`** in feature/screen code to keep fast refresh working (import the file directly).
- Kebab-case filenames; colocate styles at the bottom of the component and tests next to the file.
- Platform-specific files use `.web` / `.native` / `.ios` / `.android`.
- Add a page by creating `src/screens/<page>/` plus a matching `src/app/<page>.tsx` re-export; add a
  feature by creating `src/features/<name>/`.

## Loading, Error & Code-Splitting (adapted from the web app's 4 tiers)

Expo Router has no route `loader`, so data is fetched **by the section that shows it** and every
section owns its own Suspense + error boundary. A page is a static shell plus independent sections.

- **Data**: `queryOptions` factories in `features/<f>/api.ts`; sections read them with
  `useSuspenseQuery` (hooks `useUsage`, `useDeviceUsage`, `useBilling`, ...). Do not use `enabled` or
  `placeholderData` with them. Persisted cache: bump `CACHE_VERSION` in `providers/query-provider.tsx`
  whenever an API response changes shape.
- **Tier 1, route**: a route file may export `SuspenseFallback` (page skeleton) and `ErrorBoundary`
  (re-export from `expo-router`). Shown while the screen module loads; async routes are dev-only on
  native (Metro does not split native production bundles), so this is a dev/startup nicety, not a
  network chunk.
- **Tier 2, section**: wrap each independent section in `<QueryBoundary fallback={<XSkeleton />}>`
  (`components/common/query-boundary.tsx`): skeleton while loading, `SectionError` with a retry button
  on failure. Sections load in parallel and fail separately.
- **Tier 3, skeletons**: built from `components/common/skeleton.tsx` (`Skeleton`, `SkeletonCircle`),
  sized like the real content so nothing jumps; keep them in `screens/<page>/components/*-skeletons.tsx`
  (or next to the feature component they stand in for).
- **Tier 4, refetch / switching ranges**: urgent state (tab highlight) updates at once, the data key
  uses `useDeferredValue`, so the old content stays on screen (dimmed to 55 %) until the new one is
  ready. Never swap loaded content for a skeleton on a range change.
- **Splitting**: one section per file: `screens/<page>/components/<name>-section.tsx`. Do **not** use
  `React.lazy` / `import()` for in-app modules: Metro does not split native production bundles, and in
  dev every `import()` is a separate Metro bundling request (a 1.5 s skeleton the first time).
  Inline requires already keep unused modules from being evaluated.
- Prefetch the ranges a user is likely to open next with `queryClient.prefetchQuery(xQueryOptions(...))`.

## Page transitions

- Tabs are `NativeTabs` (native switch, nothing to animate in JS). Drill-down pages are **screens of a
  native `Stack`**, never JS overlays: `account/_layout.tsx` and `usage/_layout.tsx` use
  `animation: 'ios_from_right'`, `fullScreenGestureEnabled` (swipe back anywhere), and
  `freezeOnBlur` (covered screen stops rendering). Set `unstable_settings.initialRouteName` so a deep
  push still has a screen to go back to.
- Before `router.push`, warm what the next page needs so it has content when the animation ends:
  `void import('<screen module>')` and `queryClient.prefetchQuery(...)`. Pass only view state
  (range, offset) as route params; the chosen entity travels in the energy store.

## Performance rules (measured on device)

- **Tabs mount lazily.** `NativeTabs` renders every tab at launch, so five screens rendered and fetched
  at once. Wrap each tab (route or `_layout.tsx`) in `components/common/lazy-tab.tsx` (`<LazyTab>`): it
  mounts its children on the tab's first focus and keeps them afterwards. Home is the only exception.
- **Prefetch after the first paint.** `prefetchAppData` (features/energy/api.ts) loads the other tabs'
  queries one by one once Home is interactive (`InteractionManager.runAfterInteractions`), so opening a
  tab shows data at once. New screens that read the API add their query options there.
- **Demo data is immutable.** Queries are fresh for 1 hour and do not refetch on focus; bump
  `CACHE_VERSION` when a response changes shape. Do not add refetch-on-focus hooks.
- **Backend**: demo answers are cached in process (`app/core/cache.py`, key ignores parameter order and
  the spelling of instants) and the answers the app asks for first are computed at start-up
  (`app/core/warmup.py`, `DEMO_WARM_ASOF`). A new endpoint the app calls at launch should be added to
  `warmup.urls()`. Appliance runs are found in SQL (`insights.runs`), never by pulling minute rows.
- Measure on the device before and after (`adb shell dumpsys gfxinfo`, `meminfo`; `adb shell monkey`
  for ANRs). The dev client uses ~2x the memory of a release build, so judge absolute numbers carefully.
