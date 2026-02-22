import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { booksController } from './controllers/books'
import { tagsController } from './controllers/tags'
import { getBookInfoGoogleBooks, getBookInfoIndian, getBookInfoOpenLibrary } from './lib/bookApi'
import { dbFilePath } from './lib/prisma'
import * as fs from 'fs'

// Helper to automatically register IPC handlers for a controller
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic controller registration requires accepting any function signature
function registerController<T extends Record<string, (...args: any[]) => any>>(
  name: string,
  controller: T
) {
  for (const [key, handler] of Object.entries(controller)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- IPC handler args must match runtime controller method signatures
    ipcMain.handle(`${name}:${key}`, async (_, ...args: any[]) => {
      return await handler(...args)
    })
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 670,
    show: false,
    // minWidth: 1085,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // App version handler
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  // Auto-register controllers
  registerController('books', booksController)
  registerController('tags', tagsController)

  // Register book API handlers
  ipcMain.handle('bookApi:getGoogleBooksInfo', async (_, isbn: string) => {
    return await getBookInfoGoogleBooks(isbn)
  })

  ipcMain.handle('bookApi:getOpenLibraryInfo', async (_, isbn: string) => {
    return await getBookInfoOpenLibrary(isbn)
  })

  ipcMain.handle('bookApi:getIndianBooksInfo', async (_, isbn: string) => {
    return await getBookInfoIndian(isbn)
  })

  // Database backup/restore handlers
  ipcMain.handle('database:export', async () => {
    try {
      const { filePath } = await dialog.showSaveDialog({
        title: 'Export Database Backup',
        defaultPath: `library-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [{ name: 'Database', extensions: ['db'] }]
      })

      if (!filePath) {
        return { success: false, error: 'No file selected' }
      }

      // Check if database exists
      if (!fs.existsSync(dbFilePath)) {
        return { success: false, error: `Database not found at: ${dbFilePath}` }
      }

      fs.copyFileSync(dbFilePath, filePath)

      return { success: true }
    } catch (error) {
      console.error('Error exporting database:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('database:import', async (_, data: Uint8Array) => {
    try {
      const backupPath = `${dbFilePath}.backup`

      // Create backup of current database
      if (fs.existsSync(dbFilePath)) {
        fs.copyFileSync(dbFilePath, backupPath)
      }

      // Convert Uint8Array to Buffer for Node.js file operations
      const buffer = Buffer.from(data)

      // Write new database
      fs.writeFileSync(dbFilePath, buffer)

      return { success: true }
    } catch (error) {
      console.error('Error importing database:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
