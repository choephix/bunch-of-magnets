import { proxy } from 'valtio'
import { fetchConfig, type PublicDownloader } from '../services/configService'
import { settingsStore } from './settingsStore'

interface ConfigState {
  downloaders: PublicDownloader[]
  isLoading: boolean
}

export const configStore = proxy<ConfigState>({
  downloaders: [],
  isLoading: true,
})

/** Get the active downloader (selected or first available) */
export const getActiveDownloader = (): PublicDownloader | null => {
  const { downloaders } = configStore
  if (!downloaders.length) return null

  const selected = settingsStore.selectedDownloader
  if (selected) {
    const found = downloaders.find((item) => item.name === selected)
    if (found) return found
  }
  return downloaders[0]
}

export const configActions = {
  load: async () => {
    try {
      configStore.isLoading = true
      const config = await fetchConfig()
      configStore.downloaders = config.downloaders
      console.log(`✅ Config loaded: ${config.downloaders.length} downloader(s)`)
    } catch (error) {
      console.error('❌ Failed to load config:', error)
    } finally {
      configStore.isLoading = false
    }
  },
}
