import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '@/constants/colors'

interface ProgressBarProps {
  value: number // 0 to 1+ (can exceed 1 for over-budget) — legacy single fill
  height?: number
  color?: string
  trackColor?: string
  /** When 'fill', bar shows balance level (green when high). Default 'deplete' for spend bars. */
  mode?: 'deplete' | 'fill'
  /**
   * Split bar: green (remaining) | optional grey (headroom) | red (spent), left → right.
   * Fractions of the full track (0–1).
   */
  segments?: { green: number; red: number; grey?: number }
}

function getBarColor(value: number, mode: 'deplete' | 'fill'): string {
  if (mode === 'fill') {
    if (value <= 0) return colors.red
    if (value < 0.15) return colors.amber
    return colors.green
  }
  if (value >= 1.0) return colors.red
  if (value >= 0.8) return colors.amber
  return colors.green
}

export function ProgressBar({
  value,
  height = 4,
  color,
  trackColor = '#F0F2F5',
  mode = 'deplete',
  segments,
}: ProgressBarProps) {
  if (segments) {
    let green = Math.max(0, segments.green)
    let red = Math.max(0, segments.red)
    let grey = Math.max(0, segments.grey ?? 0)
    const sum = green + red + grey
    if (sum > 1.0001) {
      green /= sum
      red /= sum
      grey /= sum
    }
    if (red >= 1 && green + grey <= 0) {
      green = 0
      grey = 0
      red = 1
    }

    return (
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor,
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {green > 0.0005 && (
          <View style={{ flex: green, backgroundColor: colors.green, height }} />
        )}
        {red > 0.0005 && (
          <View style={{ flex: red, backgroundColor: colors.red, height }} />
        )}
        {grey > 0.0005 && (
          <View style={{ flex: grey, backgroundColor: colors.border, height }} />
        )}
      </View>
    )
  }

  const clampedWidth = Math.min(Math.max(value, 0), 1)
  const barColor = color ?? getBarColor(value, mode)

  const widthSv = useSharedValue(clampedWidth)

  useEffect(() => {
    widthSv.value = withTiming(clampedWidth, { duration: 300 })
  }, [clampedWidth])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthSv.value * 100}%`,
  }))

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height,
            borderRadius: height / 2,
            backgroundColor: barColor,
          },
          fillStyle,
        ]}
      />
    </View>
  )
}
