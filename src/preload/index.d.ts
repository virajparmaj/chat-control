import type { ChatControlAPI } from './index'

declare global {
  interface Window {
    api: ChatControlAPI
  }
}
