import { View, Text, StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import {
  CORE_LIVING_BUCKET_ID,
  DATES_BUCKET_ID,
  FUN_BUCKET_ID,
  PERSONAL_BUCKET_ID,
  MISC_BUCKET_ID,
} from '@/constants/defaults'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import { effectiveCap } from '@/lib/bucket-balance'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Bucket } from '@/store/buckets'

const BUCKET_HINTS: Record<string, string> = {
  [CORE_LIVING_BUCKET_ID]: 'Household & groceries',
  [DATES_BUCKET_ID]: 'All date spending',
  [FUN_BUCKET_ID]: 'Social & eating out',
  [PERSONAL_BUCKET_ID]: 'One-off buys · rolls over',
  [MISC_BUCKET_ID]: "Doesn't fit elsewhere",
}

interface LivingSectionProps {
  buckets: Bucket[]
  spentByBucket: Record<string, number>
  bucketBalances: Record<string, number>
}

export function LivingSection({ buckets, spentByBucket, bucketBalances }: LivingSectionProps) {
  const regularBuckets = buckets.filter(b => !b.accumulates)
  const fundBuckets = buckets.filter(b => b.accumulates)

  const renderRegularRow = (bucket: Bucket, i: number) => {
    const spent = spentByBucket[bucket.id] ?? 0
    const ceiling = bucket.monthlyAmount
    const green = ceiling > 0 ? Math.max(0, (ceiling - spent) / ceiling) : 1
    const red = ceiling > 0 ? Math.min(1, spent / ceiling) : 0
    return (
      <Animated.View
        key={bucket.id}
        entering={FadeInDown.delay(Math.min(i, 4) * 40).duration(350)}
      >
        {i > 0 && <View style={styles.divider} />}
        <View style={styles.row}>
          <Text style={styles.icon}>{bucket.icon}</Text>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{bucket.name}</Text>
            <Text style={styles.sublabel}>
              {BUCKET_HINTS[bucket.id] ?? 'Budget'}
            </Text>
          </View>
          <Text style={styles.amounts}>
            <Text style={styles.spentLabel}>Spent </Text>
            {formatNPR(spent)}
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar
            value={0}
            height={4}
            segments={{
              green: spent > ceiling ? 0 : green,
              red: spent > ceiling ? 1 : red,
            }}
          />
          <Text style={styles.ceilingHint}>ceiling NPR {formatNPR(ceiling)}</Text>
        </View>
      </Animated.View>
    )
  }

  const renderFundRow = (bucket: Bucket, showDivider: boolean, i: number) => {
    const spent = spentByBucket[bucket.id] ?? 0
    const balance = Math.max(0, bucketBalances[bucket.id] ?? 0)
    const cap = Math.max(effectiveCap(bucket) ?? bucket.monthlyAmount * 4, 1)
    const topUp = bucket.monthlyAmount
    // Cap as full width: green = still in fund, red = spent this month, grey = room to cap
    const green = Math.min(1, balance / cap)
    const red = Math.min(1, spent / cap)
    const grey = Math.max(0, 1 - green - red)

    return (
      <Animated.View
        key={bucket.id}
        entering={FadeInDown.delay(Math.min(i, 4) * 40).duration(350)}
      >
        {showDivider && <View style={styles.divider} />}
        <View style={styles.row}>
          <Text style={styles.icon}>{bucket.icon}</Text>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{bucket.name}</Text>
            <Text style={styles.sublabel}>
              {BUCKET_HINTS[bucket.id] ?? 'Fund'}
            </Text>
          </View>
          <Text style={styles.amounts}>
            <Text style={styles.spentLabel}>Spent </Text>
            {formatNPR(spent)}
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar
            value={0}
            height={4}
            segments={{ green, red, grey }}
          />
          <Text style={styles.fundHint}>
            Fund NPR {formatNPR(balance)} / {formatNPR(cap)} · +{formatNPR(topUp)}/mo · rolls over
          </Text>
        </View>
      </Animated.View>
    )
  }

  const allEmpty = regularBuckets.length === 0 && fundBuckets.length === 0

  return (
    <Animated.View style={styles.section} entering={FadeIn.duration(300)}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Living</Text>
        <Text style={styles.subtitle}>Ceilings & personal fund</Text>
      </View>
      <View style={styles.card}>
        {regularBuckets.map((bucket, i) => renderRegularRow(bucket, i))}
        {fundBuckets.map((bucket, i) =>
          renderFundRow(
            bucket,
            regularBuckets.length > 0 || i > 0,
            regularBuckets.length + i,
          ),
        )}
        {allEmpty && (
          <Text style={styles.empty}>No spending buckets</Text>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
  icon: {
    width: 28,
    fontSize: 18,
    marginRight: 12,
    textAlign: 'center',
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  sublabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginTop: 1,
  },
  amounts: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  amountsMuted: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  spentLabel: {
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  barWrap: {
    paddingBottom: 14,
  },
  fundHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 6,
  },
  ceilingHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 6,
  },
  noTxnHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  empty: {
    paddingVertical: 16,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
})
