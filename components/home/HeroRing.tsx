import { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedProps,
  FadeIn,
  interpolate,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR, formatNPRShort } from '@/lib/format'

interface HeroRingProps {
  monthlyIncome: number
  effectiveIncome: number
  safeToSpend: number
  lifestyleSpent: number
  personalDraws: number
  confirmedSavedInvested: number
  unconfirmedSavingsThisMonth: number
  daysRemaining: number
  weeklyRate: number
  flaggedAmount: number
}

const SIZE = 220
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function clampRatio(value: number, denom: number) {
  if (denom <= 0) return 0
  return Math.max(0, Math.min(value / denom, 1))
}

type SegmentKind = 'confirmed' | 'unconfirmed' | 'spent' | 'available'

interface RingSegment {
  kind: SegmentKind
  ratio: number
  startRatio: number
  stroke: string
  strokeWidth: number
  opacity: number
}

function buildSegments(
  income: number,
  confirmed: number,
  unconfirmed: number,
  spent: number,
  available: number,
): RingSegment[] {
  if (income <= 0) return []

  const raw = [
    { kind: 'available' as const, value: available, stroke: colors.green, strokeWidth: STROKE, opacity: 1 },
    { kind: 'spent' as const, value: spent, stroke: colors.red, strokeWidth: STROKE, opacity: 1 },
    { kind: 'unconfirmed' as const, value: unconfirmed, stroke: colors.savingsSetAside, strokeWidth: STROKE - 3, opacity: 0.5 },
    { kind: 'confirmed' as const, value: confirmed, stroke: colors.savingsSetAside, strokeWidth: STROKE - 1, opacity: 1 },
  ]

  let start = 0
  const segments: RingSegment[] = []
  for (const item of raw) {
    const ratio = clampRatio(item.value, income)
    if (ratio <= 0.001) continue
    segments.push({
      kind: item.kind,
      ratio,
      startRatio: start,
      stroke: item.stroke,
      strokeWidth: item.strokeWidth,
      opacity: item.opacity,
    })
    start += ratio
  }
  return segments
}

function RingArc({
  ratio,
  startRatio,
  stroke,
  strokeWidth,
  opacity,
}: {
  ratio: number
  startRatio: number
  stroke: string
  strokeWidth: number
  opacity: number
}) {
  const cx = SIZE / 2
  const cy = SIZE / 2
  const animRatio = useSharedValue(0)

  useEffect(() => {
    animRatio.value = withTiming(ratio, { duration: 800, easing: Easing.out(Easing.cubic) })
  }, [ratio])

  const props = useAnimatedProps(() => ({
    strokeDasharray: `${CIRC * animRatio.value} ${CIRC * (1 - animRatio.value)}`,
    rotation: -90 + startRatio * 360,
  }))

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={RADIUS}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="butt"
      strokeOpacity={opacity}
      origin={`${cx}, ${cy}`}
      animatedProps={props}
    />
  )
}

export function HeroRing({
  monthlyIncome,
  effectiveIncome,
  safeToSpend,
  lifestyleSpent,
  personalDraws,
  confirmedSavedInvested,
  unconfirmedSavingsThisMonth,
  daysRemaining,
  weeklyRate,
  flaggedAmount,
}: HeroRingProps) {
  const hasSalary = effectiveIncome > 0
  const income = hasSalary ? effectiveIncome : monthlyIncome > 0 ? monthlyIncome : 1
  const spentTotal = lifestyleSpent + personalDraws
  const available = Math.max(0, safeToSpend)
  const pulse = useSharedValue(0)

  const segments = useMemo(
    () =>
      hasSalary
        ? buildSegments(
            effectiveIncome,
            confirmedSavedInvested,
            unconfirmedSavingsThisMonth,
            spentTotal,
            available,
          )
        : [],
    [
      hasSalary,
      effectiveIncome,
      confirmedSavedInvested,
      unconfirmedSavingsThisMonth,
      spentTotal,
      available,
    ],
  )

  useEffect(() => {
    pulse.value = withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) })
  }, [])

  const centerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.92, 1]),
  }))

  const isOverspent = hasSalary && safeToSpend < 0

  const statusColor = !hasSalary
    ? colors.textMuted
    : isOverspent
      ? colors.red
      : flaggedAmount > 0
        ? colors.amber
        : colors.green

  const statusLabel = !hasSalary
    ? 'Awaiting salary'
    : isOverspent
      ? 'Overspending'
      : flaggedAmount > 0
        ? 'Needs review'
        : 'On track'

  const cx = SIZE / 2
  const cy = SIZE / 2

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke={hasSalary ? colors.green + '20' : '#E5E7EB'}
          strokeWidth={STROKE}
          fill="none"
        />

        {!hasSalary && (
          <Circle
            cx={cx}
            cy={cy}
            r={RADIUS}
            stroke="#9CA3AF"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRC * 0.92} ${CIRC * 0.08}`}
            rotation={-90}
            origin={`${cx}, ${cy}`}
          />
        )}

        {hasSalary &&
          segments.map((seg, i) => (
            <RingArc
              key={`${seg.kind}-${i}`}
              ratio={seg.ratio}
              startRatio={seg.startRatio}
              stroke={seg.stroke}
              strokeWidth={seg.strokeWidth}
              opacity={seg.opacity}
            />
          ))}
      </Svg>

      <Animated.View style={[styles.center, centerStyle]}>
        <Text style={styles.centerLabel}>Safe to spend</Text>
        <Text style={[styles.centerAmount, isOverspent && { color: colors.red }]}>
          {!hasSalary
            ? '—'
            : isOverspent
              ? `-NPR ${formatNPR(Math.abs(safeToSpend))}`
              : `NPR ${formatNPR(available)}`}
        </Text>
        <Text style={styles.centerHint}>
          {!hasSalary ? 'Confirm salary in checklist' : `${daysRemaining} days left this month`}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
          <Ionicons
            name={!hasSalary ? 'hourglass-outline' : isOverspent ? 'trending-down' : 'checkmark-circle'}
            size={12}
            color={statusColor}
          />
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </Animated.View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>Spent {formatNPRShort(spentTotal)}</Text>
        <Text style={styles.statDot}>·</Text>
        <Text style={styles.stat}>Saved {formatNPRShort(confirmedSavedInvested)}</Text>
        {unconfirmedSavingsThisMonth > 0 && (
          <>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.stat}>To save {formatNPRShort(unconfirmedSavingsThisMonth)}</Text>
          </>
        )}
      </View>

      {hasSalary && (
        <Text style={styles.weekly}>≈ NPR {formatNPR(Math.round(Math.max(0, weeklyRate)))}/week</Text>
      )}

      <View style={styles.legend}>
        <LegendDot color={hasSalary ? colors.green : '#9CA3AF'} label={hasSalary ? 'Available' : 'Locked'} />
        <LegendDot color={colors.red} label="Spent" />
        <LegendDot color={colors.savingsSetAside} label="To save" opacity={0.45} />
        <LegendDot color={colors.savingsSetAside} label="Confirmed" />
      </View>
    </Animated.View>
  )
}

function LegendDot({
  color,
  label,
  opacity = 1,
}: {
  color: string
  label: string
  opacity?: number
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, opacity }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  center: {
    position: 'absolute',
    top: 0,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  centerAmount: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  centerHint: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  stat: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecond,
  },
  statDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  weekly: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 6,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
})
