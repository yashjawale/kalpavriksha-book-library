import { ElectronAPI } from '@electron-toolkit/preload'
import type { BooksController } from '../main/controllers/books'
import type { TagsController } from '../main/controllers/tags'

// Automatically infer API shape from controller type
type ControllerAPI<T extends Record<string, (...args: never[]) => unknown>> = {
  [K in keyof T]: (...args: Parameters<T[K]>) => ReturnType<T[K]>
}

interface API {
  app: {
    getVersion: () => Promise<string>
  }
  books: ControllerAPI<BooksController>
  tags: ControllerAPI<TagsController>
  auth: {
    login: () => Promise<{
      success: boolean
      user?: Record<string, unknown> | null
      error?: string
    }>
    logout: () => Promise<{ success: boolean }>
    getStatus: () => Promise<{ loggedIn: boolean; user?: Record<string, unknown> | null }>
    searchUsers: (query: string) => Promise<Array<{ name: string; email: string }>>
    getUserDetails: (email: string) => Promise<{ name: string; orgUnitPath: string } | null>
  }
  users: {
    getAll: () => Promise<unknown[]>
    getByEmail: (email: string) => Promise<unknown>
    updateName: (email: string, name: string) => Promise<unknown>
  }
  settings: {
    get: () => Promise<{ googleClientId: string; googleClientSecret: string }>
    update: (settings: {
      googleClientId?: string
      googleClientSecret?: string
    }) => Promise<{ googleClientId: string; googleClientSecret: string }>
  }
  loans: {
    getAllActive: () => Promise<unknown[]>
    create: (data: {
      bookIsbns: string[]
      userEmail: string
      userName?: string
      dueDate?: Date | null
    }) => Promise<unknown[]>
    returnBook: (loanId: number) => Promise<unknown>
    extendLoan: (loanId: number, dueDate: Date) => Promise<unknown>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
