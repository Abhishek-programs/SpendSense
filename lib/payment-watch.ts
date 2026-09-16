import { NativeModules, Platform } from 'react-native'

export interface PaymentWatchApp {
  label: string
  packageName: string
}

const DEFAULT_TARGET_PACKAGES = [
  'com.f1soft.esewa',
  'com.esewa',
  'com.f1soft.nabilmbank',
]

const Native = NativeModules.PaymentWatch as
  | {
      isEnabled: () => Promise<boolean>
      hasUsageAccess: () => Promise<boolean>
      hasNotificationPermission: () => Promise<boolean>
      isPersistentHelper: () => Promise<boolean>
      setPersistentHelper: (persistent: boolean) => Promise<boolean>
      getLogDelayMs: () => Promise<number>
      setLogDelayMs: (delayMs: number) => Promise<boolean>
      getTargetPackages: () => Promise<string[]>
      setTargetPackages: (packages: string[]) => Promise<boolean>
      getLaunchableApps: () => Promise<PaymentWatchApp[]>
      setEnabled: (enabled: boolean) => Promise<string>
      openUsageAccessSettings: () => Promise<boolean>
      openNotificationSettings: () => Promise<boolean>
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

export async function getPaymentWatchPersistent(): Promise<boolean> {
  if (!Native) return true
  return Native.isPersistentHelper()
}

export async function setPaymentWatchPersistent(persistent: boolean): Promise<void> {
  if (!Native) return
  await Native.setPersistentHelper(persistent)
}

export async function getPaymentWatchDelaySeconds(): Promise<number> {
  if (!Native) return 5
  return (await Native.getLogDelayMs()) / 1000
}

export async function setPaymentWatchDelaySeconds(seconds: number): Promise<void> {
  if (!Native) return
  await Native.setLogDelayMs(Math.round(Math.max(0, Math.min(60, seconds)) * 1000))
}

export async function getPaymentWatchTargetPackages(): Promise<string[]> {
  if (!Native) return DEFAULT_TARGET_PACKAGES
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

export async function startPaymentWatchIfEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.startIfEnabled()
}
