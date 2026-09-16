import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from '@/components/ui/Card'
import { colors } from '@/constants/colors'
import { requestPermissions } from '@/lib/notifications'
import {
  getPaymentWatchDelaySeconds,
  getPaymentWatchEnabled,
  getPaymentWatchLaunchableApps,
  getPaymentWatchPersistent,
  getPaymentWatchTargetPackages,
  hasPaymentWatchNotificationPermission,
  hasPaymentWatchUsageAccess,
  isPaymentWatchAvailable,
  openPaymentWatchNotificationSettings,
  openPaymentWatchUsageSettings,
  PaymentWatchApp,
  setPaymentWatchDelaySeconds,
  setPaymentWatchEnabled,
  setPaymentWatchPersistent,
  setPaymentWatchTargetPackages,
} from '@/lib/payment-watch'

export default function NotificationSettingsScreen() {
  const available = isPaymentWatchAvailable()
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [usageAccess, setUsageAccess] = useState(false)
  const [notificationAccess, setNotificationAccess] = useState(false)
  const [persistent, setPersistent] = useState(true)
  const [delay, setDelay] = useState('5')
  const [apps, setApps] = useState<PaymentWatchApp[]>([])
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const refresh = useCallback(async () => {
    if (!available) {
      setLoading(false)
      return
    }
    try {
      const [isEnabled, hasAccess, hasNotifications, isPersistent, delaySeconds, targets, launchable] =
        await Promise.all([
          getPaymentWatchEnabled(),
          hasPaymentWatchUsageAccess(),
          hasPaymentWatchNotificationPermission(),
          getPaymentWatchPersistent(),
          getPaymentWatchDelaySeconds(),
          getPaymentWatchTargetPackages(),
          getPaymentWatchLaunchableApps(),
        ])
      setEnabled(isEnabled)
      setUsageAccess(hasAccess)
      setNotificationAccess(hasNotifications)
      setPersistent(isPersistent)
      setDelay(String(Math.round(delaySeconds)))
      setSelectedPackages(targets)
      setApps(launchable)
    } catch {
      Alert.alert('Could not load notification settings', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [available])

  useEffect(() => {
    refresh()
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  const filteredApps = useMemo(() => {
    const installedPackages = new Set(apps.map(app => app.packageName))
    const unavailable = selectedPackages
      .filter(packageName => !installedPackages.has(packageName))
      .map(packageName => ({
        packageName,
        label:
          packageName.includes('esewa')
            ? 'eSewa (not installed)'
            : packageName === 'com.f1soft.nabilmbank'
              ? 'nBank (not installed)'
              : `${packageName} (not installed)`,
      }))
    const selectableApps = [...apps, ...unavailable]
    const query = search.trim().toLowerCase()
    if (!query) return selectableApps
    return selectableApps.filter(
      app =>
        app.label.toLowerCase().includes(query) ||
        app.packageName.toLowerCase().includes(query),
    )
  }, [apps, search, selectedPackages])

  const toggleHelper = async (value: boolean) => {
    if (value && selectedPackages.length === 0) {
      Alert.alert('Choose an app', 'Select at least one app to watch first.')
      return
    }
    if (value && !(await requestPermissions())) {
      Alert.alert(
        'Notifications are off',
        'Allow notifications for SpendSense in Android settings before enabling Payment Helper.',
      )
      return
    }
    const result = await setPaymentWatchEnabled(value)
    setEnabled(value)
    if (value && result === 'needs_usage_access') {
      Alert.alert(
        'Usage access needed',
        'Allow SpendSense to see which app is open. It does not read or record your screen.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open settings', onPress: openPaymentWatchUsageSettings },
        ],
      )
    }
    await refresh()
  }

  const togglePersistent = async (value: boolean) => {
    setPersistent(value)
    await setPaymentWatchPersistent(value)
  }

  const saveDelay = async () => {
    const parsed = Number(delay)
    const next = Number.isFinite(parsed) ? Math.round(Math.max(0, Math.min(60, parsed))) : 5
    setDelay(String(next))
    await setPaymentWatchDelaySeconds(next)
  }

  const toggleApp = async (packageName: string) => {
    const next = selectedPackages.includes(packageName)
      ? selectedPackages.filter(item => item !== packageName)
      : [...selectedPackages, packageName]
    if (enabled && next.length === 0) {
      Alert.alert('Keep one app selected', 'Turn off Payment Helper before removing every app.')
      return
    }
    setSelectedPackages(next)
    await setPaymentWatchTargetPackages(next)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notif.</Text>
        <View style={{ width: 24 }} />
      </View>

      {!available ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Development build required</Text>
          <Text style={styles.helpText}>
            Payment Helper is Android-only and is unavailable in Expo Go.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Payment helper</Text>
          <Card>
            <SettingRow
              label="Payment Helper"
              detail="Show a payment prompt in selected apps"
              value={enabled}
              onValueChange={toggleHelper}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Persistent helper"
              detail="Keep detection reliable in the background"
              value={persistent}
              onValueChange={togglePersistent}
            />
            {!persistent && (
              <Text style={styles.warning}>
                Best-effort mode: Android may stop the helper, so some prompts can be missed.
              </Text>
            )}
            {enabled && !usageAccess && (
              <>
                <View style={styles.divider} />
                <Text style={styles.warning}>
                  Usage access is off. SpendSense cannot detect the selected apps.
                </Text>
                <TouchableOpacity style={styles.outlineButton} onPress={openPaymentWatchUsageSettings}>
                  <Text style={styles.outlineButtonText}>Grant usage access</Text>
                </TouchableOpacity>
              </>
            )}
            {enabled && !notificationAccess && (
              <>
                <View style={styles.divider} />
                <Text style={styles.warning}>
                  Android notifications are off, so payment prompts cannot appear.
                </Text>
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={openPaymentWatchNotificationSettings}
                >
                  <Text style={styles.outlineButtonText}>Open notification settings</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>

          <Text style={styles.sectionTitle}>Timing</Text>
          <Card>
            <View style={styles.delayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Show after</Text>
                <Text style={styles.rowDetail}>Delay after a selected app opens</Text>
              </View>
              <TextInput
                value={delay}
                onChangeText={text => setDelay(text.replace(/[^0-9]/g, ''))}
                onBlur={saveDelay}
                onSubmitEditing={saveDelay}
                keyboardType="number-pad"
                returnKeyType="done"
                style={styles.delayInput}
                selectTextOnFocus
                accessibilityLabel="Notification delay in seconds"
              />
              <Text style={styles.seconds}>sec</Text>
            </View>
          </Card>

          <View style={styles.appsHeading}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Apps</Text>
              <Text style={styles.sectionDetail}>
                {selectedPackages.length} selected
              </Text>
            </View>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search installed apps"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
          />
          <Card style={styles.appsCard}>
            {filteredApps.length === 0 ? (
              <Text style={styles.helpText}>No matching launchable apps.</Text>
            ) : (
              filteredApps.map((app, index) => {
                const selected = selectedPackages.includes(app.packageName)
                return (
                  <View key={app.packageName}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.appRow}
                      onPress={() => toggleApp(app.packageName)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={styles.appInitial}>
                        <Text style={styles.appInitialText}>
                          {app.label.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{app.label}</Text>
                        <Text style={styles.packageName}>{app.packageName}</Text>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={23}
                        color={selected ? colors.green : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                )
              })
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function SettingRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string
  detail: string
  value: boolean
  onValueChange: (value: boolean) => void
}) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.greenFill }}
        thumbColor={value ? colors.green : '#f4f3f4'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionDetail: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: -4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  rowDetail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },
  warning: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: colors.amber,
    marginTop: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  outlineButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  delayRow: { flexDirection: 'row', alignItems: 'center' },
  delayInput: {
    minWidth: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.pageBg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  seconds: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
    marginLeft: 6,
  },
  appsHeading: { flexDirection: 'row', alignItems: 'flex-end' },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  appsCard: { paddingVertical: 6 },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  appInitial: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenFill,
    marginRight: 12,
  },
  appInitialText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
  },
  packageName: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
})
