export type SourceAppId = 'esewa' | 'khalti' | 'nmb' | 'global_ime' | 'unknown'

export type OcrTemplate = {
  id: Exclude<SourceAppId, 'unknown'>
  label: string
  /** Return true when this template should handle the receipt */
  detect: (raw: string) => boolean
  amountPatterns?: RegExp[]
  merchantPatterns?: RegExp[]
  remarksPatterns?: RegExp[]
  txnIdPatterns?: RegExp[]
  /** Optional text cleanup before parsing */
  normalize?: (raw: string) => string
}
