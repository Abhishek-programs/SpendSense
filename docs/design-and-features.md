# SpendSense — Design & Features

**Theme:** Light · `#F7F8FA` · green `#16A34A` · Inter  
**See also:** [`design.md`](design.md) (color tokens) · [`core-function.md`](core-function.md) (logic)

---

## Navigation

```
Home | Ledger | [+ FAB] | Vault | Settings
```

Center **green FAB** → Manual Entry / Scan Receipt (not a tab).

---

## Home

### Your money card (collapsed default)
| Collapsed | Expanded |
|-----------|----------|
| **available balance** | **intentional savings** + breakdown (EF, goals, SIP, Shares) |
| | Remaining this month + carried-forward if > 0 |

### Hero ring
- **Center:** Safe to spend (locked until salary confirmed this month)
- **Arcs:** grey unallocated · teal outline planned savings · green available · red spent · teal solid saved · yellow flagged
- **Pills** (small, on ring edge): days left, invested, spent, to invest / saved ✓, carried forward

### Living
Core Living, Dates, Fun (budget bars) · Personal (fund bar, rolls over)

### Future
EF + goals: fixed confirm · SIP/Shares: editable · placeholder when no big-spend goal

---

## Ledger

List / Chart toggle · filters · flagged amber border · **description** as main line, merchant as subtitle when different

---

## Vault

Active goals · Completed (archived) · SIP suggested target when age set · inline monthly edit in detail sheet

---

## Manual Entry

Field order: **Amount** (auto-focus) → Bucket → **Description** → Merchant (optional, OCR)  
Manual: remarks empty. OCR: merchant + remarks from receipt.

---

## Settings

Playbook (income, month start, EF floor, age) · buckets · keywords · sure-shot merchants · notifications · scan bubble · CSV export · reset all data

---

## Onboarding (6 steps)

1. Name  
2. Money — take-home, **cash on hand**, month start, age (optional)  
3. Foundations — **Core Living** → EF target = 6× that, current EF balance  
4. Goals — slider locks after Apply  
5. Bucket builder — income meter, spending + Personal + goals + EF/SIP/Shares  
6. Starting balances — SIP + Shares to date  

---

## Key formulas

```
effectiveIncome      = salary txn amount if confirmed this month else 0
safeToSpend          = spendingPlan - lifestyleSpent - personalDraws + max(0, effectiveIncome - totalAllocations)
availableBalance     = max(0, safeToSpend) + carriedForwardBalance
efFloor              = coreLiving × 6
suggestSipTarget     = income × 12 × max(10, 60 - age) × 0.15  (when age set)
```

---

## Status

| Feature | Status |
|---------|--------|
| Home finance UX overhaul | Shipped |
| Description field + word categorize | Shipped |
| OCR + bubble UI | Shipped, device testing |
| Recurring drafts | Not shipped |
