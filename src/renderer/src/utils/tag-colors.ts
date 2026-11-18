import type { Tag } from '@renderer/types/book'

export type TagColorClasses = { bg: string; text: string; hover: string; border: string }

// Color mapping available for tag colors
export const TAG_COLOR_MAP: Record<string, TagColorClasses> = {
  black: {
    bg: 'bg-gray-900',
    text: 'text-white',
    hover: 'hover:bg-gray-800',
    border: 'border-gray-700'
  },
  white: {
    bg: 'bg-white',
    text: 'text-gray-800',
    hover: 'hover:bg-gray-100',
    border: 'border-gray-300'
  },
  brown: {
    bg: 'bg-amber-800',
    text: 'text-white',
    hover: 'hover:bg-amber-900',
    border: 'border-amber-900'
  },
  lightBrown: {
    bg: 'bg-amber-100',
    text: 'text-amber-950',
    hover: 'hover:bg-amber-200',
    border: 'border-amber-300'
  },
  gold: {
    bg: 'bg-yellow-400',
    text: 'text-yellow-950',
    hover: 'hover:bg-yellow-500',
    border: 'border-yellow-600'
  },
  silver: {
    bg: 'bg-slate-300',
    text: 'text-slate-900',
    hover: 'hover:bg-slate-400',
    border: 'border-slate-500'
  },
  darkPurple: {
    bg: 'bg-purple-900',
    text: 'text-white',
    hover: 'hover:bg-purple-800',
    border: 'border-purple-700'
  },
  lightPurple: {
    bg: 'bg-purple-200',
    text: 'text-purple-950',
    hover: 'hover:bg-purple-300',
    border: 'border-purple-400'
  },
  skyBlue: {
    bg: 'bg-sky-200',
    text: 'text-sky-950',
    hover: 'hover:bg-sky-300',
    border: 'border-sky-400'
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    hover: 'hover:bg-red-200',
    border: 'border-red-300'
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200',
    border: 'border-blue-300'
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200',
    border: 'border-green-300'
  },
  yellow: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200',
    border: 'border-yellow-300'
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    hover: 'hover:bg-purple-200',
    border: 'border-purple-300'
  },
  pink: {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    hover: 'hover:bg-pink-200',
    border: 'border-pink-300'
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-200',
    border: 'border-orange-300'
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    hover: 'hover:bg-indigo-200',
    border: 'border-indigo-300'
  },
  cyan: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    hover: 'hover:bg-cyan-200',
    border: 'border-cyan-300'
  },
  teal: {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    hover: 'hover:bg-teal-200',
    border: 'border-teal-300'
  },
  lime: {
    bg: 'bg-lime-100',
    text: 'text-lime-800',
    hover: 'hover:bg-lime-200',
    border: 'border-lime-300'
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    hover: 'hover:bg-amber-200',
    border: 'border-amber-300'
  },
  gray: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    hover: 'hover:bg-gray-200',
    border: 'border-gray-300'
  },
  grey: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    hover: 'hover:bg-gray-200',
    border: 'border-gray-300'
  }
}

export const TAG_COLOR_OPTIONS = Object.keys(TAG_COLOR_MAP).filter((color) => color !== 'grey')

// Extract color from tag name/color field and return appropriate Tailwind classes
export function getTagColor(tag: Tag): TagColorClasses {
  const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]/g, '')
  if (tag.color) {
    const color = Object.keys(TAG_COLOR_MAP).find((key) => normalize(key) === normalize(tag.color!))
    if (color) return TAG_COLOR_MAP[color]
  }

  const name = normalize(tag.name)

  // Check if tag name contains any color keyword
  for (const [color, classes] of Object.entries(TAG_COLOR_MAP)) {
    if (name.includes(normalize(color))) {
      return classes
    }
  }

  // Default gray color
  return TAG_COLOR_MAP.gray
}
