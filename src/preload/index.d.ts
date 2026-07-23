import { ElectronAPI } from '@electron-toolkit/preload'
import type { BooksController } from '../main/controllers/books'
import type { TagsController } from '../main/controllers/tags'
import type { DashboardController } from '../main/controllers/dashboard'
import type { LoansController } from '../main/controllers/loans'
import type { UsersController } from '../main/controllers/users'

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
  users: ControllerAPI<UsersController>
  settings: {
    get: () => Promise<{
      googleClientId: string
      googleClientSecret: string
      enableEmails: boolean
      databaseUrl: string
    }>
    update: (settings: {
      googleClientId?: string
      googleClientSecret?: string
      enableEmails?: boolean
      databaseUrl?: string
    }) => Promise<{
      googleClientId: string
      googleClientSecret: string
      enableEmails: boolean
      databaseUrl: string
    }>
  }
  loans: ControllerAPI<LoansController>
  discards: {
    getDiscardedBooks: (
      page?: number,
      perPage?: number,
      tagIds?: number[]
    ) => Promise<{
      discarded: Array<{
        id: number
        isbn: string
        title: string
        count: number
        note: string | null
        discardedAt: string
      }>
      total: number
    }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
