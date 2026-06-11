import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import type { Bucket } from '@/store/buckets'
import type { FutureGoalGroup } from '@/lib/goals/future-groups'
import { GOAL_BUCKET_LABELS } from '@/lib/goals/plan'
import { futureRowLabel } from '@/lib/goals/future-groups'

interface FutureSectionProps {
  goalGroups: FutureGoalGroup[]
  standaloneBuckets: Bucket[]
  confirmedBucketIds: Set<string>
  onConfirm: (bucketId: string) => void
}

function ConfirmRow({
  label,
  hint,
  amount,
  confirmed,
  onPress,
  indented,
}: {
  label: string
  hint?: string
  amount: number
  confirmed: boolean
  onPress: () => void
  indented?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.row, confirmed && styles.rowConfirmed, indented && styles.rowIndented]}
      onPress={() => !confirmed && onPress()}
      activeOpacity={confirmed ? 1 : 0.7}
      disabled={confirmed}
    >
      <View style={[styles.checkbox, confirmed && styles.checkboxConfirmed]}>
        {confirmed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, confirmed && styles.nameConfirmed]}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      <Text style={[styles.amount, confirmed && styles.amountConfirmed]}>
        NPR {formatNPR(amount)}
      </Text>
    </TouchableOpacity>
  )
}

export function FutureSection({
  goalGroups,
  standaloneBuckets,
  confirmedBucketIds,
  onConfirm,
}: FutureSectionProps) {
  const hasContent = goalGroups.length > 0 || standaloneBuckets.length > 0

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Future</Text>
        <Text style={styles.subtitle}>Money for later</Text>
      </View>
      <View style={styles.card}>
        {goalGroups.map((group, gi) => (
          <View key={group.goalId}>
            {gi > 0 && <View style={styles.divider} />}
            {group.paymentMode === 'pay_in_full' && group.buckets.length === 1 ? (
              <ConfirmRow
                label={futureRowLabel(group.buckets[0], {
                  name: group.goalName,
                  paymentMode: group.paymentMode,
                })}
                amount={group.buckets[0].monthlyAmount}
                confirmed={confirmedBucketIds.has(group.buckets[0].id)}
                onPress={() => onConfirm(group.buckets[0].id)}
              />
            ) : (
              <>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.goalName}</Text>
                  <Text style={styles.groupTotal}>
                    NPR{' '}
                    {formatNPR(
                      group.buckets.reduce((s, b) => s + b.monthlyAmount, 0),
                    )}
                    /mo
                  </Text>
                </View>
                {group.buckets.map((bucket, bi) => {
                  const role = bucket.goalBucketRole
                  const label = role
                    ? GOAL_BUCKET_LABELS[role].title
                    : bucket.name
                  const hint = role ? GOAL_BUCKET_LABELS[role].hint : undefined
                  return (
                    <View key={bucket.id}>
                      {bi > 0 && <View style={styles.subDivider} />}
                      <ConfirmRow
                        label={label}
                        hint={hint}
                        amount={bucket.monthlyAmount}
                        confirmed={confirmedBucketIds.has(bucket.id)}
                        onPress={() => onConfirm(bucket.id)}
                        indented
                      />
                    </View>
                  )
                })}
              </>
            )}
          </View>
        ))}

        {goalGroups.length > 0 && standaloneBuckets.length > 0 && (
          <View style={styles.divider} />
        )}

        {standaloneBuckets.map((bucket, i) => (
          <View key={bucket.id}>
            {i > 0 && <View style={styles.divider} />}
            <ConfirmRow
              label={bucket.name}
              amount={bucket.monthlyAmount}
              confirmed={confirmedBucketIds.has(bucket.id)}
              onPress={() => onConfirm(bucket.id)}
            />
          </View>
        ))}

        {!hasContent && (
          <Text style={styles.empty}>No savings buckets</Text>
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
  subDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 38,
  },
  groupHeader: {
    paddingVertical: 12,
    paddingTop: 14,
  },
  groupName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
  },
  groupTotal: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowIndented: {
    paddingLeft: 8,
  },
  rowConfirmed: {
    opacity: 0.55,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxConfirmed: {
    borderWidth: 0,
    backgroundColor: colors.green,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  nameConfirmed: {
    textDecorationLine: 'line-through',
    color: colors.textSecond,
  },
  amount: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  amountConfirmed: {
    color: colors.textSecond,
  },
  empty: {
    paddingVertical: 16,
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
  },
})
