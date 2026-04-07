# SpendSense — Build Order

> Track what's shipped and what's next. Check boxes as steps complete.
> Each step lists the files it touches and what "done" means.

---

## Phase 1 — Foundation (Completed ✅)

### Step 1: DB schema + Drizzle setup
- [x] `db/schema.ts` — 7 tables + `type` column + `user_name` column
- [x] `db/client.ts` — expo-sqlite + Drizzle init, `runMigrations()`
- [x] `db/seed.ts` — seed default playbook, 8 buckets, keyword mappings (idempotent)
- [x] `db/migrations/` — m0000, m0001, m0002 (automated with manual registry)
- [x] `constants/defaults.ts` — default bucket values, income, EF floor, keyword map

### Step 2: Pulse screen — "Safe to Spend" dashboard
- [x] `app/(tabs)/index.tsx` — Home screen: HeroRing + Living + Future + Snapshot
- [x] Standardized Header (64px padding) + Dynamic Greeting ("Good Morning, Abhishek")
- [x] `components/home/HeroRing.tsx` — SVG ring, Safe to Spend center, weekly rate
- [x] `components/home/LivingSection.tsx` — spending buckets with progress bars
- [x] `components/home/FutureSection.tsx` — savings checklist (one-way check)
- [x] `components/home/MonthSnapshotRow.tsx` — Basic Income/Saved/Spent summary
- [ ] **[TODO]** Expand Net Worth Card: Tap for asset breakdown (EF, MacBook, Shares)

### Step 3: Zustand stores + wire Pulse to live data
- [x] `store/playbook.ts` — income, start day, EF floor, `userName`, `isOnboarded`
- [x] `store/buckets.ts` — bucket list, keyword mappings, sure-shot merchants
- [x] `store/transactions.ts` — CRUD, spentByBucket, getTotalIncome
- [x] `store/goals.ts` — goal definitions
- [x] `app/_layout.tsx` — DB init -> migration -> seed -> hydration

---

## Phase 2 — Core Transaction Flow (In Progress 🚧)

### Step 4: Manual Entry center [+] button
- [x] `app/(tabs)/_layout.tsx` — Center circular raised green FAB
- [x] `components/manual-entry/ManualEntrySheet.tsx` — Amount-first form, bucket chips, remarks hint
- [x] Integration with `lib/categorize.ts` logic
- [x] **[TODO]** Mode toggle: Manual vs Scan Receipt (PRD F1/F5)

### Step 5: Categorization engine
- [x] `lib/categorize.ts` — 3-step logic: Remarks suffix -> Sure-shot -> Fallback + Flag
- [x] Bucket auto-selection based on remarks suffix ("keyword -")
- [ ] **[TODO]** Wire into OCR flow (Step 11)

### Step 6: Ledger screen (Transactions tab)
- [x] `app/(tabs)/transactions.tsx` — List grouped by date, Filter chips, Summary row
- [x] `components/transactions/TransactionRow.tsx` — bucket pill, merchant, amount
- [x] `components/transactions/TransactionDetailSheet.tsx` — reassign bucket, delete
- [ ] **[TODO]** `ChartsView.tsx` — Donut breakdown, 6-Month Trend, Milestone markers
- [ ] **[TODO]** Annual View toggle (PRD F11)

### Step 7: Flagged transaction prompt (PRD F4 / Flow 9)
- [ ] `app/(tabs)/index.tsx` — Amber banner shown when `transactions.filter(t => t.isFlagged)` is not empty
- [ ] `components/flagged/FlaggedTransactionPrompt.tsx` — Bottom sheet identifying "Needs Review" items
- [ ] Sequential walkthrough of flagged items (1 of N)
- [ ] Assignment clears flag bit in DB

---

## Phase 3 — Goals + Planning 🎯

### Step 8: Vault / Goals screen
- [ ] `app/(tabs)/goals.tsx` — Goal cards with circular progress rings
- [ ] `components/goals/GoalDetailSheet.tsx` — Details view, history list, edit button
- [ ] `lib/projection.ts` — Linear math for "Days remaining" and "Projected Date"
- [ ] `components/goals/SensitivityNudge.tsx` — "Add NPR X/month to finish Y months sooner"

### Step 9: Onboarding & Setup
- [ ] `app/onboarding/` — 7-step first-launch wizard (Phase 1 built core 2 steps)
  1. [x] Welcome / Personal Info (Step 1)
  2. [x] Set monthly income & month start day (Step 2)
  3. [ ] Review default buckets (edit amounts)
  4. [ ] Set EF floor
  5. [ ] Initial balances (EF, shares)
  6. [ ] Add sure-shot merchants (optional)
  7. [x] Confirmation + mark `isOnboarded = true`
- [x] `store/playbook.ts` — `setOnboarded()` logic
- [x] `app/(tabs)/settings.tsx` — Playbook edit, Bucket/Keyword/Merchant CRUD
- [x] Developer: Clear All Data / Reset

---

## Phase 4 — Advanced Features (Completed ✅)

### Step 10: Month Start Checklist (PRD F10)
- [x] Modal/Banner on 1st of month
- [x] Confirm salary received, confirm fixed transfers (SIP, EF, etc.)
- [x] Auto-create recurring drafts (PRD F5)

### Step 11: OCR Scanner (F1)
- [ ] Pre-fill feedback loop into ManualEntrySheet

### Step 12: Notifications & Nudges (F9)
- [ ] `expo-notifications` 1-per-day limit logic
- [ ] Quiet hours (10pm - 8am)
- [ ] Nudge triggers: 80% ceiling, investment pending, EF milestone

---

## Dependency Graph

```
Step 1 ──> Step 2 ──> Step 3 ──> Step 4 ──> Step 5
                                    │          │
                                    v          v
                                  Step 6    Step 7
                                    │
                                    v
                                  Step 8
                                    │
                                    v
                          Step 9 + Step 10
                                    │
                                    v
                            Step 11 + Step 12
```
