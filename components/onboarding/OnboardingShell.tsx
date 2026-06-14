import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react'
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  Keyboard,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/constants/colors'

interface OnboardingShellProps {
  children: ReactNode
  footer: ReactNode
  scrollRef?: RefObject<ScrollView | null>
  contentContainerStyle?: ViewStyle
}

interface FieldScrollContextValue {
  bindField: (key: string) => {
    onLayout: (e: LayoutChangeEvent) => void
    onFocus: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void
  }
}

const FieldScrollContext = createContext<FieldScrollContextValue | null>(null)

export function useOnboardingFieldScroll() {
  const ctx = useContext(FieldScrollContext)
  if (!ctx) {
    throw new Error('useOnboardingFieldScroll must be used inside OnboardingShell')
  }
  return ctx
}

export function OnboardingShell({
  children,
  footer,
  scrollRef: externalScrollRef,
  contentContainerStyle,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets()
  const internalScrollRef = useRef<ScrollView>(null)
  const scrollRef = externalScrollRef ?? internalScrollRef
  const fieldOffsets = useRef<Record<string, number>>({})
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const show = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  const scrollToField = useCallback(
    (key: string) => {
      const y = fieldOffsets.current[key]
      if (y == null) return
      setTimeout(
        () => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 96), animated: true })
        },
        Platform.OS === 'android' ? 120 : 60,
      )
    },
    [scrollRef],
  )

  const bindField = useCallback(
    (key: string) => ({
      onLayout: (e: LayoutChangeEvent) => {
        fieldOffsets.current[key] = e.nativeEvent.layout.y
      },
      onFocus: (_e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        scrollToField(key)
      },
    }),
    [scrollToField],
  )

  const keyboardInset = Platform.OS === 'ios' ? 0 : keyboardHeight

  return (
    <FieldScrollContext.Provider value={{ bindField }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: 24 + keyboardInset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          {children}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </FieldScrollContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.pageBg,
  },
})
