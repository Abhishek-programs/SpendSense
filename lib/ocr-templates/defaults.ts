export const DEFAULT_AMOUNT_PATTERNS = [
  /(?:NPR|Rs\.?|रू)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /(?:Amount|Debit|Payment|Paid)\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /Total\s*:?\s*(?:NPR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
]

export const DEFAULT_MERCHANT_PATTERNS = [
  /(?:To|Merchant|Paid to|Store)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
  /(?:Receiver|Payee)\s*:?\s*(.{3,40}?)(?:\n|$)/i,
]

export const DEFAULT_REMARKS_PATTERNS = [
  /(?:Remarks|Narration|Purpose|Description)\s*:?\s*(.{2,60}?)(?:\n|$)/i,
]

export const DEFAULT_TXN_ID_PATTERNS = [
  /(?:Txn\.?|Transaction)\s*(?:ID|No\.?|#)\s*:?\s*([A-Z0-9\-]{6,30})/i,
  /(?:Ref\.?|Reference)\s*(?:No\.?|#)?\s*:?\s*([A-Z0-9\-]{6,30})/i,
]

export const RECEIPT_KEYWORDS = ['npr', 'rs', 'amount', 'transaction', 'success', 'paid', 'debit', 'रू']
