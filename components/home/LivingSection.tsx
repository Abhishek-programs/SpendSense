import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Bucket } from '@/store/buckets'

interface LivingSectionProps {
  buckets: Bucket[]
  spentByBucket: Record<string, number>
  bucketBalances: Record<string, number>
}

const PERSONAL_LOW_BALANCE = 3000

export function LivingSection({ buckets, spentByBucket, bucketBalances }: LivingSectionProps) {
  const regularBuckets = buckets.filter(b => !b.accumulates)
  const fundBuckets = buckets.filter(b => b.accumulates)

  const renderRegularRow = (bucket: Bucket, i: number) => {
    const spent = spentByBucket[bucket.id] ?? 0
    const ratio = bucket.monthlyAmount > 0 ? spent / bucket.monthlyAmount : 0
    return (
      <View key={bucket.id}>
        {i > 0 && <View style={styles.divider} />}
        <View style={styles.row}>
          <View style={[styles.iconBg, { backgroundColor: bucket.color + '18' }]}>
            <Text style={styles.icon}>{bucket.icon}</Text>
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{bucket.name}</Text>
            <Text style={styles.sublabel}>Budget</Text>
          </View>
          <Text style={styles.amounts}>
            {formatNPR(spent)}{' '}
            <Text style={styles.amountsMuted}>/ {formatNPR(bucket.monthlyAmount)}</Text>
          </Text>
        </View>
        <View style={styles.barWrap}>
          {spent === 0 ? (
            <Text style={styles.noTxnHint}>No transactions yet this month</Text>
          ) : (
            <ProgressBar value={ratio} height={4} />
          )}
        </View>
      </View>
    )
  }

  const renderFundRow = (bucket: Bucket, showDivider: boolean) => {
    const balance = bucketBalances[bucket.id] ?? 0
    const cap = bucket.accumulationCap ?? bucket.monthlyAmount * 4
    const ratio = cap > 0 ? balance / cap : 0
    const barColor =
      balance <= 0 ? colors.red : balance < PERSONAL_LOW_BALANCE ? colors.amber : colors.green

    return (
      <View key={bucket.id}>
        {showDivider && <View style={styles.divider} />}
        <View style={styles.row}>
          <View style={[styles.iconBg, { backgroundColor: bucket.color + '18' }]}>
            <Text style={styles.icon}>{bucket.icon}</Text>
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{bucket.name}</Text>
            <Text style={styles.sublabel}>Fund</Text>
          </View>
          <Text style={styles.amounts}>
            NPR {formatNPR(balance)}
            <Text style={styles.amountsMuted}> / {formatNPR(cap)}</Text>
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar value={ratio} height={4} mode="fill" color={barColor} />
          <Text style={styles.fundHint}>
            +{formatNPR(bucket.monthlyAmount)}/mo top-up · rolls over
          </Text>
        </View>
      </View>
    )
  }

  const allEmpty = regularBuckets.length === 0 && fundBuckets.length === 0

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Living</Text>
        <Text style={styles.subtitle}>Spending budgets & personal fund</Text>
      </View>
      <View style={styles.card}>
        {regularBuckets.map((bucket, i) => renderRegularRow(bucket, i))}
        {fundBuckets.map((bucket, i) =>
          renderFundRow(bucket, regularBuckets.length > 0 || i > 0),
        )}
        {allEmpty && (
          <Text style={styles.empty}>No spending buckets</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
    paddingHorizontal: 16,
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
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
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
  barWrap: {
    paddingBottom: 14,
  },
  fundHint: {
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
