import { View, Text, StyleSheet } from 'react-native'
import { colors } from '@/constants/colors'
import { formatNPRShort } from '@/lib/format'

interface MonthSnapshotRowProps {
  income: number
  saved: number
  spent: number
}

export function MonthSnapshotRow({ income, saved, spent }: MonthSnapshotRowProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.box, { backgroundColor: colors.greenFill }]}>
        <Text style={[styles.boxLabel, { color: colors.green }]}>Income</Text>
        <Text style={[styles.boxValue, { color: colors.green }]}>{formatNPRShort(income)}</Text>
      </View>
      <View style={[styles.box, { backgroundColor: '#F0F9FF' }]}>
        <Text style={[styles.boxLabel, { color: '#0369A1' }]}>Saved</Text>
        <Text style={[styles.boxValue, { color: '#0369A1' }]}>{formatNPRShort(saved)}</Text>
      </View>
      <View style={[styles.box, { backgroundColor: '#FEE2E2' }]}>
        <Text style={[styles.boxLabel, { color: colors.red }]}>Spent</Text>
        <Text style={[styles.boxValue, { color: colors.red }]}>{formatNPRShort(spent)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 4,
  },
  box: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  boxLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  boxValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
})
