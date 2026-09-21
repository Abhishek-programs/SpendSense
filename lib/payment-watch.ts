import { NativeModules, Platform } from 'react-native'

export type PaymentWatchApp = {
  packageName: string
  label: string
}

const Native = NativeModules.PaymentWatch as
  | {
      isEnabled: () => Promise<boolean>
      hasUsageAccess: () => Promise<boolean>
      hasNotificationPermission: () => Promise<boolean>
      getLogDelayMs: () => Promise<number>
      setLogDelayMs: (delayMs: number) => Promise<boolean>
      setEnabled: (enabled: boolean) => Promise<string>
      openUsageAccessSettings: () => Promise<boolean>
      openNotificationSettings: () => Promise<boolean>
      setTargetPackages: (packages: string[]) => Promise<boolean>
      getTargetPackages: () => Promise<string[]>
      getLaunchableApps: () => Promise<PaymentWatchApp[]>
      startIfEnabled: () => Promise<boolean>
    }
  | undefined

export function isPaymentWatchAvailable(): boolean {
  return Platform.OS === 'android' && Native != null
}

export async function getPaymentWatchEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.isEnabled()
}

export async function hasPaymentWatchUsageAccess(): Promise<boolean> {
  if (!Native) return false
  return Native.hasUsageAccess()
}

export async function hasPaymentWatchNotificationPermission(): Promise<boolean> {
  if (!Native) return false
  return Native.hasNotificationPermission()
}

export async function getPaymentWatchDelaySeconds(): Promise<number> {
  if (!Native) return 5
  const ms = await Native.getLogDelayMs()
  return Math.round(ms / 1000)
}

export async function setPaymentWatchDelaySeconds(seconds: number): Promise<void> {
  if (!Native) return
  const clamped = Math.max(0, Math.min(60, Math.round(seconds)))
  await Native.setLogDelayMs(clamped * 1000)
}

export async function setPaymentWatchEnabled(enabled: boolean): Promise<string> {
  if (!Native) return 'unavailable'
  return Native.setEnabled(enabled)
}

export async function openPaymentWatchUsageSettings(): Promise<void> {
  if (!Native) return
  await Native.openUsageAccessSettings()
}

export async function openPaymentWatchNotificationSettings(): Promise<void> {
  if (!Native) return
  await Native.openNotificationSettings()
}

export async function getPaymentWatchTargetPackages(): Promise<string[]> {
  if (!Native) return []
  return Native.getTargetPackages()
}

export async function setPaymentWatchTargetPackages(packages: string[]): Promise<void> {
  if (!Native) return
  await Native.setTargetPackages(packages)
}

export async function getPaymentWatchLaunchableApps(): Promise<PaymentWatchApp[]> {
  if (!Native) return []
  return Native.getLaunchableApps()
}

export async function startPaymentWatchIfEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.startIfEnabled()
}
