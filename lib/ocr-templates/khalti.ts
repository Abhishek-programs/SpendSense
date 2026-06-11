import type { OcrTemplate } from './types'

export const khaltiTemplate: OcrTemplate = {
  id: 'khalti',
  label: 'Khalti',
  detect: raw => /khalti(?:\.com)?/i.test(raw),
  amountPatterns: [
    /(?:Amount|Total|Paid)\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:NPR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:paid|sent|debited)/i,
  ],
  merchantPatterns: [
    /(?:Merchant|To|Paid to|Receiver)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
    /(?:Service|Vendor)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
  ],
  remarksPatterns: [
    /(?:Remarks|Note|Description)\s*:?\s*(.{2,60}?)(?:\n|$)/i,
  ],
  txnIdPatterns: [
    /(?:Transaction ID|Txn ID|Khalti ID)\s*:?\s*([A-Z0-9\-]{6,30})/i,
  ],
}
