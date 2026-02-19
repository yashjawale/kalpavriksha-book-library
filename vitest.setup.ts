import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock electron module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/path'),
    on: vi.fn(),
    quit: vi.fn()
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn()
  },
  ipcRenderer: {
    on: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn()
  },
  BrowserWindow: vi.fn()
}))

// Mock @electron-toolkit/utils
vi.mock('@electron-toolkit/utils', () => ({
  is: {
    dev: true
  }
}))

// Add custom matchers if needed
expect.extend({
  // Custom matchers can be added here
})
