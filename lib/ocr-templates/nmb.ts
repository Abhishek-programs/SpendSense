import type { OcrTemplate } from './types'

export const nmbTemplate: OcrTemplate = {
  id: 'nmb',
  label: 'NMB',
  detect: raw => /nmb(?:\s+bank)?/i.test(raw),
  amountPatterns: [
    /(?:Debit Amount|Transfer Amount|Amount)\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:NPR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:debited|transferred)/i,
  ],
  merchantPatterns: [
    /(?:Beneficiary|To Account|Payee|Receiver)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
    /(?:Account Name|Name)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
  ],
  remarksPatterns: [
    /(?:Remarks|Narration|Particulars)\s*:?\s*(.{2,60}?)(?:\n|$)/i,
  ],
  txnIdPatterns: [
    /(?:Reference|Ref\.?\s*No\.?|Transaction ID)\s*:?\s*([A-Z0-9\-]{6,30})/i,
  ],
}
