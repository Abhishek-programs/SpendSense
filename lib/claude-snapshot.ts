import type { Transaction } from '@/store/transactions'
import type { Contact, LendBorrowEntry } from '@/lib/lending/balance'
import {
  computePersonBalance,
  computeMonthMetrics,
  directionLabel,
} from '@/lib/lending/balance'
import { computeCashOnHand, foundMoneyInRange, periodCashFromTransactions } from '@/lib/your-money'
import { getMonthRange, toLocalDateKey } from '@/lib/month'
import { formatNPR } from '@/lib/format'
import { transactionTitle } from '@/lib/transaction-label'
import { BANK_ACCOUNT_ID } from '@/constants/accounts'

export const CLAUDE_SHARE_PROMPT =
  'This is a SpendSense snapshot from my phone. All money is NPR. Attach/read the markdown. Playbook month may not be a calendar month. Your money = carry + this period’s cash flow. Safe to spend is this month’s plan after salary, not the bank pile. Answer from the file only.'

export type ClaudeSnapshotInput = {
  now?: Date
  playbook: {
    userName: string | null
    userAge: number | null
    monthlyIncome: number
    monthStartDay: number
    earlyMonthStartDate: string | null
    efFloor: number
    efStartBalance: number
    carriedForwardBalance: number
  }
  buckets: {
    id: string
    name: string
    type: string
    monthlyAmount: number
    isActive: boolean
    accumulates?: boolean
  }[]
  transactions: Transaction[]
  accounts: { id: string; name: string; balance: number }[]
  adjustments: { amount: number; date: string; note?: string | null }[]
  contacts: Contact[]
  entries: LendBorrowEntry[]
  goals: {
    name: string
    targetAmount: number
    monthlyContribution: number
    startBalance: number
    linkedBucketIds: string[]
    completedAt: string | null
  }[]
  keywordMappings: { keyword: string; bucketId: string }[]
  sureShotMerchants: { merchantName: string; bucketId: string }[]
}

export function snapshotFilename(now = new Date()): string {
  return `spendsense-${toLocalDateKey(now)}.md`
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const ms = new Date(iso).getTime()
  return ms >= start.getTime() && ms <= end.getTime()
}

function spentThisPeriod(
  bucket: ClaudeSnapshotInput['buckets'][number],
  periodTxns: Transaction[],
): number {
  return periodTxns
    .filter(t => {
      if (t.isFlagged || t.isRecurringDraft || t.type !== 'expense') return false
      if (bucket.accumulates) {
        return (
          (t.bucketId === bucket.id && (!t.remarks || !t.remarks.startsWith('__'))) ||
          (t.fundedFromBucketId === bucket.id && t.remarks === '__savings_confirm__')
        )
      }
      if (t.bucketId === bucket.id) return true
      return t.fundedFromBucketId === bucket.id && t.remarks === '__savings_confirm__'
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

function goalCurrent(
  goal: ClaudeSnapshotInput['goals'][number],
  allTxns: Transaction[],
): number {
  const confirmed = allTxns
    .filter(
      t =>
        !t.isRecurringDraft &&
        t.remarks === '__savings_confirm__' &&
        goal.linkedBucketIds.includes(t.bucketId),
    )
    .reduce((sum, t) => sum + t.amount, 0)
  return goal.startBalance + confirmed
}

function pipeSafe(value: string): string {
  return value.replace(/\|/g, '/')
}

export function buildClaudeSnapshot(input: ClaudeSnapshotInput): string {
  const now = input.now ?? new Date()
  const { start, end } = getMonthRange(
    input.playbook.monthStartDay,
    input.playbook.earlyMonthStartDate,
    now,
  )
  const liveTxns = input.transactions.filter(t => !t.isRecurringDraft)
  const periodTxns = liveTxns.filter(t => inRange(t.date, start, end))
  const cash = periodCashFromTransactions(periodTxns)
  const lending = computeMonthMetrics(input.entries, start, end)
  const found = foundMoneyInRange(input.adjustments, start, end)
  const bankPile = computeCashOnHand({
    carriedForward: input.playbook.carriedForwardBalance,
    income: cash.income,
    expenses: cash.expenses,
    fees: cash.fees,
    lendingCashAdjust: lending.lendBorrowCashAdjust,
    foundThisPeriod: found,
  })
  const otherWallets = input.accounts
    .filter(a => a.id !== BANK_ACCOUNT_ID)
    .reduce((s, a) => s + a.balance, 0)
  const yourMoney = bankPile + otherWallets
  const bucketName = (id: string) => input.buckets.find(b => b.id === id)?.name ?? id
  const accountName = (id: string | null | undefined) =>
    input.accounts.find(a => a.id === id)?.name ?? 'Bank'

  const otherAccountLines = input.accounts
    .filter(a => a.id !== BANK_ACCOUNT_ID)
    .map(a => `- ${a.name}: ${formatNPR(a.balance)}`)

  const playbookExtras: string[] = []
  if (input.playbook.userName) playbookExtras.push(`- Name: ${input.playbook.userName}`)
  if (input.playbook.userAge != null) playbookExtras.push(`- Age: ${input.playbook.userAge}`)

  const bucketRows = input.buckets.map(
    b =>
      `| ${pipeSafe(b.name)} | ${b.type} | ${formatNPR(b.monthlyAmount)} | ${b.isActive ? 'yes' : 'no'} | ${formatNPR(spentThisPeriod(b, periodTxns))} |`,
  )

  const txnRows = [...liveTxns]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(t => {
      const remarks = pipeSafe(t.remarks ?? '')
      const title = pipeSafe(transactionTitle(t))
      return `| ${toLocalDateKey(new Date(t.date))} | ${t.type} | ${formatNPR(t.amount)} | ${formatNPR(t.feeAmount ?? 0)} | ${title} | ${pipeSafe(bucketName(t.bucketId))} | ${pipeSafe(accountName(t.accountId))} | ${remarks} |`
    })

  const peopleLines =
    input.contacts.length === 0
      ? ['None.']
      : input.contacts.map(c => {
          const bal = computePersonBalance(c.id, input.entries)
          return `- ${c.name}: ${formatNPR(Math.abs(bal))} (${directionLabel(bal)})`
        })

  const entryRows =
    input.entries.length === 0
      ? ['None.']
      : [...input.entries]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(e => {
            const person = input.contacts.find(c => c.id === e.contactId)?.name ?? e.contactId
            return `| ${toLocalDateKey(new Date(e.date))} | ${pipeSafe(person)} | ${e.type} | ${formatNPR(e.amount)} | ${pipeSafe(e.note ?? '')} |`
          })

  const goalLines =
    input.goals.length === 0
      ? ['None.']
      : input.goals.map(g => {
          const current = goalCurrent(g, liveTxns)
          const done = g.completedAt ? 'completed' : 'open'
          return `- ${g.name}: current ${formatNPR(current)} / target ${formatNPR(g.targetAmount)}, monthly ${formatNPR(g.monthlyContribution)} (${done})`
        })

  const keywordLines =
    input.keywordMappings.length === 0
      ? ['None.']
      : input.keywordMappings.map(k => `- ${k.keyword} → ${bucketName(k.bucketId)}`)

  const merchantLines =
    input.sureShotMerchants.length === 0
      ? ['None.']
      : input.sureShotMerchants.map(m => `- ${m.merchantName} → ${bucketName(m.bucketId)}`)

  return [
    '# SpendSense snapshot',
    '',
    `Exported ${toLocalDateKey(now)}. All amounts NPR. Recurring drafts omitted.`,
    '`__salary__` and `__savings_confirm__` are internal tags, not spending categories.',
    '',
    '## Now',
    '',
    `- Your money: ${formatNPR(yourMoney)}`,
    `- Bank: ${formatNPR(bankPile)}`,
    ...otherAccountLines,
    `- Carried forward: ${formatNPR(input.playbook.carriedForwardBalance)}`,
    `- Period: ${toLocalDateKey(start)} → ${toLocalDateKey(end)}`,
    `- This period income: ${formatNPR(cash.income)}`,
    `- This period expenses: ${formatNPR(cash.expenses)}`,
    `- This period fees: ${formatNPR(cash.fees)}`,
    `- This period lending cash: ${formatNPR(lending.lendBorrowCashAdjust)}`,
    `- This period found money: ${formatNPR(found)}`,
    '',
    '## Playbook',
    '',
    ...playbookExtras,
    `- Monthly income: ${formatNPR(input.playbook.monthlyIncome)}`,
    `- Month start day: ${input.playbook.monthStartDay}`,
    `- Early start: ${input.playbook.earlyMonthStartDate ?? 'none'}`,
    `- EF floor: ${formatNPR(input.playbook.efFloor)}`,
    `- EF start: ${formatNPR(input.playbook.efStartBalance)}`,
    `- Carry: ${formatNPR(input.playbook.carriedForwardBalance)}`,
    '',
    '## Buckets',
    '',
    '| Name | Type | Monthly | Active | Spent this period |',
    '| --- | --- | --- | --- | --- |',
    ...(bucketRows.length ? bucketRows : ['None.']),
    '',
    '## Transactions',
    '',
    '| Date | Type | Amount | Fee | Title | Bucket | Account | Remarks |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...(txnRows.length ? txnRows : ['None.']),
    '',
    '## Lending',
    '',
    ...peopleLines,
    '',
    ...(input.entries.length === 0
      ? []
      : [
          '| Date | Person | Type | Amount | Note |',
          '| --- | --- | --- | --- | --- |',
        ]),
    ...entryRows,
    '',
    '## Goals',
    '',
    ...goalLines,
    '',
    '## Keywords',
    '',
    ...keywordLines,
    '',
    '## Sure-shot merchants',
    '',
    ...merchantLines,
    '',
  ].join('\n')
}
