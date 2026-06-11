import {

  DEFAULT_AMOUNT_PATTERNS,

  DEFAULT_MERCHANT_PATTERNS,

  DEFAULT_REMARKS_PATTERNS,

  DEFAULT_TXN_ID_PATTERNS,

  RECEIPT_KEYWORDS,

} from '@/lib/ocr-templates/defaults'

import {

  detectSourceAppId,

  findTemplate,

  type SourceAppId,

} from '@/lib/ocr-templates'



export type ParsedTransaction = {

  amount: number | null

  merchant: string | null

  remarks: string | null

  txnId: string | null

  date: string | null

  sourceApp: SourceAppId

}



function parseAmount(raw: string, extraPatterns: RegExp[] = []): number | null {

  const patterns = [...extraPatterns, ...DEFAULT_AMOUNT_PATTERNS]

  for (const pattern of patterns) {

    const match = raw.match(pattern)

    if (match?.[1]) {

      const value = parseFloat(match[1].replace(/,/g, ''))

      if (!isNaN(value) && value > 0) return value

    }

  }

  return null

}



function parseField(raw: string, extraPatterns: RegExp[], defaults: RegExp[]): string | null {

  for (const pattern of [...extraPatterns, ...defaults]) {

    const match = raw.match(pattern)

    if (match?.[1]) return match[1].trim()

  }

  return null

}



export function detectSourceApp(raw: string): ParsedTransaction['sourceApp'] {

  return detectSourceAppId(raw)

}



export function validateReceipt(raw: string): boolean {

  const lower = raw.toLowerCase()

  return RECEIPT_KEYWORDS.some(kw => lower.includes(kw))

}



export function parseOcrText(raw: string): ParsedTransaction {

  const template = findTemplate(raw)

  const sourceApp = template?.id ?? 'unknown'

  const text = template?.normalize ? template.normalize(raw) : raw



  return {

    amount: parseAmount(text, template?.amountPatterns ?? []),

    merchant: parseField(text, template?.merchantPatterns ?? [], DEFAULT_MERCHANT_PATTERNS),

    remarks: parseField(text, template?.remarksPatterns ?? [], DEFAULT_REMARKS_PATTERNS),

    txnId: parseField(text, template?.txnIdPatterns ?? [], DEFAULT_TXN_ID_PATTERNS),

    date: null,

    sourceApp,

  }

}



async function recognizeTextFromImage(uri: string): Promise<string | null> {

  try {

    const { recognizeText } = await import('rn-mlkit-ocr')

    const result = await recognizeText(uri, 'latin')

    const text = result?.text?.trim()

    return text || null

  } catch {

    return null

  }

}



export async function processReceiptImage(uri: string): Promise<ParsedTransaction | null> {

  const rawText = await recognizeTextFromImage(uri)



  if (!rawText?.trim()) {

    return null

  }



  if (!validateReceipt(rawText)) {

    return null

  }



  return parseOcrText(rawText)

}


