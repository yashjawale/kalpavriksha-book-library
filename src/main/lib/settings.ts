import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

export interface AppSettings {
  googleClientId: string
  googleClientSecret: string
  enableEmails: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  googleClientId: '',
  googleClientSecret: '',
  enableEmails: false
}

export function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): AppSettings {
  const settingsPath = getSettingsPath()
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const data = fs.readFileSync(settingsPath, 'utf8')
    const parsed = JSON.parse(data)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch (error) {
    console.error('Failed to read settings.json', error)
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const currentSettings = getSettings()
  const newSettings = { ...currentSettings, ...settings }

  const settingsPath = getSettingsPath()
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2), 'utf8')
  } catch (error) {
    console.error('Failed to write settings.json', error)
  }

  return newSettings
}
