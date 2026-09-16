# Payment watch — usage access + reply notification

**Date:** 2026-08-19  
**Status:** Implemented  
**App:** SpendSense

## Constraint

No MediaProjection, no screenshot, no SYSTEM_ALERT_WINDOW overlay, no Accessibility service.

## Flow

1. Payment Helper watches user-selected launchable apps. Installed eSewa and nBank variants are selected by default.
2. **Persistent helper** defaults on and keeps one quiet foreground-service notification for reliable detection. Turning it off keeps the watcher in best-effort mode, which Android may stop.
3. After a selected app has been in the foreground for the configured delay (**5 seconds** by default): amount + Log.
4. After Log: Living bucket choices use native RemoteInput. Selection stays in the notification shade over the payment app; notification-body tap opens the full fallback picker.
5. After bucket (or amount-only if no buckets): no log again until you **leave** that payment app.

The watcher holds the selected payment app through brief System UI foreground events so opening the notification shade does not dismiss the prompt. Delay (0–60 seconds), target apps, persistent mode, and helper enabled state are stored in Android SharedPreferences and configurable from **Settings → Notif.**

## Save

Amount insert is flagged. Chip tap sets `bucket_id` and `is_flagged = 0`.
