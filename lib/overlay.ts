import { NativeModules, Platform } from 'react-native'
import { DEFAULT_OVERLAY_TARGET_APPS } from '@/constants/overlay-targets'

const BubbleModule = NativeModules.BubbleModule

export const Overlay = {
  checkUsagePermission: (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !BubbleModule?.checkUsagePermission) {
      return Promise.resolve(false)
    }
    return BubbleModule.checkUsagePermission()
  },

  requestUsagePermission: (): void => {
    if (Platform.OS !== 'android' || !BubbleModule?.requestUsagePermission) return
    BubbleModule.requestUsagePermission()
  },

  isPermissionGranted: (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !BubbleModule?.checkOverlayPermission) {
      return Promise.resolve(false)
    }
    return BubbleModule.checkOverlayPermission()
  },

  requestPermission: (): void => {
    if (Platform.OS !== 'android' || !BubbleModule?.requestOverlayPermission) return
    BubbleModule.requestOverlayPermission()
  },

  requestMediaProjection: (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !BubbleModule?.requestMediaProjectionPermission) {
      return Promise.resolve(false)
    }
    return BubbleModule.requestMediaProjectionPermission()
  },

  start: (targetApps: string[] = DEFAULT_OVERLAY_TARGET_APPS): Promise<boolean> => {
    if (Platform.OS !== 'android' || !BubbleModule?.startBubble) {
      return Promise.resolve(false)
    }
    return BubbleModule.startBubble(-1, targetApps)
  },

  stop: (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !BubbleModule?.stopBubble) {
      return Promise.resolve(false)
    }
    return BubbleModule.stopBubble()
  },
}

export function isOverlayAvailable(): boolean {
  return Platform.OS === 'android' && !!NativeModules.BubbleModule
}
