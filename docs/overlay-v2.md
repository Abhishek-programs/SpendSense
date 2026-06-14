# SpendSense — Android Scan Bubble (V2)

> Bubble overlay architecture reference. For project rules see [AGENTS.md](../AGENTS.md). For capture → categorize logic see [core-function.md](./core-function.md).

**Status:** Shipped in codebase · **device verification pending** (dev client required)

---

## What it does

A **floating scan bubble** over whitelisted Android apps (eSewa, Khalti, Chrome, etc.):

1. User enables bubble in **Settings → Scan Bubble** (overlay + app usage + screen capture permissions)
2. Green draggable bubble appears only when a **whitelisted app** (or SpendSense itself) is in the foreground
3. Tap bubble → bubble hides → `MediaProjection` captures screen → JPEG saved to app cache
4. **Headless JS task** runs OCR via existing `lib/ocr.ts` (`rn-mlkit-ocr`), categorizes, saves transaction with `source: 'overlay'`
5. Toast confirmation — user stays in their banking app

---

## End-to-end flow

```
Settings (permissions + toggle)
    → BubbleModule.startBubble(whitelist)
    → ScreenshotBubbleService (foreground, mediaProjection)
        → UsageStats poll (1s) → show/hide bubble
        → tap → ScreenCaptureHelper → cache JPEG
        → ScreenshotHeadlessTaskService
            → Headless JS "ScreenshotTask" (index.js)
                → lib/overlay-headless.ts
                    → processReceiptImage → categorize → addTransaction
```

---

## Native Kotlin (source of truth)

**Repo path:** `native/android/screenshotbubble/`  
**Prebuild copy target:** `android/app/src/main/java/com/screenshotbubble/`  
**Applied by:** `plugins/withSpendSenseOverlay.js`

| File | Role |
|------|------|
| `BubbleModule.kt` | RN bridge (`"BubbleModule"`) — permissions, MediaProjection, start/stop |
| `BubblePackage.kt` | Registers `BubbleModule` in `MainApplication` |
| `ScreenshotBubbleService.kt` | Foreground service, usage-stats whitelist, bubble lifecycle |
| `BubbleOverlayView.kt` | `TYPE_APPLICATION_OVERLAY` draggable bubble, snap-to-edge, long-press stop |
| `ScreenCaptureHelper.kt` | `ImageReader` + stride-safe bitmap → JPEG in `cacheDir` |
| `ScreenshotHeadlessTaskService.kt` | Extends `HeadlessJsTaskService` → task `"ScreenshotTask"` |

### Permissions (manifest via config plugin)

- `SYSTEM_ALERT_WINDOW` — draw over other apps
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PROJECTION`
- `PACKAGE_USAGE_STATS` — whitelist visibility gating

### Services (manifest)

```xml
<service
    android:name="com.screenshotbubble.ScreenshotBubbleService"
    android:foregroundServiceType="mediaProjection"
    android:exported="false"/>
<service
    android:name="com.screenshotbubble.ScreenshotHeadlessTaskService"
    android:exported="false"/>
```

### Gradle (via config plugin)

- `kotlinx-coroutines-android:1.7.3` — capture + usage polling
- **No native ML Kit** — OCR runs in JS via `rn-mlkit-ocr`

---

## BubbleModule API (JavaScript)

Bridge: `lib/overlay.ts` → `NativeModules.BubbleModule`

| Method | Purpose |
|--------|---------|
| `checkOverlayPermission()` | `Settings.canDrawOverlays` |
| `requestOverlayPermission()` | Opens overlay settings |
| `checkUsagePermission()` | App usage access granted |
| `requestUsagePermission()` | Opens `ACTION_USAGE_ACCESS_SETTINGS` |
| `requestMediaProjectionPermission()` | System screen-capture dialog |
| `startBubble(resultCode, targetApps)` | Start foreground service with whitelist |
| `stopBubble()` | Stop service and remove bubble |

JS wrapper: `Overlay.start(targetApps?)` passes `resultCode: -1` (uses stored MediaProjection token from activity result).

Default whitelist: `constants/overlay-targets.ts`

---

## JavaScript / TypeScript

| File | Role |
|------|------|
| `index.js` | Entry point — registers `ScreenshotTask` headless worker, then `expo-router/entry` |
| `lib/overlay-headless.ts` | Headless pipeline: DB init → `processReceiptImage` → categorize → `addTransaction` |
| `lib/overlay.ts` | Typed bridge to `BubbleModule` |
| `hooks/useOverlay.ts` | No-op (OCR runs in headless task, not via event listener) |
| `components/overlay/ScanBubbleBridge.tsx` | Dev/test UI for permission flow |
| `app/(tabs)/settings.tsx` | Production Scan Bubble section |

### Headless task registration

```javascript
// index.js
AppRegistry.registerHeadlessTask('ScreenshotTask', () => async (taskData) => {
  await runScreenshotHeadlessTask(taskData.screenshotPath)
})
import 'expo-router/entry'
```

`package.json` `"main": "index.js"` (required for headless task).

---

## Key design decisions

| Topic | Choice |
|-------|--------|
| **Language** | Kotlin (matches Expo Android template) |
| **OCR location** | JS headless worker — reuses `lib/ocr.ts` templates, `validateReceipt`, `parseOcrText` |
| **Bubble visibility** | Hidden on non-whitelisted apps via `UsageStatsManager` (1s poll) |
| **Capture** | Bubble set `GONE` before screenshot so it is not in the image |
| **Transaction source** | `'overlay'` in schema |
| **Platform** | Android only — guard all JS with `Platform.OS === 'android'` |

---

## Settings UX (Scan Bubble)

1. **Draw over other apps** — overlay permission
2. **App usage access** — usage-stats permission (required for whitelist)
3. **Screen capture access** — MediaProjection consent
4. **Enable bubble** toggle — calls `Overlay.start()` / `Overlay.stop()`

Toggle disabled until overlay + usage permissions granted.

---

## Rebuild & test

```bash
npx expo prebuild --clean
npx expo run:android
```

**Device test checklist:**

- [ ] Overlay permission granted
- [ ] App usage access granted (Settings → Apps → Special access)
- [ ] Screen capture dialog accepted
- [ ] Bubble visible over eSewa/Khalti, hidden on launcher/Settings
- [ ] Tap bubble → transaction appears in Ledger with source "Bubble"
- [ ] Flagged flow works for ambiguous receipts

---

## Hard rules (do not break)

- Keep overlay changes scoped to `native/android/screenshotbubble/`, `plugins/withSpendSenseOverlay.js`, `lib/overlay*.ts`, `index.js`, Settings scan-bubble UI
- **Do not** add a second native OCR path — use `processReceiptImage` in headless worker
- **Do not** run bubble without usage-stats permission (whitelist gating is intentional)
- No network — on-device OCR only
- If OCR fails or no amount → toast "Could not read", **do not save**
- Foreground service notification is non-dismissible while bubble is active

---

## Deprecated (removed)

The earlier Kotlin `native/android/overlay/` design used:

- `OverlayModule` + `OcrResultBridge` event emitter
- Native ML Kit OCR in Kotlin
- Bubble always visible (no app whitelist)

Do not restore that architecture alongside the current bubble module.
