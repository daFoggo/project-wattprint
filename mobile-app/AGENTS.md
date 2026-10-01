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
