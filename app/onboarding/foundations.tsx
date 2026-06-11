import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { colors } from '@/constants/colors'
import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { formatNPR } from '@/lib/format'
import { EF_MULTIPLIER, CORE_LIVING_BUCKET_ID } from '@/constants/defaults'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'

export default function OnboardingFoundationsScreen() {
  const { updatePlaybook } = usePlaybookStore()
  const { buckets, updateBucket } = useBucketsStore()

  const coreLivingBucket = buckets.find(
    b => b.id === CORE_LIVING_BUCKET_ID || b.name === 'Core Living',
  )
  const defaultCore = coreLivingBucket?.monthlyAmount ?? 50000

  const [coreLiving, setCoreLiving] = useState(String(defaultCore))
  const [efFloor, setEfFloor] = useState(String(EF_MULTIPLIER * defaultCore))
  const [efBalance, setEfBalance] = useState('')

  const coreAmount = parseFloat(coreLiving) || defaultCore
  const suggestedFloor = EF_MULTIPLIER * coreAmount

  const handleNext = async () => {
    const floorValue = parseFloat(efFloor) || suggestedFloor
    const balanceValue = parseFloat(efBalance) || 0

    if (coreLivingBucket) {
      await updateBucket(coreLivingBucket.id, { monthlyAmount: coreAmount })
    }
    await updatePlaybook({ efFloor: floorValue, efStartBalance: balanceValue })
    router.push('/onboarding/goals')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingBack />
        <Animated.View entering={FadeInDown.duration(800).delay(200)}>
          <View style={styles.iconContainer}>
            <Ionicons name="home" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Foundations</Text>
          <Text style={styles.subtitle}>
            These two numbers anchor everything else — your core living costs and emergency fund.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.formArea}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CORE LIVING (MONTHLY)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>NPR</Text>
              <TextInput
                style={styles.input}
                value={coreLiving}
                onChangeText={v => {
                  setCoreLiving(v)
                  const amt = parseFloat(v) || 0
                  if (amt > 0) setEfFloor(String(EF_MULTIPLIER * amt))
                }}
                keyboardType="numeric"
                placeholder={String(defaultCore)}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Text style={styles.hint}>Rent, utilities, groceries, transport</Text>
          </View>

          <View style={styles.suggestionCard}>
            <Ionicons name="sparkles" size={18} color={colors.green} />
            <Text style={styles.suggestionText}>
              We suggest NPR {formatNPR(suggestedFloor)} ({EF_MULTIPLIER}× core living) as your EF target.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EF TARGET (FLOOR)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>NPR</Text>
              <TextInput
                style={styles.input}
                value={efFloor}
                onChangeText={setEfFloor}
                keyboardType="numeric"
                placeholder={String(suggestedFloor)}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CURRENT EF BALANCE</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.prefix}>NPR</Text>
              <TextInput
                style={styles.input}
                value={efBalance}
                onChangeText={setEfBalance}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Text style={styles.hint}>How much you already have saved in your emergency fund</Text>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInRight.duration(600).delay(600)}>
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 60,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    lineHeight: 22,
    marginBottom: 32,
  },
  formArea: { gap: 28 },
  inputGroup: { gap: 12 },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 12,
  },
  prefix: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginRight: 12,
  },
  input: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.greenFill,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderCurve: 'continuous',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  spacer: { flex: 1, minHeight: 32 },
  button: {
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    borderCurve: 'continuous',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
})
