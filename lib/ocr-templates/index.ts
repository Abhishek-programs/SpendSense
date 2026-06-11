import { esewaTemplate } from './esewa'
import { khaltiTemplate } from './khalti'
import { nmbTemplate } from './nmb'
import { globalImeTemplate } from './global_ime'
import type { OcrTemplate, SourceAppId } from './types'

export const OCR_TEMPLATES: OcrTemplate[] = [
  esewaTemplate,
  khaltiTemplate,
  nmbTemplate,
  globalImeTemplate,
]

export function findTemplate(raw: string): OcrTemplate | null {
  return OCR_TEMPLATES.find(t => t.detect(raw)) ?? null
}

export function detectSourceAppId(raw: string): SourceAppId {
  return findTemplate(raw)?.id ?? 'unknown'
}

export function sourceAppLabel(sourceApp: SourceAppId): string | null {
  if (sourceApp === 'unknown') return null
  return OCR_TEMPLATES.find(t => t.id === sourceApp)?.label ?? null
}

export type { OcrTemplate, SourceAppId } from './types'
