import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { formatNPR } from '@/lib/format'
import {
  computeCeilingCuts,
  LIVING_CUT_WEIGHTS,
  livingOvershoot,
  totalLivingOvershoot,
} from '@/lib/living-reallocate'
import { useBucketsStore, type Bucket } from '@/store/buckets'

interface LivingReallocateSheetProps {
  visible: boolean
  onClose: () => void
  regularBuckets: Bucket[]
  spentByBucket: Record<string, number>
}

export function LivingReallocateSheet({
  visible,
  onClose,
  regularBuckets,
  spentByBucket,
}: LivingReallocateSheetProps) {
  const updateBucket = useBucketsStore(s => s.updateBucket)
  const loadBuckets = useBucketsStore(s => s.loadBuckets)
  const [order, setOrder] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    const overFirst = [...regularBuckets].sort((a, b) => {
      const ao = livingOvershoot(a, spentByBucket[a.id] ?? 0)
      const bo = livingOvershoot(b, spentByBucket[b.id] ?? 0)
      return bo - ao
    })
    setOrder(overFirst.map(b => b.id))
  }, [visible, regularBuckets, spentByBucket])

  const totalCut = useMemo(
    () => totalLivingOvershoot(regularBuckets, spentByBucket),
    [regularBuckets, spentByBucket],
  )

  const preview = useMemo(
    () => computeCeilingCuts(order, regularBuckets, spentByBucket),
    [order, regularBuckets, spentByBucket],
  )

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= order.length) return
    setOrder(prev => {
      const copy = [...prev]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy
    })
  }

  const apply = async () => {
    if (preview.totalCut <= 0 || Object.keys(preview.cuts).length === 0) {
      Alert.alert(
        'Nothing to cut',
        'Move lower-priority buckets below the overspent ones, or there is no overshoot.',
      )
      return
    }
    setSaving(true)
    try {
      for (const [id, amount] of Object.entries(preview.cuts)) {
        await updateBucket(id, { monthlyAmount: amount })
      }
      await loadBuckets()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const byId = Object.fromEntries(regularBuckets.map(b => [b.id, b]))

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Reallocate ceilings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.lead}>
            NPR {formatNPR(totalCut)} over this month. Order what to protect first — lower
            buckets absorb the cut (Fun 50% · Dates 20% · Misc 20% · Core 10%).
          </Text>

          {order.map((id, index) => {
            const b = byId[id]
            if (!b) return null
            const over = livingOvershoot(b, spentByBucket[id] ?? 0)
            const newAmt = preview.cuts[id]
            const weight = LIVING_CUT_WEIGHTS[id]
            return (
              <View key={id} style={styles.row}>
                <View style={styles.rankCol}>
                  <TouchableOpacity onPress={() => move(index, -1)} hitSlop={8} disabled={index === 0}>
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={index === 0 ? colors.border : colors.textSecond}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => move(index, 1)}
                    hitSlop={8}
                    disabled={index === order.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={index === order.length - 1 ? colors.border : colors.textSecond}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.emoji}>{b.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {b.name}
                    {over > 0 ? ' · over' : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {newAmt != null
                      ? `${formatNPR(b.monthlyAmount)} → ${formatNPR(newAmt)}`
                      : `ceiling NPR ${formatNPR(b.monthlyAmount)}`}
                    {weight != null ? ` · cut weight ${Math.round(weight * 100)}%` : ''}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.apply, saving && { opacity: 0.6 }]}
          onPress={apply}
          disabled={saving}
        >
          <Text style={styles.applyText}>
            Lower ceilings by NPR {formatNPR(preview.totalCut)}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  body: { padding: 16, paddingBottom: 32 },
  lead: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecond,
    marginBottom: 16,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rankCol: { marginRight: 8 },
  emoji: { fontSize: 18, marginRight: 10 },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
  },
  apply: {
    margin: 16,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
})
