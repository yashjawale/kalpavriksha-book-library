import { useState, useEffect } from 'react'
import { Input } from '@renderer/components/ui/input'

interface StockInputProps {
  isbn: string
  initialStock: number
  onStockChange: (isbn: string, newStock: number) => void
}

export function StockInput({ isbn, initialStock, onStockChange }: StockInputProps) {
  const [localValue, setLocalValue] = useState(initialStock)

  // Sync local state when external value changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(initialStock)
  }, [initialStock])

  const handleBlur = () => {
    const newValue = Math.max(0, localValue)
    if (newValue !== initialStock) {
      onStockChange(isbn, newValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <Input
      type="number"
      min="0"
      value={localValue}
      onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-20"
    />
  )
}
