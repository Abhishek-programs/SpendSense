import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { playbook } from '@/db/schema'

export interface NudgeToggles {
  budgetBreach: boolean
  savingsReminder: boolean
  efFloorWarning: boolean
  recurringDraft: boolean
}

interface PlaybookState {
  userName: string | null
  monthlyIncome: number
  monthStartDay: number
  fallbackBucketId: string | null
  efFloor: number
  efStartBalance: number
  isOnboarded: boolean
  lastChecklistMonth: string | null
  lastChecklistPromptMonth: string | null
  lastBalanceRolloverMonth: string | null
  userAge: number | null
  carriedForwardBalance: number
  lastSurplusRolloverMonth: string | null
  lastPersonalRebalancePromptMonth: string | null
  personalRecoveryDebt: number
  personalNormalTopUp: number | null
  nudgeToggles: NudgeToggles
  lastNotificationDate: string | null
  isLoaded: boolean
  loadPlaybook: () => Promise<void>
  updatePlaybook: (patch: Partial<Omit<PlaybookState, 'isLoaded' | 'loadPlaybook' | 'updatePlaybook' | 'setOnboarded' | 'startPersonalRecovery' | 'resetPersonalRecovery'>>) => Promise<void>
  setOnboarded: () => Promise<void>
  startPersonalRecovery: (overspent: number, normalTopUp: number) => Promise<void>
  resetPersonalRecovery: () => Promise<void>
}

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  userName: null,
  monthlyIncome: 125000,
  monthStartDay: 1,
  fallbackBucketId: null,
  efFloor: 300000,
  efStartBalance: 0,
  isOnboarded: false,
  lastChecklistMonth: null,
  lastChecklistPromptMonth: null,
  lastBalanceRolloverMonth: null,
  userAge: null,
  carriedForwardBalance: 0,
  lastSurplusRolloverMonth: null,
  lastPersonalRebalancePromptMonth: null,
  personalRecoveryDebt: 0,
  personalNormalTopUp: null,
  nudgeToggles: {
    budgetBreach: true,
    savingsReminder: true,
    efFloorWarning: true,
    recurringDraft: true,
  },
  lastNotificationDate: null,
  isLoaded: false,

  loadPlaybook: async () => {
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      const row = rows[0]
      set({
        userName: row.userName ?? null,
        monthlyIncome: row.monthlyIncome,
        monthStartDay: row.monthStartDay,
        fallbackBucketId: row.fallbackBucketId ?? null,
        efFloor: row.efFloor,
        efStartBalance: row.efStartBalance ?? 0,
        isOnboarded: row.isOnboarded,
        lastChecklistMonth: row.lastChecklistMonth ?? null,
        lastChecklistPromptMonth: row.lastChecklistPromptMonth ?? null,
        lastBalanceRolloverMonth: row.lastBalanceRolloverMonth ?? null,
        userAge: row.userAge ?? null,
        carriedForwardBalance: row.carriedForwardBalance ?? 0,
        lastSurplusRolloverMonth: row.lastSurplusRolloverMonth ?? null,
        lastPersonalRebalancePromptMonth: row.lastPersonalRebalancePromptMonth ?? null,
        personalRecoveryDebt: row.personalRecoveryDebt ?? 0,
        personalNormalTopUp: row.personalNormalTopUp ?? null,
        isLoaded: true,
      })
    } else {
      set({ isLoaded: true })
    }
  },

  updatePlaybook: async (patch) => {
    set(patch as any)
    const state = get()
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      await db.update(playbook).set({
        userName: state.userName,
        monthlyIncome: state.monthlyIncome,
        monthStartDay: state.monthStartDay,
        fallbackBucketId: state.fallbackBucketId,
        efFloor: state.efFloor,
        efStartBalance: state.efStartBalance,
        isOnboarded: state.isOnboarded,
        lastChecklistMonth: state.lastChecklistMonth,
        lastChecklistPromptMonth: state.lastChecklistPromptMonth,
        lastBalanceRolloverMonth: state.lastBalanceRolloverMonth,
        userAge: state.userAge,
        carriedForwardBalance: state.carriedForwardBalance,
        lastSurplusRolloverMonth: state.lastSurplusRolloverMonth,
        lastPersonalRebalancePromptMonth: state.lastPersonalRebalancePromptMonth,
        personalRecoveryDebt: state.personalRecoveryDebt,
        personalNormalTopUp: state.personalNormalTopUp,
      }).where(eq(playbook.id, rows[0].id))
    } else {
      // Create record if not exists (should already happen in seedDefaults, but good to have)
      await db.insert(playbook).values({
        userName: state.userName,
        monthlyIncome: state.monthlyIncome,
        monthStartDay: state.monthStartDay,
        fallbackBucketId: state.fallbackBucketId,
        efFloor: state.efFloor,
        efStartBalance: state.efStartBalance,
        isOnboarded: state.isOnboarded,
        lastChecklistMonth: state.lastChecklistMonth,
        lastChecklistPromptMonth: state.lastChecklistPromptMonth,
        lastBalanceRolloverMonth: state.lastBalanceRolloverMonth,
        userAge: state.userAge,
        carriedForwardBalance: state.carriedForwardBalance,
        lastSurplusRolloverMonth: state.lastSurplusRolloverMonth,
        lastPersonalRebalancePromptMonth: state.lastPersonalRebalancePromptMonth,
        personalRecoveryDebt: state.personalRecoveryDebt,
        personalNormalTopUp: state.personalNormalTopUp,
      })
    }
  },

  setOnboarded: async () => {
    set({ isOnboarded: true })
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      await db.update(playbook).set({ isOnboarded: true }).where(eq(playbook.id, rows[0].id))
    }
  },

  startPersonalRecovery: async (overspent, normalTopUp) => {
    if (overspent <= 0) return
    const state = get()
    const debt = (state.personalRecoveryDebt || 0) + overspent
    const normal =
      state.personalNormalTopUp != null && state.personalNormalTopUp > 0
        ? state.personalNormalTopUp
        : normalTopUp
    await get().updatePlaybook({
      personalRecoveryDebt: debt,
      personalNormalTopUp: normal,
    })
  },

  resetPersonalRecovery: async () => {
    await get().updatePlaybook({
      personalRecoveryDebt: 0,
      personalNormalTopUp: null,
    })
  },
}))
