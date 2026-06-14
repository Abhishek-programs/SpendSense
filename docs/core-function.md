# SpendSense — Core Function

**Platform:** Android · React Native + Expo · NPR only

---

## What this app is

SpendSense is a **playbook-first personal finance app** for Nepal. The user defines how their monthly take-home income should be split across named buckets (spending, savings, investments, goals). Every expense or transfer confirmation is logged against a bucket. The Home screen answers:

> *How much can I spend right now — and am I on track with saving and investing?*

It is **not** a bank aggregator. It tracks **intentional money**: planned allocations, spending, confirmed saves/invests, and deliberate set-asides (EF, goals, SIP, shares).

---

## Mental model

```
Monthly take-home (playbook)
    ├── Allocated to buckets (monthly plan)
    ├── Actually spent (lifestyle + Personal draws)
    ├── Confirmed saved/invested (__savings_confirm__)
    └── Remaining → safe to spend / available balance / month-end carry-forward
```

**Playbook** — income, month start day, EF floor, EF start balance, user name, age (optional), carried-forward balance.

**Buckets** — monthly amounts, types (`spending` | `savings` | `investment`). Regular spending resets each month. **Personal** accumulates with top-up + cap.

**Transactions** — amount, date, bucket, **description** (user label), merchant (OCR place name), remarks (OCR notes), source, optional flag.

**Goals** — targets with linked savings bucket(s); can complete and archive.

---

## Core loops

### 1. Capture → categorize → inform
1. Log via **Manual Entry** (center FAB), **gallery OCR**, or **scan bubble** (dev client)
2. **Categorization** (priority):
   - Keyword word match in description / remarks / merchant
   - Sure-shot merchant (Settings)
   - Fallback bucket → **flagged**
3. Home and Ledger update

### 2. Month rhythm
- **Month Start Checklist:** confirm salary (unlocks safe to spend) + savings/investment transfers
- **Future section:** confirm EF/goals (fixed) or SIP/Shares (editable)
- **Month rollover:** Personal top-up + cap; surplus → carried-forward; cap override reset

### 3. Safe to spend vs available balance

| Concept | Meaning |
|---------|---------|
| **Safe to spend** (ring) | Lifestyle budgets remaining + unallocated income, after salary confirmed. Excludes carry-forward. |
| **Available balance** (Your money, collapsed) | max(0, safe to spend) + carried-forward |
| **Intentional savings** (Your money, expanded) | EF + goals + SIP + shares (not bank cash) |

---

## Bucket behaviors

### Regular spending (Core Living, Dates, Fun)
- Monthly budget resets; bar = spent / limit
- Core Living: household & groceries

### Personal fund
- Top-up each month, balance rolls over, cap default NPR 20,000
- Cap prompts: reallocate, raise cap, or raise for specific purchase

### Savings / investment
- Confirmed via `__savings_confirm__` transactions
- EF target = 6× **Core Living** monthly amount

### Goals
- Complete at target → archived in Vault; prompt to reallocate freed monthly amount

---

## Categorization (do not change lightly)
1. Keyword word match in description / remarks / merchant
2. Sure-shot merchant (exact)
3. Fallback + flag

Only sure-shot merchants are memorized from flagged review.

---

## Data storage
- SQLite + Drizzle, on-device only
- Zustand: playbook, buckets, transactions, goals
- Internal remark tokens: `__salary__`, `__savings_confirm__`

---

## Out of scope (V1)
- Bank balance sync, recurring auto-drafts, share-intent capture, iOS, cloud sync, portfolio returns
