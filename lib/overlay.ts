import { NativeModules, NativeEventEmitter, Platform } from 'react-native'

export type OcrResult = {
  rawText: string
  timestamp: number
}

const OverlayModule = NativeModules.OverlayModule
const OcrResultBridge = NativeModules.OcrResultBridge

export const Overlay = {
  start: (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !OverlayModule?.startOverlay) {
      return Promise.resolve(false)
    }
    return OverlayModule.startOverlay()
  },
  stop: (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !OverlayModule?.stopOverlay) {
      return Promise.resolve(false)
    }
    return OverlayModule.stopOverlay()
  },
  isPermissionGranted: (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !OverlayModule?.isOverlayPermissionGranted) {
      return Promise.resolve(false)
    }
    return OverlayModule.isOverlayPermissionGranted()
  },
  requestPermission: (): void => {
    if (Platform.OS !== 'android' || !OverlayModule?.requestOverlayPermission) return
    OverlayModule.requestOverlayPermission()
  },
  requestMediaProjection: (): void => {
    if (Platform.OS !== 'android' || !OverlayModule?.requestMediaProjectionPermission) return
    OverlayModule.requestMediaProjectionPermission()
  },
  onOcrResult: (cb: (result: OcrResult) => void) => {
    if (Platform.OS !== 'android' || !OcrResultBridge) {
      return { remove: () => {} }
    }
    const emitter = new NativeEventEmitter(OcrResultBridge)
    return emitter.addListener('onOcrResult', cb)
  },
}

export function isOverlayAvailable(): boolean {
  return Platform.OS === 'android' && !!NativeModules.OverlayModule
}
