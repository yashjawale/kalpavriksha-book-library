import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer - manually define methods for context bridge compatibility
const api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  books: {
    getAll: (
      page?: number,
      perPage?: number,
      orderBy?: string,
      order?: 'asc' | 'desc',
      isbnPrefix?: string,
      needsBarcodeSticker?: boolean
    ) =>
      ipcRenderer.invoke(
        'books:getAll',
        page,
        perPage,
        orderBy,
        order,
        isbnPrefix,
        needsBarcodeSticker
      ),
    getById: (isbn: string) => ipcRenderer.invoke('books:getById', isbn),
    create: (data: {
      isbn: string
      title: string
      author?: string
      publisher?: string
      totalStock?: number
      needsBarcodeSticker?: boolean
      tagIds?: number[]
    }) => ipcRenderer.invoke('books:create', data),
    updateDetails: (
      isbn: string,
      details: { title: string; author?: string; publisher?: string }
    ) => ipcRenderer.invoke('books:updateDetails', isbn, details),
    updateStock: (isbn: string, stockCount: number) =>
      ipcRenderer.invoke('books:updateStock', isbn, stockCount),
    incrementStockByOne: (isbn: string) => ipcRenderer.invoke('books:incrementStockByOne', isbn),
    decrementStockByOne: (isbn: string) => ipcRenderer.invoke('books:decrementStockByOne', isbn),
    delete: (isbn: string) => ipcRenderer.invoke('books:delete', isbn),
    bulkDelete: (isbns: string[]) => ipcRenderer.invoke('books:bulkDelete', isbns),
    bulkUpdateTags: (isbns: string[], tagIds: number[]) =>
      ipcRenderer.invoke('books:bulkUpdateTags', isbns, tagIds),
    bulkAddTag: (isbns: string[], tagIds: number[]) =>
      ipcRenderer.invoke('books:bulkAddTag', isbns, tagIds),
    bulkRemoveTag: (isbns: string[], tagIds: number[]) =>
      ipcRenderer.invoke('books:bulkRemoveTag', isbns, tagIds)
  },
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    getById: (id: number) => ipcRenderer.invoke('tags:getById', id),
    create: (name: string) => ipcRenderer.invoke('tags:create', name),
    createMany: (names: string[]) => ipcRenderer.invoke('tags:createMany', names),
    delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
    addTagsToBook: (isbn: string, tagIds: number[]) =>
      ipcRenderer.invoke('tags:addTagsToBook', isbn, tagIds),
    removeTagFromBook: (isbn: string, tagId: number) =>
      ipcRenderer.invoke('tags:removeTagFromBook', isbn, tagId)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
