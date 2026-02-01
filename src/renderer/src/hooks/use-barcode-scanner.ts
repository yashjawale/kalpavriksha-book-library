import { useEffect, useRef } from 'react'

export interface BarcodeScannerOptions {
  onScan: (barcode: string) => void
  enabled?: boolean
  ignoreInputs?: boolean
}

/**
 * Custom hook to handle barcode scanner input from keyboard events.
 * Barcode scanners typically send characters rapidly followed by an Enter key.
 *
 * @param options - Configuration options
 * @param options.onScan - Callback function when barcode is scanned
 * @param options.enabled - Whether the scanner is active (default: true)
 * @param options.ignoreInputs - Whether to ignore scans when an input is focused (default: true)
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  ignoreInputs = true
}: BarcodeScannerOptions) {
  const barcodeBuffer = useRef('')

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input/textarea is focused (optional)
      if (ignoreInputs && (e.target as HTMLElement).tagName === 'INPUT') return
      if (ignoreInputs && (e.target as HTMLElement).tagName === 'TEXTAREA') return

      // Check for Enter key to complete barcode scan
      if (e.key === 'Enter') {
        const barcode = barcodeBuffer.current.trim()
        if (barcode) {
          onScan(barcode)
          barcodeBuffer.current = ''
        }
        return
      }

      // Accumulate barcode characters (single character keys)
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      barcodeBuffer.current = ''
    }
  }, [onScan, enabled, ignoreInputs])
}
