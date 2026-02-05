import { ElectronAPI } from '@electron-toolkit/preload'
import type { BooksController } from '../main/controllers/books'
import type { TagsController } from '../main/controllers/tags'

// Automatically infer API shape from controller type
type ControllerAPI<T extends Record<string, (...args: never[]) => unknown>> = {
  [K in keyof T]: (...args: Parameters<T[K]>) => ReturnType<T[K]>
}

interface API {
  books: ControllerAPI<BooksController>
  tags: ControllerAPI<TagsController>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
