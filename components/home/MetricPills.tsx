import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'

interface MetricPillsProps {
  invested: number
  saved: number
  spent: number
}

export function MetricPills({ invested, saved, spent }: MetricPillsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={styles.label}>Invested</Text>
        <Text style={styles.value}>{formatNPRShort(invested)}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.label}>Saved</Text>
        <Text style={[styles.value, { color: colors.green }]}>{formatNPRShort(saved)}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.label}>Spent</Text>
        <Text style={styles.value}>{formatNPRShort(spent)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  pill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderCurve: 'continuous',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
})
