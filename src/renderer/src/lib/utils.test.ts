import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2', 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('should handle conditional classes', () => {
    const showConditional = false
    const showIncluded = true
    const result = cn('always', showConditional && 'conditional', showIncluded && 'included')
    expect(result).toBe('always included')
  })

  it('should merge Tailwind classes correctly', () => {
    // Should keep the last conflicting class
    const result = cn('px-4', 'px-8')
    expect(result).toBe('px-8')
  })

  it('should handle undefined and null values', () => {
    const result = cn('class1', undefined, 'class2', null, 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('should handle empty strings', () => {
    const result = cn('class1', '', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('should handle objects with boolean values', () => {
    const result = cn({
      class1: true,
      class2: false,
      class3: true
    })
    expect(result).toBe('class1 class3')
  })

  it('should handle mixed inputs', () => {
    const result = cn(
      'base-class',
      ['array-class-1', 'array-class-2'],
      {
        'conditional-class-1': true,
        'conditional-class-2': false
      },
      undefined,
      'final-class'
    )
    expect(result).toContain('base-class')
    expect(result).toContain('array-class-1')
    expect(result).toContain('array-class-2')
    expect(result).toContain('conditional-class-1')
    expect(result).not.toContain('conditional-class-2')
    expect(result).toContain('final-class')
  })

  it('should resolve Tailwind class conflicts', () => {
    // Test multiple conflicting utilities
    const result = cn('p-4 p-8', 'mt-2 mt-4')
    expect(result).toBe('p-8 mt-4')
  })

  it('should handle complex Tailwind modifiers', () => {
    const result = cn('hover:bg-blue-500', 'hover:bg-red-500')
    expect(result).toBe('hover:bg-red-500')
  })

  it('should handle responsive classes', () => {
    const result = cn('text-sm md:text-base lg:text-lg')
    expect(result).toBe('text-sm md:text-base lg:text-lg')
  })

  it('should handle dark mode variants', () => {
    const result = cn('bg-white dark:bg-black')
    expect(result).toBe('bg-white dark:bg-black')
  })

  it('should return empty string when no classes provided', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle only falsy values', () => {
    const result = cn(false, null, undefined, '')
    expect(result).toBe('')
  })

  it('should trim whitespace', () => {
    const result = cn('  class1  ', '  class2  ')
    expect(result).toBe('class1 class2')
  })

  it('should handle duplicate classes', () => {
    // The cn function doesn't deduplicate classes, it just merges them
    // This is expected behavior with clsx + tailwind-merge
    const result = cn('class1 class1 class2')
    // tailwind-merge may not deduplicate non-Tailwind classes
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('should work with component patterns', () => {
    const baseStyles = 'rounded-lg border'
    const variantStyles = {
      primary: 'bg-blue-500 text-white',
      secondary: 'bg-gray-200 text-gray-900'
    }
    const sizeStyles = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    }

    const result = cn(baseStyles, variantStyles.primary, sizeStyles.md)
    expect(result).toContain('rounded-lg')
    expect(result).toContain('border')
    expect(result).toContain('bg-blue-500')
    expect(result).toContain('text-white')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })

  it('should handle state-based classes', () => {
    const isActive = true
    const isDisabled = false
    const hasError = true

    const result = cn('button', isActive && 'active', isDisabled && 'disabled', hasError && 'error')

    expect(result).toContain('button')
    expect(result).toContain('active')
    expect(result).not.toContain('disabled')
    expect(result).toContain('error')
  })

  it('should override conflicting tailwind utilities in correct order', () => {
    // Later classes should override earlier ones
    const result = cn('text-red-500', 'text-blue-500', 'text-green-500')
    expect(result).toBe('text-green-500')
  })

  it('should handle complex real-world example', () => {
    const result = cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium',
      'transition-colors focus-visible:outline-none focus-visible:ring-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'bg-primary text-primary-foreground hover:bg-primary/90',
      'h-10 px-4 py-2'
    )

    expect(result).toContain('inline-flex')
    expect(result).toContain('items-center')
    expect(result).toContain('justify-center')
    expect(result).toContain('rounded-md')
    expect(result).toContain('h-10')
  })
})
