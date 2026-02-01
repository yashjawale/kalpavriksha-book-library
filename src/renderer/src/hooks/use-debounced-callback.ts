import { useRef, useCallback, useEffect } from 'react'

/**
 * Custom hook to debounce a callback function with per-key debouncing support.
 * Useful for operations like API calls that should be delayed until user stops typing/interacting.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns A debounced version of the callback with per-key support
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
) {
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({})
  const callbackRef = useRef(callback)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const debouncedCallback = useCallback(
    (key: string, ...args: Parameters<T>) => {
      // Clear existing timer for this key
      if (timersRef.current[key]) {
        clearTimeout(timersRef.current[key])
      }

      // Set new timer
      timersRef.current[key] = setTimeout(() => {
        callbackRef.current(...args)
        delete timersRef.current[key]
      }, delay)
    },
    [delay]
  )

  return debouncedCallback
}

/**
 * Simple debounced callback without per-key support.
 * All calls share the same timer.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns A debounced version of the callback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSimpleDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        callbackRef.current(...args)
        timerRef.current = null
      }, delay)
    },
    [delay]
  )

  return debouncedCallback
}
