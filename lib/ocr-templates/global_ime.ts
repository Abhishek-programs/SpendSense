import type { OcrTemplate } from './types'

export const globalImeTemplate: OcrTemplate = {
  id: 'global_ime',
  label: 'Global IME',
  detect: raw => /global\s*ime|globalime/i.test(raw),
  amountPatterns: [
    /(?:Debit|Transfer|Amount)\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:NPR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:debited|transferred)/i,
  ],
  merchantPatterns: [
    /(?:Beneficiary|Payee|To)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
    /(?:Account Name|Receiver Name)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
  ],
  remarksPatterns: [
    /(?:Remarks|Narration|Particulars)\s*:?\s*(.{2,60}?)(?:\n|$)/i,
  ],
  txnIdPatterns: [
    /(?:Reference|Ref\.?\s*No\.?|Transaction ID)\s*:?\s*([A-Z0-9\-]{6,30})/i,
  ],
}
