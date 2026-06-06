---
name: spendsense
description: SpendSense project conventions — Nepal-focused personal finance app on Expo SDK 54, Expo Router, NativeWind, Zustand, expo-sqlite + Drizzle. Use when working in this repo, implementing features, or when PRD/screen-flows conflict with generic Expo advice.
---

# SpendSense Project Skill

Personal finance Android app. NPR-denominated, Nepal-focused. **No backend, no auth, no cloud sync in V1.**

## Source of truth (priority order)

1. `CLAUDE.md` — architecture, business rules, scope
2. `reference/screen-flows.md` — screen behavior (beats stale PRD sections)
3. `BUILD_ORDER.md` — what's shipped vs next
4. `reference/prd.md` — product intent (may be stale)

## Stack (do not swap without explicit ask)

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54, managed workflow, **EAS Build + expo-dev-client** (not pure Expo Go for OCR/native) |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind v4 + Tailwind v3 (see `expo-tailwind-setup` skill for v5 migration only if requested) |
| State | Zustand in `store/` |
| Database | expo-sqlite + Drizzle in `db/` |
| Charts | react-native-gifted-charts |

## Hard rules

- **Light theme only** in V1. Design tokens in `constants/colors.ts`.
- **NPR formatting** via `lib/format.ts` — lakh-aware, tabular nums in UI.
- **Auto-categorization** is 3-step priority in `lib/categorize.ts`: remarks suffix → sure-shot merchants → fallback + flag. Never auto-memorize ambiguous merchants.
- **Month boundaries** follow user `month_start_day` from playbook store, not calendar month.
- **EF target** = `EF_MULTIPLIER` × Core Living bucket — never income-based.
- **Overlay / bubble capture** is V2 only — see `reference/OVERLAY_LLM_PROMPT.md`. Do not modify `lib/categorize.ts`, `store/`, or `db/schema.ts` for overlay work.
- **OCR**: V1 targets on-device ML Kit (`rn-mlkit-ocr`); current `lib/ocr.ts` is a mock — replace, don't extend the mock long-term.
- No tests in V1. No drive-by refactors. Match existing file layout and naming.

## Key folders

```
app/           Expo Router screens (onboarding, tabs)
components/    UI by domain (home, transactions, goals, manual-entry, flagged)
store/         Zustand stores — hydrate from DB in app/_layout.tsx
db/            Drizzle schema, client, migrations, seed
lib/           Pure helpers (format, categorize, projection, ocr, notifications)
constants/     colors.ts, defaults.ts (default playbook buckets)
```

## Tab bar layout

```
Home | Transactions | [+] | Goals | Settings
```

Center `[+]` opens `ManualEntrySheet` — not a route.

## When to use other skills

| Task | Skill |
|---|---|
| UI, navigation, animations, sheets | `building-native-ui` |
| Tailwind / NativeWind setup | `expo-tailwind-setup` |
| Dev client / physical device builds | `expo-dev-client` |
| EAS Build, Play Store | `expo-deployment` |
| Kotlin overlay module (V2) | `expo-module` |
| SDK upgrades | `upgrading-expo` |

## Env vars

See `.env.example`. App reads `EXPO_PUBLIC_*` at build time. Secrets (EAS token) stay out of the app bundle.
