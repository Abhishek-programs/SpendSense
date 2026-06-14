/**
 * OCR for overlay captures runs in the Headless JS task (see index.js + lib/overlay-headless.ts).
 * This hook is kept as a no-op anchor so _layout.tsx does not need churn when the pipeline moves.
 */
export function useOverlay() {}
