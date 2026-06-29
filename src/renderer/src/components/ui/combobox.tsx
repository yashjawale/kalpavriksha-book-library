"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@renderer/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@renderer/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@renderer/components/ui/popover"

export type ComboboxOption = {
  value: string
  label: string
  disabled?: boolean
  customNode?: React.ReactNode
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  onInputChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  onInputChange,
  placeholder = "Select option...",
  emptyText = "No option found.",
  loading = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const prevValue = React.useRef(value)

  React.useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value
      if (value) {
        const selected = options.find((opt) => opt.value === value)
        setInputValue(selected ? selected.label : value)
      } else {
        setInputValue("")
      }
    } else {
      // Resolve label when options load, only if popover is closed or value is set
      if (value && !open) {
        const selected = options.find((opt) => opt.value === value)
        if (selected && inputValue !== selected.label) {
          setInputValue(selected.label)
        }
      }
    }
  }, [value, options, open, inputValue])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              if (onInputChange) {
                onInputChange(e.target.value)
              }
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {loading ? (
              <div className="p-4 text-sm text-center text-muted-foreground">Loading...</div>
            ) : (
              <>
                {options.length === 0 ? (
                  <CommandEmpty>{emptyText}</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        disabled={option.disabled}
                        onSelect={(currentValue) => {
                          const selected = options.find(
                            (opt) =>
                              opt.label.toLowerCase() === currentValue.toLowerCase() ||
                              opt.value === currentValue
                          )
                          if (selected && !selected.disabled) {
                            onChange(selected.value)
                            setInputValue(selected.label)
                            setOpen(false)
                          }
                        }}
                      >
                        {option.customNode ? option.customNode : (
                          <>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                value === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.label}
                          </>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
