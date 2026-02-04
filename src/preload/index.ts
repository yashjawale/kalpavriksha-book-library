import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer - manually define methods for context bridge compatibility
const api = {
  books: {
    getAll: (page?: number, perPage?: number, orderBy?: string, order?: 'asc' | 'desc') =>
      ipcRenderer.invoke('books:getAll', page, perPage, orderBy, order),
    getById: (isbn: string) => ipcRenderer.invoke('books:getById', isbn),
    create: (data: {
      isbn: string
      title: string
      author?: string
      publisher?: string
      totalStock?: number
    }) => ipcRenderer.invoke('books:create', data),
    updateStock: (isbn: string, stockCount: number) =>
      ipcRenderer.invoke('books:updateStock', isbn, stockCount),
    incrementStockByOne: (isbn: string) => ipcRenderer.invoke('books:incrementStockByOne', isbn),
    decrementStockByOne: (isbn: string) => ipcRenderer.invoke('books:decrementStockByOne', isbn),
    delete: (isbn: string) => ipcRenderer.invoke('books:delete', isbn)
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
