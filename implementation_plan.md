# SpendSense — Phase 3, 4 & 5 Implementation Plan

## Overview

This plan covered the three phases of SpendSense development. **All phases are now complete.**

---

## Phase 3 — Goals & Vault ✅

### Step 8.1: Goals Store — CRUD ✅
- Added `addGoal`, `updateGoal`, `deleteGoal` to `store/goals.ts`

### Step 8.2: Emergency Fund Goal — Auto-Derived ✅
- EF pseudo-goal computed from `playbook.efFloor` and `__savings_confirm__` transactions
- Uses stable `EF_BUCKET_ID` for lookup
- Pinned at top of Vault list

### Step 8.3: Create / Edit Goal Sheet ✅
- `components/goals/AddGoalSheet.tsx` — bottom sheet with name, target, monthly contribution, target date, linked bucket picker
- Supports both create and edit modes

### Step 8.4: Delete Goal ✅
- Delete button with Alert confirmation in `GoalDetailSheet.tsx`

### Step 8.5: Goal Card — Balance Calculation Fix ✅
- Only counts transactions with `remarks === '__savings_confirm__'` as contributions

### Step 8.6: Vault Summary Card ✅
- Renamed to "Total Saved"
- Shows EF coverage months and total monthly commitment

---

## Phase 4 — Onboarding Refinement ✅

### Step 9.1: Onboarding Step 3 — Review Default Buckets ✅
- `app/onboarding/buckets.tsx` — shows all buckets with inline amount editing and toggle

### Step 9.2: Onboarding Step 4 — Set EF Floor ✅
- `app/onboarding/ef-floor.tsx` — auto-suggests `efFloor = monthlyIncome * 4`

### Step 9.3: Onboarding Step 5 — Initial Balances ✅
- `app/onboarding/balances.tsx` — EF and equity balance inputs, seeds `netWorthSnapshots`

### Step 9.4: EF Bucket — Mandatory and Smart ✅
- `EF_BUCKET_ID = 'ef'` in `constants/defaults.ts`
- `db/seed.ts` uses stable ID for EF bucket
- `store/buckets.ts` guards deactivation
- `settings.tsx` shows Protected badge

---

## Phase 5 — Home Polish & Flagged Flow ✅

### Step 5.1: Remove MonthSnapshotRow ✅
- Removed from Home screen (redundant with NetWorthCard)

### Step 5.2: FutureSection — Show All Savings/Investment Buckets ✅
- Already working via `getSavingsBuckets()` which includes both types

### Step 5.3: LivingSection — Spending Placeholder ✅
- Shows "No transactions yet this month" when bucket has zero spend

### Step 5.4: Header Height Consistency ✅
- All 4 tabs use `paddingTop: 64` — verified consistent

---

## Files Modified

| File | Change |
|---|---|
| `store/goals.ts` | Added CRUD actions |
| `components/goals/AddGoalSheet.tsx` | NEW — create/edit goal sheet |
| `components/goals/GoalDetailSheet.tsx` | Added delete, edit wiring |
| `app/(tabs)/goals.tsx` | EF pseudo-goal, fixed balance calc, summary polish |
| `app/onboarding/_layout.tsx` | Added 3 new screens |
| `app/onboarding/money.tsx` | Routes to buckets instead of finishing |
| `app/onboarding/buckets.tsx` | NEW — review/edit buckets |
| `app/onboarding/ef-floor.tsx` | NEW — set EF floor |
| `app/onboarding/balances.tsx` | NEW — initial balances |
| `constants/defaults.ts` | Added EF_BUCKET_ID |
| `db/seed.ts` | Uses stable EF_BUCKET_ID |
| `store/buckets.ts` | EF deactivation guard |
| `app/(tabs)/settings.tsx` | Protected badge for EF |
| `app/(tabs)/index.tsx` | Removed MonthSnapshotRow |
| `components/home/LivingSection.tsx` | Empty bucket placeholder |
| `lib/projection.ts` | Cleaned unused import |
