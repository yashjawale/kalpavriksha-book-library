import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedCallback, useSimpleDebouncedCallback } from './use-debounced-callback'

// Enable fake timers for testing
vi.useFakeTimers()

describe('useDebouncedCallback', () => {
  let callback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    callback = vi.fn()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should debounce callback with per-key support', async () => {
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    // Call with same key multiple times
    act(() => {
      result.current('key1', 'arg1')
      result.current('key1', 'arg2')
      result.current('key1', 'arg3')
    })

    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled()

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Callback should be called once with the last arguments
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg3')
  })

  it('should handle multiple keys independently', async () => {
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('key1', 'value1')
      result.current('key2', 'value2')
    })

    // Neither should be called yet
    expect(callback).not.toHaveBeenCalled()

    // Advance time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Both should be called
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith('value1')
    expect(callback).toHaveBeenCalledWith('value2')
  })

  it('should cancel previous timer when called again with same key', async () => {
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('key1', 'first')
    })

    // Advance time partially
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Call again with same key
    act(() => {
      result.current('key1', 'second')
    })

    // Advance remaining time of first call
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Should not be called yet
    expect(callback).not.toHaveBeenCalled()

    // Advance rest of time for second call
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should be called once with second argument
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should use custom delay', async () => {
    const { result } = renderHook(() => useDebouncedCallback(callback, 1000))

    act(() => {
      result.current('key1', 'value')
    })

    // Advance 500ms - should not be called
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(callback).not.toHaveBeenCalled()

    // Advance another 500ms - should be called
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple arguments', async () => {
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('key1', 'arg1', 'arg2', 'arg3', { nested: 'object' })
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3', { nested: 'object' })
  })

  it('should cleanup timers on unmount', () => {
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('key1', 'value1')
      result.current('key2', 'value2')
    })

    unmount()

    // Advance time after unmount
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Callback should not be called
    expect(callback).not.toHaveBeenCalled()
  })

  it('should update callback reference when it changes', async () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { result, rerender } = renderHook(({ cb }) => useDebouncedCallback(cb, 500), {
      initialProps: { cb: callback1 }
    })

    act(() => {
      result.current('key1', 'value')
    })

    // Update callback
    rerender({ cb: callback2 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should call updated callback
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('value')
  })

  it('should remove timer after callback is executed', async () => {
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('key1', 'value1')
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)

    // Call with same key again
    act(() => {
      result.current('key1', 'value2')
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('value2')
  })
})

describe('useSimpleDebouncedCallback', () => {
  let callback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    callback = vi.fn()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should debounce callback', async () => {
    const { result } = renderHook(() => useSimpleDebouncedCallback(callback, 500))

    act(() => {
      result.current('arg1')
      result.current('arg2')
      result.current('arg3')
    })

    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled()

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Callback should be called once with the last arguments
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg3')
  })

  it('should share the same timer for all calls', async () => {
    const { result } = renderHook(() => useSimpleDebouncedCallback(callback, 500))

    act(() => {
      result.current('first')
    })

    // Advance time partially
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Call again - should reset timer
    act(() => {
      result.current('second')
    })

    // Advance remaining time of first call
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Should not be called yet because timer was reset
    expect(callback).not.toHaveBeenCalled()

    // Advance rest of time for second call
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should be called once with second argument
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should use custom delay', async () => {
    const { result } = renderHook(() => useSimpleDebouncedCallback(callback, 1000))

    act(() => {
      result.current('value')
    })

    // Advance 500ms - should not be called
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(callback).not.toHaveBeenCalled()

    // Advance another 500ms - should be called
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple arguments', async () => {
    const { result } = renderHook(() => useSimpleDebouncedCallback(callback, 500))

    act(() => {
      result.current('arg1', 'arg2', { nested: 'value' }, [1, 2, 3])
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { nested: 'value' }, [1, 2, 3])
  })

  it('should cleanup timer on unmount', () => {
    const { result, unmount } = renderHook(() => useSimpleDebouncedCallback(callback, 500))

    act(() => {
      result.current('value')
    })

    unmount()

    // Advance time after unmount
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Callback should not be called
    expect(callback).not.toHaveBeenCalled()
  })

  it('should update callback reference when it changes', async () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { result, rerender } = renderHook(({ cb }) => useSimpleDebouncedCallback(cb, 500), {
      initialProps: { cb: callback1 }
    })

    act(() => {
      result.current('value')
    })

    // Update callback before timer fires
    rerender({ cb: callback2 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should call updated callback
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('value')
  })

  it('should use default delay of 500ms when not specified', async () => {
    const { result } = renderHook(() => useSimpleDebouncedCallback(callback))

    act(() => {
      result.current('value')
    })

    // Advance 400ms - should not be called
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(callback).not.toHaveBeenCalled()

    // Advance 100ms more - should be called
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should allow rapid successive calls and only execute last one', async () => {
    const { result } = renderHook(() => useSimpleDebouncedCallback(callback, 500))

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current(`call-${i}`)
      }
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('call-9')
  })
})
