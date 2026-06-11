import type { OcrTemplate } from './types'

export const esewaTemplate: OcrTemplate = {
  id: 'esewa',
  label: 'eSewa',
  detect: raw => /esewa(?:\.com)?/i.test(raw),
  amountPatterns: [
    /(?:Transferred Amount|Amount Sent|Total Amount)\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:NPR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has been|transferred|sent)/i,
  ],
  merchantPatterns: [
    /(?:To|Receiver|Paid to)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
    /(?:Receiver Name|Recipient)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
  ],
  remarksPatterns: [
    /(?:Remarks|Message|Purpose)\s*:?\s*(.{2,60}?)(?:\n|$)/i,
  ],
  txnIdPatterns: [
    /(?:Transaction ID|Txn ID|Reference ID)\s*:?\s*([A-Z0-9\-]{6,30})/i,
  ],
}
