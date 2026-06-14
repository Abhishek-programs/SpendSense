import { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Overlay, isOverlayAvailable } from '@/lib/overlay'
import { DEFAULT_OVERLAY_TARGET_APPS } from '@/constants/overlay-targets'
import { colors } from '@/constants/colors'

/**
 * Bridge component demonstrating permission flow + BubbleModule.startBubble().
 * Wire into Settings or a dev screen to test the scan bubble overlay.
 */
export function ScanBubbleBridge() {
  const [overlayPerm, setOverlayPerm] = useState(false)
  const [usagePerm, setUsagePerm] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [bubbleEnabled, setBubbleEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  const refreshPermissions = useCallback(async () => {
    if (!isOverlayAvailable()) return
    const [overlay, usage] = await Promise.all([
      Overlay.isPermissionGranted(),
      Overlay.checkUsagePermission(),
    ])
    setOverlayPerm(overlay)
    setUsagePerm(usage)
  }, [])

  useEffect(() => {
    refreshPermissions()
  }, [refreshPermissions])

  const handleOverlayPermission = () => {
    Overlay.requestPermission()
    setTimeout(refreshPermissions, 800)
  }

  const handleUsagePermission = () => {
    Overlay.requestUsagePermission()
    setTimeout(refreshPermissions, 800)
  }

  const handleMediaProjection = async () => {
    try {
      setBusy(true)
      await Overlay.requestMediaProjection()
      setMediaReady(true)
    } catch (e: any) {
      Alert.alert('Screen capture', e?.message ?? 'Permission denied')
      setMediaReady(false)
    } finally {
      setBusy(false)
    }
  }

  const handleToggleBubble = async (enabled: boolean) => {
    if (!isOverlayAvailable()) {
      Alert.alert(
        'Not available',
        'Bubble overlay requires a dev client build with the native BubbleModule.',
      )
      return
    }

    try {
      setBusy(true)
      if (enabled) {
        if (!overlayPerm || !usagePerm) {
          Alert.alert('Permissions required', 'Grant overlay and app usage access first.')
          return
        }
        if (!mediaReady) {
          await handleMediaProjection()
        }
        await Overlay.start(DEFAULT_OVERLAY_TARGET_APPS)
        setBubbleEnabled(true)
      } else {
        await Overlay.stop()
        setBubbleEnabled(false)
      }
    } catch (e: any) {
      Alert.alert('Overlay error', e?.message ?? 'Could not toggle bubble')
      setBubbleEnabled(false)
    } finally {
      setBusy(false)
    }
  }

  if (!isOverlayAvailable()) {
    return (
      <View style={styles.card}>
        <Text style={styles.unavailable}>Native BubbleModule not found — rebuild dev client.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Scan Bubble (dev bridge)</Text>

      <PermissionRow
        label="Draw over other apps"
        granted={overlayPerm}
        onPress={handleOverlayPermission}
      />
      <PermissionRow
        label="App usage access"
        granted={usagePerm}
        onPress={handleUsagePermission}
      />
      <TouchableOpacity style={styles.row} onPress={handleMediaProjection} disabled={busy}>
        <Text style={styles.label}>Screen capture access</Text>
        <Ionicons
          name={mediaReady ? 'checkmark-circle' : 'chevron-forward'}
          size={22}
          color={mediaReady ? colors.green : colors.textMuted}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, bubbleEnabled && styles.primaryBtnActive]}
        onPress={() => handleToggleBubble(!bubbleEnabled)}
        disabled={busy || !overlayPerm || !usagePerm}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>
            {bubbleEnabled ? 'Stop bubble' : 'Start bubble'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Targets: {DEFAULT_OVERLAY_TARGET_APPS.slice(0, 3).join(', ')}…
      </Text>
    </View>
  )
}

function PermissionRow({
  label,
  granted,
  onPress,
}: {
  label: string
  granted: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <Ionicons
        name={granted ? 'checkmark-circle' : 'close-circle'}
        size={22}
        color={granted ? colors.green : colors.red}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.textPrimary,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnActive: {
    backgroundColor: colors.textSecond,
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  hint: {
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textMuted,
  },
  unavailable: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
})
