import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'

type FinancialStatus = 'on-track' | 'caution' | 'overspending' | 'uncategorized'

interface HeroRingProps {
  totalIncome: number
  available: number
  flaggedAmount: number
  unconfirmedSavings: number
  daysRemaining: number
  weeklyRate: number
  totalSpent: number
  confirmedSavings: number
}

const SIZE = 224
const STROKE = 13
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getStatus(
  available: number,
  totalIncome: number,
  flaggedAmount: number,
  daysRemaining: number,
  totalSpent: number,
  confirmedSavings: number,
): { status: FinancialStatus; label: string; icon: string; color: string } {
  if (available < 0) {
    return { status: 'overspending', label: 'Overspending', icon: 'trending-down', color: colors.red }
  }
  if (flaggedAmount > 0) {
    return { status: 'uncategorized', label: 'Needs attention', icon: 'alert-circle', color: colors.amber }
  }
  // Budget pacing: if spent proportion > elapsed proportion, caution
  if (totalIncome > 0 && daysRemaining > 0) {
    const totalDays = 30 // approximate
    const elapsed = totalDays - daysRemaining
    const elapsedRatio = elapsed / totalDays
    const spentRatio = totalSpent / (totalIncome - confirmedSavings || 1)
    if (spentRatio > elapsedRatio + 0.15) {
      return { status: 'caution', label: 'Spending fast', icon: 'speedometer', color: colors.amber }
    }
  }
  return { status: 'on-track', label: 'On track', icon: 'trending-up', color: colors.green }
}

export function HeroRing({
  totalIncome,
  available,
  flaggedAmount,
  unconfirmedSavings,
  daysRemaining,
  weeklyRate,
  totalSpent,
  confirmedSavings,
}: HeroRingProps) {
  const isOverspent = available < 0
  const cx = SIZE / 2
  const cy = SIZE / 2

  const { label: statusLabel, icon: statusIcon, color: statusColor } = getStatus(
    available, totalIncome, flaggedAmount, daysRemaining, totalSpent, confirmedSavings,
  )

  // Ring shows how much of spending capacity is used.
  // Green arc = proportion of income already accounted for (spent + confirmed savings).
  // Starts grey (nothing spent), fills green as money is allocated.
  const denom = totalIncome > 0 ? totalIncome : 1
  const usedRatio = Math.max(0, Math.min((totalSpent + confirmedSavings) / denom, 1))
  const yellowRatio = Math.max(0, Math.min(flaggedAmount / denom, 1 - usedRatio))
  const greyUnconfirmedRatio = Math.max(0, Math.min(unconfirmedSavings / denom, 1 - usedRatio - yellowRatio))

  // Green arc — allocated money, starts at 12 o'clock
  const greenOffset = CIRCUMFERENCE * (1 - usedRatio)

  // Yellow arc — flagged, positioned after green
  const yellowDash = CIRCUMFERENCE * yellowRatio
  const yellowGap = CIRCUMFERENCE * (1 - yellowRatio)
  const yellowRotation = -90 + usedRatio * 360

  // Grey unconfirmed savings — positioned after yellow
  const greyDash = CIRCUMFERENCE * greyUnconfirmedRatio
  const greyGap = CIRCUMFERENCE * (1 - greyUnconfirmedRatio)
  const greyRotation = -90 + (usedRatio + yellowRatio) * 360

  // Subtle floating animation for pill
  const pillY = useSharedValue(0)
  useEffect(() => {
    pillY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    )
  }, [])
  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillY.value }],
  }))

  return (
    <View style={styles.container}>
      {/* Floating pill — overlapping ring edge */}
      <Animated.View style={[styles.pill, pillAnimStyle]}>
        <View style={[styles.pillDot, isOverspent && { backgroundColor: colors.red }]} />
        <Text style={styles.pillText}>{daysRemaining} days left</Text>
      </Animated.View>

      <Svg width={SIZE} height={SIZE}>
        {/* Background track — the "empty" grey ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke="#E8EAED"
          strokeWidth={STROKE}
          fill="none"
        />

        {isOverspent ? (
          /* Full red ring when overspent */
          <Circle
            cx={cx}
            cy={cy}
            r={RADIUS}
            stroke={colors.red}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <>
            {/* Grey dashed — unconfirmed savings (committed but not moved) */}
            {greyUnconfirmedRatio > 0.005 && (
              <Circle
                cx={cx}
                cy={cy}
                r={RADIUS}
                stroke={colors.textMuted}
                strokeWidth={STROKE - 4}
                fill="none"
                strokeDasharray={`${greyDash} ${greyGap}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                rotation={greyRotation}
                origin={`${cx}, ${cy}`}
                opacity={0.3}
              />
            )}

            {/* Yellow — flagged/uncategorized amount */}
            {yellowRatio > 0.005 && (
              <Circle
                cx={cx}
                cy={cy}
                r={RADIUS}
                stroke={colors.amber}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${yellowDash} ${yellowGap}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                rotation={yellowRotation}
                origin={`${cx}, ${cy}`}
              />
            )}

            {/* Green arc — money allocated (spent + confirmed savings) */}
            {usedRatio > 0.005 && (
              <Circle
                cx={cx}
                cy={cy}
                r={RADIUS}
                stroke={colors.green}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={greenOffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${cx}, ${cy}`}
              />
            )}
          </>
        )}
      </Svg>

      {/* Center text overlay */}
      <View style={styles.centerText}>
        <Text style={styles.label}>SAFE TO SPEND</Text>
        <Text style={[styles.amount, isOverspent && { color: colors.red }]}>
          {isOverspent ? '-' : ''}NPR {formatNPR(Math.abs(available))}
        </Text>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
          <Ionicons name={statusIcon as any} size={13} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Weekly rate — below ring */}
      <Text style={styles.weekly}>
        ≈ NPR {formatNPR(Math.round(weeklyRate))}/week
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  amount: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  pill: {
    position: 'absolute',
    top: 20,
    right: 24,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginRight: 6,
  },
  pillText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
})
