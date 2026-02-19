import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBarcodeScanner } from './use-barcode-scanner'

describe('useBarcodeScanner', () => {
  let onScan: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onScan = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should call onScan when barcode is scanned (characters + Enter)', () => {
    renderHook(() => useBarcodeScanner({ onScan }))

    // Simulate barcode scanner typing ISBN
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '7' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '8' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '6' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '7' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '8' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).toHaveBeenCalledWith('9780123456789')
    expect(onScan).toHaveBeenCalledTimes(1)
  })

  it('should accumulate barcode across multiple character inputs', () => {
    renderHook(() => useBarcodeScanner({ onScan }))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'B' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'C' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).toHaveBeenCalledWith('ABC123')
  })

  it('should not call onScan when Enter is pressed without any characters', () => {
    renderHook(() => useBarcodeScanner({ onScan }))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).not.toHaveBeenCalled()
  })

  it('should clear buffer after successful scan', () => {
    renderHook(() => useBarcodeScanner({ onScan }))

    // First scan
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).toHaveBeenCalledWith('123')

    // Second scan
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '6' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).toHaveBeenCalledWith('456')
    expect(onScan).toHaveBeenCalledTimes(2)
  })

  it('should not listen when enabled is false', () => {
    renderHook(() => useBarcodeScanner({ onScan, enabled: false }))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).not.toHaveBeenCalled()
  })

  it('should ignore input when focus is on INPUT element and ignoreInputs is true', () => {
    renderHook(() => useBarcodeScanner({ onScan, ignoreInputs: true }))

    const input = document.createElement('input')
    document.body.appendChild(input)

    act(() => {
      const event = new KeyboardEvent('keydown', { key: '1' })
      Object.defineProperty(event, 'target', { value: input, writable: false })
      window.dispatchEvent(event)

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(enterEvent, 'target', { value: input, writable: false })
      window.dispatchEvent(enterEvent)
    })

    expect(onScan).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('should ignore input when focus is on TEXTAREA element and ignoreInputs is true', () => {
    renderHook(() => useBarcodeScanner({ onScan, ignoreInputs: true }))

    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)

    act(() => {
      const event = new KeyboardEvent('keydown', { key: '1' })
      Object.defineProperty(event, 'target', { value: textarea, writable: false })
      window.dispatchEvent(event)

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(enterEvent, 'target', { value: textarea, writable: false })
      window.dispatchEvent(enterEvent)
    })

    expect(onScan).not.toHaveBeenCalled()

    document.body.removeChild(textarea)
  })

  it('should work with inputs when ignoreInputs is false', () => {
    renderHook(() => useBarcodeScanner({ onScan, ignoreInputs: false }))

    const input = document.createElement('input')
    document.body.appendChild(input)

    act(() => {
      const event1 = new KeyboardEvent('keydown', { key: '1' })
      Object.defineProperty(event1, 'target', { value: input, writable: false })
      window.dispatchEvent(event1)

      const event2 = new KeyboardEvent('keydown', { key: '2' })
      Object.defineProperty(event2, 'target', { value: input, writable: false })
      window.dispatchEvent(event2)

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      Object.defineProperty(enterEvent, 'target', { value: input, writable: false })
      window.dispatchEvent(enterEvent)
    })

    expect(onScan).toHaveBeenCalledWith('12')

    document.body.removeChild(input)
  })

  it('should ignore special keys (Shift, Control, etc.)', () => {
    renderHook(() => useBarcodeScanner({ onScan }))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    // Should only capture '1' and '2', ignoring special keys
    expect(onScan).toHaveBeenCalledWith('12')
  })

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useBarcodeScanner({ onScan }))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })

  it('should trim whitespace from barcode before calling onScan', () => {
    renderHook(() => useBarcodeScanner({ onScan }))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).toHaveBeenCalledWith('123')
  })

  it('should update when onScan callback changes', () => {
    const newOnScan = vi.fn()
    const { rerender } = renderHook(({ callback }) => useBarcodeScanner({ onScan: callback }), {
      initialProps: { callback: onScan }
    })

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(onScan).toHaveBeenCalledWith('1')

    rerender({ callback: newOnScan })

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    expect(newOnScan).toHaveBeenCalledWith('2')
  })
})
