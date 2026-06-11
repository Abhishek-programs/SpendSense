# Build Order

What's shipped and what's next. For stack and rules see [AGENTS.md](./AGENTS.md). For screen specs see [docs/screen-flows.md](./docs/screen-flows.md). Master plan: [.cursor/plans/spendsense_flow_alignment_d489d75a.plan.md](./.cursor/plans/spendsense_flow_alignment_d489d75a.plan.md).

---

## Shipped

| Area | Status |
|---|---|
| DB + Drizzle + seed + migrations (incl. `0005` goal payment mode) | Done |
| Goal payment UX — Pay upfront / EMI reserve, per-goal buckets | Done |
| Zustand stores + root hydration | Done |
| 6-step onboarding (Foundations → Goals → Bucket Builder) | Done |
| Home — dual safe-to-spend HeroRing, MetricPills, EFGoalCard | Done |
| Net worth from EF start + goal startBalance | Done |
| SIP fixed confirm + Shares editable ShareConfirmSheet | Done |
| Dev mock-data inject (`__DEV__` in Settings) | Done |
| Gallery OCR — `rn-mlkit-ocr`, `lib/ocr.ts`, per-app templates in `lib/ocr-templates/` | Done |
| ManualEntrySheet OCR pre-fill + bucket pre-select + `source: 'ocr'` | Done |
| Transaction source badges (OCR / Bubble / eSewa / Khalti when detectable) | Done |
| Overlay — Kotlin module (`native/android/overlay/`) + config plugin + TS layer | Done |
| `eas.json` development profile for dev client builds | Done |
| Manual entry + center [+] FAB | Done |
| Categorization (3-step) + flagged prompt | Done |
| Transactions list, detail sheet, charts | Done |
| Goals + EF pseudo-goal + projections | Done |
| Month start checklist | Done |
| Notifications + settings toggles | Done |

---

## Next (device verification)

### OCR

- [ ] EAS dev client build: `eas build --profile development --platform android`
- [ ] Test gallery scan with real eSewa/Khalti receipts; iterate templates in `lib/ocr-templates/`

### Overlay V2

- [ ] Dev client build (same profile — includes overlay native module)
- [ ] Grant draw-over + screen capture in Settings → Scan Bubble
- [ ] Tap bubble over banking app → silent save + toast
- [ ] Flagged transactions review flow

### Polish

- [ ] Geist Mono fonts per design.md (optional)
- [ ] Auto-create recurring drafts on month start (PRD F5)

---

## Exploratory (no timeline)

AI insights layer in `ai/` — tap-triggered only, no chat. Needs 3+ months of real data first.
