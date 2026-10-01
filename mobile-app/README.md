# WattPrint

Mobile app that turns a household electricity meter into a per-device breakdown. One whole-home
sensor feeds NILM (non-intrusive load monitoring) to show which appliances cost money and when,
prices usage with Vietnam's tiered / TOU tariff, and adds a RAG Generative Copilot that explains the
numbers and suggests low-burden behaviour experiments.

The backend is an **external FastAPI service**; this repo is the Expo client only. All HTTP goes
through `src/lib/api-client.ts` using `EXPO_PUBLIC_API_URL`.

## Stack

Expo SDK 57 (iOS / Android / web) · Expo Router · NativeWind 5 · gluestack-ui · TanStack Query · TypeScript.

## Get started

```bash
pnpm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL
pnpm start
```

## Checks

```bash
pnpm lint        # expo lint
pnpm typecheck   # tsc --noEmit
```

## Structure

Two tiers under `src/`: **screens** own page composition, **features** own reusable domain slices.
See `AGENTS.md` for the full layout and placement rules.
