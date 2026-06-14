# Build Order

What's shipped and what's next. For stack and rules see [AGENTS.md](./AGENTS.md). For behavior and UI see [docs/core-function.md](./docs/core-function.md) and [docs/design-and-features.md](./docs/design-and-features.md).

---

## Shipped

| Area | Status |
|---|---|
| DB + Drizzle + seed + migrations (through `m0008` description column) | Done |
| Zustand stores + root hydration + month rollover / surplus carry-forward | Done |
| 6-step onboarding (Foundations → Goals → Bucket Builder → Balances) | Done |
| Home — Your money → ring → lent/borrow → Living → Future (EF + progress in Future) | Done |
| Lent & borrowed — contacts, person ledger, settle up, ring slice, net worth, FAB toggle | Done |
| Full-app design polish — ring chips, animations, safe-area headers, chart labels | Done |
| Salary-gated safe to spend (checklist unlocks ring for the month) | Done |
| Personal accumulating fund + cap prompts | Done |
| Goal completion → Vault archived + reallocation prompt | Done |
| Month start checklist with undo confirmation | Done |
| Manual entry — description / merchant fields, word-based categorize | Done |
| Gallery OCR + overlay bubble (dev client) | Done |
| Transactions ledger + charts + detail sheet | Done |
| Vault — active / completed goals, SIP age-based target hint | Done |
| Settings — playbook, buckets, keywords, notifications, CSV export | Done |
| Docs — `core-function.md`, `design-and-features.md` | Done |

---

## Next (device verification)

### OCR

- [ ] EAS dev client: `eas build --profile development --platform android`
- [ ] Gallery scan with real eSewa/Khalti receipts; tune `lib/ocr-templates/`

### Overlay

- [ ] Dev client build (`npx expo prebuild --clean && npx expo run:android`)
- [ ] Grant overlay + **app usage access** + screen capture in Settings → Scan Bubble
- [ ] Bubble visible only on whitelisted apps (eSewa, Khalti, Chrome, …)
- [ ] Tap bubble → headless OCR → transaction saved with `source: overlay` + toast

See [docs/overlay-v2.md](./docs/overlay-v2.md) for architecture.

### Polish

- [x] Home reorder, EF in Future, compact ring chips, section animations (see `design-and-features.md`)
- [ ] Geist Mono fonts per `docs/design.md` (optional)
- [ ] Auto-create recurring drafts on month start (PRD F5)

---

## Exploratory (no timeline)

AI insights in `ai/` — tap-triggered only, no chat. Needs 3+ months of real data first.
