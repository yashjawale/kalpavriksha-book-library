import { getSettings, saveSettings, AppSettings } from '../lib/settings'

export const settingsController = {
  get: async () => {
    return getSettings()
  },

  update: async (settings: Partial<AppSettings>) => {
    return saveSettings(settings)
  }
}
