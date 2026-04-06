import '../global.css'
import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { db, ensureMigrationsApplied } from '@/db/client'
import { migrations } from '@/db/migrations'
import { seedDefaults } from '@/db/seed'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { getMonthRange } from '@/lib/month'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const { success: migrationSuccess, error: migrationError } = useMigrations(db, migrations)
  const { loadPlaybook, monthStartDay, isOnboarded, isLoaded: playbookLoaded } = usePlaybookStore()
  const { loadBuckets } = useBucketsStore()
  const { loadTransactions } = useTransactionsStore()
  const { loadGoals } = useGoalsStore()

  useEffect(() => {
    if (migrationSuccess || migrationError) {
      // Ensure migrations are applied (fallback if useMigrations didn't work)
      ensureMigrationsApplied()
        .then(() => seedDefaults())
        .then(() => loadPlaybook())
        .catch(() => {
          // If migrations still fail, just try loading anyway
          loadPlaybook()
        })
    }
  }, [migrationSuccess, migrationError])

  // Load remaining stores after playbook is loaded (we need monthStartDay)
  useEffect(() => {
    if (!playbookLoaded) return
    const { start, end } = getMonthRange(monthStartDay)
    loadBuckets()
    loadTransactions(start, end)
    loadGoals()
  }, [playbookLoaded])

  // Hide splash and redirect once everything is ready
  useEffect(() => {
    const ready = (fontsLoaded || fontError) && (migrationSuccess || migrationError) && playbookLoaded
    if (!ready) return
    SplashScreen.hideAsync()
    if (!isOnboarded) {
      router.replace('/onboarding')
    }
  }, [fontsLoaded, fontError, migrationSuccess, migrationError, playbookLoaded, isOnboarded])

  // Safety net: force hide splash after 5s in case something hangs
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync(), 5000)
    return () => clearTimeout(t)
  }, [])

  if (!fontsLoaded && !fontError) return null
  if (!migrationSuccess && !migrationError) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  )
}
