# Payment watch — usage access + reply notification

**Date:** 2026-08-19  
**Status:** Implemented  
**App:** SpendSense

## Constraint

No MediaProjection, no screenshot, no SYSTEM_ALERT_WINDOW overlay, no Accessibility service.

Detect eSewa / nBank via **Usage access** (`UsageStatsManager`). Show an **ongoing notification** with **RemoteInput** for amount. Insert a flagged expense into `spendsense.db` from native code. User assigns a bucket on next app open (`FlaggedTransactionPrompt`).

## Apps (default)

| Label | Package |
|-------|---------|
| eSewa | `com.f1soft.esewa`, `com.esewa` |
| nBank (Nabil) | `com.f1soft.nabilmbank` |

## Permissions

- `PACKAGE_USAGE_STATS` (granted in system Usage access screen)
- `POST_NOTIFICATIONS`
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE`
- `RECEIVE_BOOT_COMPLETED`

## Save

Expense, amount from the reply, merchant = eSewa or nBank, `bucket_id` = playbook fallback or `core-living`, `is_flagged = 1`, `source = notification`.
