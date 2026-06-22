import { ElectronAPI } from '@electron-toolkit/preload'
import type { BooksController } from '../main/controllers/books'
import type { TagsController } from '../main/controllers/tags'
import type { DashboardController } from '../main/controllers/dashboard'

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
  dashboard: ControllerAPI<DashboardController>
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
    getAll: (
      page?: number,
      perPage?: number,
      searchQuery?: string
    ) => Promise<{ users: unknown[]; total: number }>
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
    getUpcomingReturns: (
      page?: number,
      perPage?: number,
      searchQuery?: string
    ) => Promise<{ loans: unknown[]; total: number }>
    create: (data: {
      bookIsbns: string[]
      userEmail: string
      userName?: string
      dueDate?: Date | null
    }) => Promise<unknown[]>
    returnBook: (loanId: number) => Promise<unknown>
    extendLoan: (loanId: number, dueDate: Date) => Promise<unknown>
    bulkReturnBooks: (loanIds: number[]) => Promise<unknown>
    bulkExtendLoans: (loanIds: number[], dueDate: Date) => Promise<unknown>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
