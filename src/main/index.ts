import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { booksController } from './controllers/books'
import { tagsController } from './controllers/tags'
import { captureController } from './controllers/capture'
import { startCaptureProcessor } from './lib/captureProcessor'
import { closeDb } from './lib/captureDb'
import { getBookInfoGoogleBooks, getBookInfoIndian, getBookInfoOpenLibrary } from './lib/bookApi'
import { usersController } from './controllers/users'
import { loansController } from './controllers/loans'
import { authController } from './lib/auth'
import { settingsController } from './controllers/settings'
import { dashboardController } from './controllers/dashboard'
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
    icon: join(__dirname, '../../resources/icon.png'),
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
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

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
    registerController('users', usersController)
    registerController('loans', loansController)
    registerController('auth', authController)
    registerController('settings', settingsController)
    registerController('dashboard', dashboardController)
    registerController('capture', captureController)

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

    // Database handlers removed.

    // Start the background capture processor
    startCaptureProcessor()

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('before-quit', () => {
  closeDb()
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
