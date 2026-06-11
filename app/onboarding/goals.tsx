import { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated'
import { addMonths, format } from 'date-fns'
import { colors } from '@/constants/colors'
import { useGoalsStore } from '@/store/goals'
import { useBucketsStore } from '@/store/buckets'
import { formatNPR } from '@/lib/format'
import { DEFAULT_MACBOOK_GOAL } from '@/constants/defaults'
import { OnboardingBack } from '@/components/onboarding/OnboardingBack'
import {
  type PaymentMode,
  computeGoalPlan,
  backCalcMonthly,
  monthsBetween,
  parseTargetDate,
  projectDateFromMonthly,
  savingsPaceSliderMax,
  GOAL_BUCKET_LABELS,
} from '@/lib/goals/plan'

type PaymentChoice = 'pay_in_full' | 'upfront_emi' | 'not_sure'

interface GoalDraft {
  id: string
  enabled: boolean
  name: string
  targetAmount: string
  targetDate: string
  alreadySaved: string
  paymentChoice: PaymentChoice
  upfrontAmount: number
  emiTenureMonths: string
  /** Committed monthly after Apply; null = use back-calc from target date */
  committedMonthly: number | null
  /** Slider preview before Apply */
  sliderMonthly: number
  paceApplied: boolean
}

function newGoalDraft(overrides?: Partial<GoalDraft>): GoalDraft {
  const defaultDate = format(addMonths(new Date(), DEFAULT_MACBOOK_GOAL.monthsFromNow), 'yyyy-MM')
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    enabled: true,
    name: DEFAULT_MACBOOK_GOAL.name,
    targetAmount: String(DEFAULT_MACBOOK_GOAL.targetAmount),
    targetDate: defaultDate,
    alreadySaved: '0',
    paymentChoice: 'not_sure',
    upfrontAmount: Math.round(DEFAULT_MACBOOK_GOAL.targetAmount * 0.44),
    emiTenureMonths: '12',
    committedMonthly: null,
    sliderMonthly: 0,
    paceApplied: false,
    ...overrides,
  }
}

function paymentModeFromChoice(choice: PaymentChoice): PaymentMode {
  return choice === 'upfront_emi' ? 'upfront_emi' : 'pay_in_full'
}

function GoalDraftCard({
  draft,
  onChange,
  onRemove,
  canRemove,
}: {
  draft: GoalDraft
  onChange: (patch: Partial<GoalDraft>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const target = parseFloat(draft.targetAmount) || 0
  const saved = parseFloat(draft.alreadySaved) || 0
  const targetDateObj = parseTargetDate(draft.targetDate, DEFAULT_MACBOOK_GOAL.monthsFromNow)
  const monthsRemaining = monthsBetween(new Date(), targetDateObj)
  const backCalc = backCalcMonthly(target, saved, monthsRemaining)
  const paymentMode = paymentModeFromChoice(draft.paymentChoice)
  const emiTenure = parseInt(draft.emiTenureMonths, 10) || 12

  const effectiveMonthly = draft.committedMonthly ?? backCalc
  const sliderMax = savingsPaceSliderMax(backCalc, Math.max(0, target - saved))
  const sliderValue = draft.paceApplied ? effectiveMonthly : (draft.sliderMonthly || backCalc)

  const previewDate = projectDateFromMonthly(target, saved, sliderValue)
  const currentDateLabel = format(targetDateObj, 'MMM yyyy')
  const previewDateLabel = format(parseTargetDate(previewDate), 'MMM yyyy')

  const plan = useMemo(
    () =>
      computeGoalPlan({
        targetAmount: target,
        alreadySaved: saved,
        targetDate: targetDateObj,
        paymentMode,
        upfrontAmount: draft.upfrontAmount,
        emiTenureMonths: emiTenure,
        totalMonthlyOverride: effectiveMonthly,
      }),
    [target, saved, targetDateObj, paymentMode, draft.upfrontAmount, emiTenure, effectiveMonthly]
  )

  const handleTargetDateChange = (v: string) => {
    onChange({
      targetDate: v,
      committedMonthly: null,
      paceApplied: false,
      sliderMonthly: 0,
    })
  }

  const handleApplyPace = () => {
    onChange({
      committedMonthly: sliderValue,
      targetDate: previewDate,
      paceApplied: true,
      sliderMonthly: sliderValue,
    })
  }

  if (!draft.enabled) {
    return (
      <View style={[styles.card, styles.cardDisabled]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{draft.name || 'Big purchase'}</Text>
          <Switch
            value={draft.enabled}
            onValueChange={v => onChange({ enabled: v })}
            trackColor={{ false: colors.border, true: colors.green + '50' }}
            thumbColor={colors.textMuted}
          />
        </View>
        <Text style={styles.pausedHint}>Paused — enable when you're ready to save for this</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Big purchase</Text>
        <Switch
          value={draft.enabled}
          onValueChange={v => onChange({ enabled: v })}
          trackColor={{ false: colors.border, true: colors.green + '50' }}
          thumbColor={colors.green}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>GOAL NAME</Text>
        <TextInput
          style={styles.textInput}
          value={draft.name}
          onChangeText={v => onChange({ name: v })}
          placeholder="MacBook"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TARGET AMOUNT</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={styles.input}
            value={draft.targetAmount}
            onChangeText={v => onChange({ targetAmount: v, committedMonthly: null, paceApplied: false })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TARGET DATE (YYYY-MM)</Text>
        <TextInput
          style={styles.textInput}
          value={draft.targetDate}
          onChangeText={handleTargetDateChange}
          placeholder="2027-03"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>ALREADY SAVED</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>NPR</Text>
          <TextInput
            style={styles.input}
            value={draft.alreadySaved}
            onChangeText={v => onChange({ alreadySaved: v, committedMonthly: null, paceApplied: false })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      <Text style={[styles.label, { marginTop: 8 }]}>HOW ARE YOU PLANNING TO PAY?</Text>
      {(
        [
          { key: 'pay_in_full' as const, label: 'Save up and pay in full', sub: 'One savings bucket — simplest' },
          { key: 'upfront_emi' as const, label: 'Pay part upfront, rest in EMI', sub: 'Pay upfront + EMI reserve from day 1' },
          { key: 'not_sure' as const, label: 'Not sure yet', sub: 'Starts simple — change later in Goals' },
        ] as const
      ).map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.paymentOption, draft.paymentChoice === opt.key && styles.paymentOptionActive]}
          onPress={() => onChange({ paymentChoice: opt.key, committedMonthly: null, paceApplied: false })}
        >
          <View style={[styles.radio, draft.paymentChoice === opt.key && styles.radioActive]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.paymentLabel}>{opt.label}</Text>
            <Text style={styles.paymentSub}>{opt.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {draft.paymentChoice === 'upfront_emi' && target > 0 && (
        <View style={styles.emiBlock}>
          <Text style={styles.label}>HOW MUCH UPFRONT?</Text>
          <Text style={styles.upfrontValue}>NPR {formatNPR(draft.upfrontAmount)}</Text>
          <Slider
            minimumValue={Math.round(target * 0.1)}
            maximumValue={Math.round(target * 0.9)}
            step={5000}
            value={draft.upfrontAmount}
            onValueChange={v => onChange({ upfrontAmount: v, committedMonthly: null, paceApplied: false })}
            minimumTrackTintColor={colors.green}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.green}
          />
          <Text style={styles.emiRemainder}>
            Remainder for EMI: NPR {formatNPR(Math.max(0, target - draft.upfrontAmount))}
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMI TENURE (MONTHS)</Text>
            <TextInput
              style={styles.textInput}
              value={draft.emiTenureMonths}
              onChangeText={v => onChange({ emiTenureMonths: v, committedMonthly: null, paceApplied: false })}
              keyboardType="numeric"
              placeholder="12"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      )}

      <View style={styles.calcCard}>
        <Text style={styles.calcLabel}>Monthly needed</Text>
        <Text style={styles.calcValue}>NPR {formatNPR(plan.totalMonthly)}</Text>
        <Text style={styles.calcHint}>
          {monthsRemaining} months until {currentDateLabel}
        </Text>
        {paymentMode === 'upfront_emi' && plan.buckets.length > 1 && (
          <View style={styles.splitPreview}>
            {plan.buckets.map(b => (
              <Text key={b.role} style={styles.splitLine}>
                {GOAL_BUCKET_LABELS[b.role].title}: NPR {formatNPR(b.monthlyAmount)}/mo
              </Text>
            ))}
          </View>
        )}
      </View>

      {target > saved && backCalc > 0 && (
        <View style={styles.paceBlock}>
          <Text style={styles.paceTitle}>Save faster?</Text>
          <Text style={styles.paceHint}>
            Slide to save more each month — we'll update your target date when you tap Apply.
          </Text>
          <Text style={styles.paceAmount}>Save NPR {formatNPR(sliderValue)}/mo</Text>
          <Slider
            minimumValue={backCalc}
            maximumValue={sliderMax}
            step={500}
            value={sliderValue}
            onValueChange={v => onChange({ sliderMonthly: v, paceApplied: false })}
            minimumTrackTintColor={colors.green}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.green}
          />
          <Text style={styles.pacePreview}>
            Reach by {currentDateLabel}
            {sliderValue !== backCalc ? ` → ${previewDateLabel}` : ''}
          </Text>
          {sliderValue !== effectiveMonthly && (
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPace}>
              <Text style={styles.applyBtnText}>Apply new pace</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {canRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeText}>Remove this goal</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function OnboardingGoalsScreen() {
  const { createGoalWithBuckets } = useGoalsStore()
  const { loadBuckets } = useBucketsStore()
  const [drafts, setDrafts] = useState<GoalDraft[]>(() => [newGoalDraft()])

  const updateDraft = useCallback((id: string, patch: Partial<GoalDraft>) => {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)))
  }, [])

  const addDraft = () => {
    setDrafts(prev => [
      ...prev,
      newGoalDraft({ enabled: false, name: '', targetAmount: '100000', paymentChoice: 'not_sure' }),
    ])
  }

  const removeDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id))
  }

  const handleNext = async () => {
    for (const draft of drafts) {
      if (!draft.enabled) continue
      const target = parseFloat(draft.targetAmount) || 0
      if (target <= 0 || !draft.name.trim()) continue

      const saved = parseFloat(draft.alreadySaved) || 0
      const targetDateObj = parseTargetDate(draft.targetDate, DEFAULT_MACBOOK_GOAL.monthsFromNow)
      const monthsRemaining = monthsBetween(new Date(), targetDateObj)
      const backCalc = backCalcMonthly(target, saved, monthsRemaining)
      const paymentMode = paymentModeFromChoice(draft.paymentChoice)
      const monthly = draft.committedMonthly ?? backCalc

      await createGoalWithBuckets({
        name: draft.name.trim(),
        targetAmount: target,
        monthlyContribution: monthly,
        targetDate: draft.paceApplied ? draft.targetDate : (draft.targetDate.trim() || null),
        startBalance: saved,
        paymentMode,
        upfrontAmount: paymentMode === 'upfront_emi' ? draft.upfrontAmount : undefined,
        emiTenureMonths: parseInt(draft.emiTenureMonths, 10) || 12,
        isEnabled: true,
      })
    }
    await loadBuckets()
    router.push('/onboarding/buckets')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <OnboardingBack />
        <Animated.View entering={FadeInDown.duration(800).delay(200)}>
          <View style={styles.iconContainer}>
            <Ionicons name="flag" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Goals</Text>
          <Text style={styles.subtitle}>
            Name your big purchases. We'll figure out how much to save each month.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.draftsArea}>
          {drafts.map((draft, i) => (
            <GoalDraftCard
              key={draft.id}
              draft={draft}
              onChange={patch => updateDraft(draft.id, patch)}
              onRemove={() => removeDraft(draft.id)}
              canRemove={drafts.length > 1}
            />
          ))}

          {drafts.length < 5 && (
            <TouchableOpacity style={styles.addGoalBtn} onPress={addDraft}>
              <Ionicons name="add-circle-outline" size={22} color={colors.green} />
              <Text style={styles.addGoalText}>Add another big purchase</Text>
            </TouchableOpacity>
          )}
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
    marginBottom: 28,
  },
  draftsArea: { gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
    borderCurve: 'continuous',
  },
  cardDisabled: { opacity: 0.7 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  pausedHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  inputGroup: { gap: 8 },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  textInput: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
    paddingVertical: 10,
  },
  prefix: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginRight: 10,
  },
  input: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  paymentOptionActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenFill,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 2,
  },
  radioActive: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  paymentSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  emiBlock: { gap: 8 },
  upfrontValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  emiRemainder: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
  },
  calcCard: {
    backgroundColor: colors.greenFill,
    borderRadius: 14,
    padding: 16,
    borderCurve: 'continuous',
  },
  calcLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  calcValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  calcHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginTop: 4,
  },
  splitPreview: { marginTop: 10, gap: 4 },
  splitLine: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  paceBlock: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  paceTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  paceHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    lineHeight: 18,
  },
  paceAmount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  pacePreview: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  applyBtn: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  addGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.green,
    borderStyle: 'dashed',
  },
  addGoalText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.green,
  },
  removeBtn: { alignSelf: 'flex-start' },
  removeText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.red,
  },
  spacer: { flex: 1, minHeight: 24 },
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
