import { useEffect } from 'react'

import { View, Text, StyleSheet } from 'react-native'

import Animated, {

  useSharedValue,

  useAnimatedStyle,

  withRepeat,

  withSequence,

  withTiming,

  Easing,

  useAnimatedProps,

  FadeIn,

  interpolate,

} from 'react-native-reanimated'

import Svg, { Circle, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg'

import { Ionicons } from '@expo/vector-icons'

import { colors } from '@/constants/colors'

import { formatNPR, formatNPRShort } from '@/lib/format'



type FinancialStatus = 'on-track' | 'caution' | 'overspending' | 'uncategorized'



interface HeroRingProps {

  totalIncome: number

  actualSafeToSpend: number

  safeBeforeInvestments: number

  plannedSavings: number

  flaggedAmount: number

  daysRemaining: number

  weeklyRate: number

  totalSpent: number

  stillToSave: number

  stillToInvest: number

  lifestyleSpent: number

}



const SIZE = 248

const STROKE = 12

const RADIUS = (SIZE - STROKE) / 2

const CIRCUMFERENCE = 2 * Math.PI * RADIUS



const AnimatedCircle = Animated.createAnimatedComponent(Circle)



function getStatus(

  actualSafeToSpend: number,

  totalIncome: number,

  flaggedAmount: number,

  daysRemaining: number,

  totalSpent: number,

  plannedSavings: number,

): { status: FinancialStatus; label: string; icon: string; color: string } {

  if (actualSafeToSpend < 0) {

    return { status: 'overspending', label: 'Overspending', icon: 'trending-down', color: colors.red }

  }

  if (flaggedAmount > 0) {

    return { status: 'uncategorized', label: 'Needs attention', icon: 'alert-circle', color: colors.amber }

  }

  if (totalIncome > 0 && daysRemaining > 0) {

    const totalDays = 30

    const elapsed = totalDays - daysRemaining

    const elapsedRatio = elapsed / totalDays

    const spentRatio = totalSpent / (totalIncome - plannedSavings || 1)

    if (spentRatio > elapsedRatio + 0.15) {

      return { status: 'caution', label: 'Spending fast', icon: 'speedometer', color: colors.amber }

    }

  }

  return { status: 'on-track', label: 'On track', icon: 'trending-up', color: colors.green }

}



interface FloatPillProps {

  label: string

  value: string

  accent?: string

  style: object

  animStyle: object

}



function FloatPill({ label, value, accent, style, animStyle }: FloatPillProps) {

  return (

    <Animated.View style={[styles.floatPill, style, animStyle]}>

      <Text style={styles.floatLabel}>{label}</Text>

      <Text style={[styles.floatValue, accent ? { color: accent } : null]}>{value}</Text>

    </Animated.View>

  )

}



export function HeroRing({

  totalIncome,

  actualSafeToSpend,

  safeBeforeInvestments,

  plannedSavings,

  flaggedAmount,

  daysRemaining,

  weeklyRate,

  totalSpent,

  stillToSave,

  stillToInvest,

  lifestyleSpent,

}: HeroRingProps) {

  const isOverspent = actualSafeToSpend < 0

  const showSavingsWedge = plannedSavings > 0 && safeBeforeInvestments !== actualSafeToSpend

  const cx = SIZE / 2

  const cy = SIZE / 2



  const { label: statusLabel, icon: statusIcon, color: statusColor } = getStatus(

    actualSafeToSpend, totalIncome, flaggedAmount, daysRemaining, totalSpent, plannedSavings,

  )



  const denom = totalIncome > 0 ? totalIncome : 1



  const spentRatioSV = useSharedValue(0)

  const savingsRatioSV = useSharedValue(0)

  const actualRatioSV = useSharedValue(0)

  const yellowRatioSV = useSharedValue(0)

  const centerPulse = useSharedValue(0)

  const floatY = useSharedValue(0)



  useEffect(() => {

    const targetSpent = Math.max(0, Math.min(totalSpent / denom, 1))

    const targetSavings = showSavingsWedge

      ? Math.max(0, Math.min(plannedSavings / denom, 1 - targetSpent))

      : 0

    const targetActual = Math.max(0, Math.min(Math.max(0, actualSafeToSpend) / denom, 1 - targetSpent - targetSavings))

    const targetYellow = Math.max(0, Math.min(flaggedAmount / denom, 1 - targetSpent - targetSavings - targetActual))



    spentRatioSV.value = withTiming(targetSpent, { duration: 1200, easing: Easing.out(Easing.exp) })

    savingsRatioSV.value = withTiming(targetSavings, { duration: 1200, easing: Easing.out(Easing.exp) })

    actualRatioSV.value = withTiming(targetActual, { duration: 1200, easing: Easing.out(Easing.exp) })

    yellowRatioSV.value = withTiming(targetYellow, { duration: 1200, easing: Easing.out(Easing.exp) })



    centerPulse.value = withRepeat(

      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),

      -1,

      true,

    )

    floatY.value = withRepeat(

      withSequence(

        withTiming(-3, { duration: 2600, easing: Easing.inOut(Easing.ease) }),

        withTiming(3, { duration: 2600, easing: Easing.inOut(Easing.ease) }),

      ),

      -1,

      true,

    )

  }, [totalSpent, plannedSavings, actualSafeToSpend, flaggedAmount, denom, showSavingsWedge])



  const spentProps = useAnimatedProps(() => ({

    strokeDashoffset: CIRCUMFERENCE * (1 - spentRatioSV.value),

  }))



  const savingsProps = useAnimatedProps(() => {

    const dash = CIRCUMFERENCE * savingsRatioSV.value

    const gap = CIRCUMFERENCE * (1 - savingsRatioSV.value)

    return {

      strokeDasharray: `${dash} ${gap}`,

      rotation: -90 + spentRatioSV.value * 360,

    }

  })



  const actualProps = useAnimatedProps(() => {

    const dash = CIRCUMFERENCE * actualRatioSV.value

    const gap = CIRCUMFERENCE * (1 - actualRatioSV.value)

    return {

      strokeDasharray: `${dash} ${gap}`,

      rotation: -90 + (spentRatioSV.value + savingsRatioSV.value) * 360,

    }

  })



  const yellowProps = useAnimatedProps(() => {

    const dash = CIRCUMFERENCE * yellowRatioSV.value

    const gap = CIRCUMFERENCE * (1 - yellowRatioSV.value)

    return {

      strokeDasharray: `${dash} ${gap}`,

      rotation: -90 + (spentRatioSV.value + savingsRatioSV.value + actualRatioSV.value) * 360,

    }

  })



  const floatAnimStyle = useAnimatedStyle(() => ({

    transform: [{ translateY: floatY.value }],

  }))



  const centerAnimStyle = useAnimatedStyle(() => ({

    transform: [{ scale: interpolate(centerPulse.value, [0, 1], [1, 1.02]) }],

    opacity: interpolate(centerPulse.value, [0, 1], [0.95, 1]),

  }))



  const displayAmount = Math.max(0, actualSafeToSpend)



  return (

    <Animated.View entering={FadeIn.duration(800)} style={styles.container}>

      <FloatPill

        label={`${daysRemaining}d left`}

        value="this month"

        style={styles.pillTopRight}

        animStyle={floatAnimStyle}

      />



      {stillToSave > 0 && (

        <FloatPill

          label="Still to save"

          value={formatNPRShort(stillToSave)}

          accent={colors.savingsSetAside}

          style={styles.pillTopLeft}

          animStyle={floatAnimStyle}

        />

      )}



      <FloatPill

        label="Spent"

        value={formatNPRShort(lifestyleSpent)}

        style={styles.pillBottomLeft}

        animStyle={floatAnimStyle}

      />



      {stillToInvest > 0 ? (

        <FloatPill

          label="Still to invest"

          value={formatNPRShort(stillToInvest)}

          accent={colors.green}

          style={styles.pillBottomRight}

          animStyle={floatAnimStyle}

        />

      ) : plannedSavings > 0 && stillToSave === 0 ? (

        <FloatPill

          label="Saved"

          value="✓ done"

          accent={colors.green}

          style={styles.pillBottomRight}

          animStyle={floatAnimStyle}

        />

      ) : null}



      <Svg width={SIZE} height={SIZE}>

        <Defs>

          <LinearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">

            <Stop offset="0%" stopColor={colors.green} stopOpacity="0.8" />

            <Stop offset="100%" stopColor={colors.green} stopOpacity="1" />

          </LinearGradient>

          <LinearGradient id="savingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">

            <Stop offset="0%" stopColor={colors.savingsSetAside} stopOpacity="0.7" />

            <Stop offset="100%" stopColor={colors.savingsSetAsideLight} stopOpacity="0.9" />

          </LinearGradient>

          <LinearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">

            <Stop offset="0%" stopColor={colors.amber} stopOpacity="0.8" />

            <Stop offset="100%" stopColor={colors.amber} stopOpacity="1" />

          </LinearGradient>

          <LinearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">

            <Stop offset="0%" stopColor={colors.red} stopOpacity="0.8" />

            <Stop offset="100%" stopColor={colors.red} stopOpacity="1" />

          </LinearGradient>

          <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">

            <Stop offset="0%" stopColor={statusColor} stopOpacity="0.08" />

            <Stop offset="100%" stopColor={statusColor} stopOpacity="0" />

          </RadialGradient>

        </Defs>



        <Circle cx={cx} cy={cy} r={RADIUS} stroke="#E8EAED" strokeWidth={STROKE} fill="none" />



        {!isOverspent && (

          <Circle cx={cx} cy={cy} r={RADIUS - 20} fill="url(#centerGlow)" />

        )}



        {isOverspent ? (

          <AnimatedCircle

            cx={cx}

            cy={cy}

            r={RADIUS}

            stroke="url(#redGrad)"

            strokeWidth={STROKE}

            fill="none"

            strokeLinecap="round"

            animatedProps={spentProps}

          />

        ) : (

          <>

            {showSavingsWedge && (

              <AnimatedCircle

                cx={cx}

                cy={cy}

                r={RADIUS}

                stroke="url(#savingsGrad)"

                strokeWidth={STROKE - 2}

                fill="none"

                strokeLinecap="round"

                origin={`${cx}, ${cy}`}

                animatedProps={savingsProps}

              />

            )}



            <AnimatedCircle

              cx={cx}

              cy={cy}

              r={RADIUS}

              stroke="url(#greenGrad)"

              strokeWidth={STROKE}

              fill="none"

              strokeLinecap="round"

              origin={`${cx}, ${cy}`}

              animatedProps={actualProps}

            />



            <AnimatedCircle

              cx={cx}

              cy={cy}

              r={RADIUS}

              stroke="#DC2626"

              strokeWidth={STROKE}

              fill="none"

              strokeDasharray={`${CIRCUMFERENCE}`}

              strokeLinecap="round"

              rotation={-90}

              origin={`${cx}, ${cy}`}

              opacity={0.35}

              animatedProps={spentProps}

            />



            {flaggedAmount > 0 && (

              <AnimatedCircle

                cx={cx}

                cy={cy}

                r={RADIUS}

                stroke="url(#yellowGrad)"

                strokeWidth={STROKE - 4}

                fill="none"

                strokeLinecap="round"

                origin={`${cx}, ${cy}`}

                animatedProps={yellowProps}

              />

            )}

          </>

        )}

      </Svg>



      <Animated.View style={[styles.centerText, centerAnimStyle]}>

        <Text style={styles.label}>SAFE TO SPEND NOW</Text>

        <Text style={[styles.amount, isOverspent && { color: colors.red }]}>

          {isOverspent ? '-' : ''}NPR {formatNPR(Math.abs(isOverspent ? actualSafeToSpend : displayAmount))}

        </Text>

        <Text style={styles.centerSub}>

          after NPR {formatNPR(plannedSavings)} set aside

        </Text>

        <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>

          <Ionicons name={statusIcon as any} size={13} color={statusColor} />

          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>

        </View>

      </Animated.View>



      <Text style={styles.weekly}>

        ≈ NPR {formatNPR(Math.round(weeklyRate))}/week · {formatNPRShort(lifestyleSpent)} spent on lifestyle

      </Text>



      <View style={styles.legend}>

        <View style={styles.legendItem}>

          <View style={[styles.legendDot, { backgroundColor: colors.green }]} />

          <Text style={styles.legendText}>Available</Text>

        </View>

        {showSavingsWedge && (

          <View style={styles.legendItem}>

            <View style={[styles.legendDot, { backgroundColor: colors.savingsSetAside }]} />

            <Text style={styles.legendText}>To save & invest</Text>

          </View>

        )}

        <View style={styles.legendItem}>

          <View style={[styles.legendDot, { backgroundColor: colors.red, opacity: 0.4 }]} />

          <Text style={styles.legendText}>Spent</Text>

        </View>

      </View>

    </Animated.View>

  )

}



const styles = StyleSheet.create({

  container: {

    alignItems: 'center',

    justifyContent: 'center',

    paddingTop: 24,

    paddingBottom: 12,

    position: 'relative',

    minHeight: SIZE + 48,

  },

  centerText: {

    position: 'absolute',

    top: 24,

    left: 0,

    right: 0,

    height: SIZE,

    alignItems: 'center',

    justifyContent: 'center',

  },

  label: {

    fontSize: 10,

    fontFamily: 'Inter_600SemiBold',

    color: colors.textMuted,

    letterSpacing: 1,

    marginBottom: 4,

  },

  amount: {

    fontSize: 26,

    fontFamily: 'Inter_700Bold',

    color: colors.textPrimary,

    fontVariant: ['tabular-nums'],

  },

  centerSub: {

    fontSize: 11,

    fontFamily: 'Inter_400Regular',

    color: colors.textMuted,

    marginTop: 4,

  },

  statusBadge: {

    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 10,

    paddingHorizontal: 10,

    paddingVertical: 4,

    borderRadius: 12,

    gap: 4,

  },

  statusText: {

    fontSize: 12,

    fontFamily: 'Inter_600SemiBold',

  },

  weekly: {

    fontSize: 12,

    fontFamily: 'Inter_400Regular',

    color: colors.textMuted,

    marginTop: 8,

    marginBottom: 4,

    textAlign: 'center',

    paddingHorizontal: 16,

  },

  floatPill: {

    position: 'absolute',

    zIndex: 10,

    alignItems: 'center',

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: 12,

    paddingHorizontal: 10,

    paddingVertical: 6,

    elevation: 2,

    minWidth: 72,

  },

  floatLabel: {

    fontSize: 9,

    fontFamily: 'Inter_600SemiBold',

    color: colors.textMuted,

    letterSpacing: 0.3,

    textTransform: 'uppercase',

  },

  floatValue: {

    fontSize: 12,

    fontFamily: 'Inter_700Bold',

    color: colors.textPrimary,

    fontVariant: ['tabular-nums'],

    marginTop: 2,

  },

  pillTopRight: { top: 0, right: 8 },

  pillTopLeft: { top: 0, left: 8 },

  pillBottomLeft: { bottom: 56, left: 4 },

  pillBottomRight: { bottom: 56, right: 4 },

  legend: {

    flexDirection: 'row',

    alignItems: 'center',

    flexWrap: 'wrap',

    justifyContent: 'center',

    gap: 12,

    marginTop: 8,

  },

  legendItem: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

  },

  legendDot: {

    width: 8,

    height: 8,

    borderRadius: 4,

  },

  legendText: {

    fontSize: 11,

    fontFamily: 'Inter_400Regular',

    color: colors.textMuted,

  },

})


