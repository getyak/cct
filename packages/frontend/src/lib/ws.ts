import type { LiveEvent } from '../types/api'

type Handler = (e: LiveEvent) => void
export type ConnStatus = 'connected' | 'reconnecting' | 'disconnected'
type StatusHandler = (s: ConnStatus) => void

export function createWsConnection(onEvent: Handler, onStatus?: StatusHandler) {
  let ws: WebSocket | null = null
  let retryDelay = 1000
  let destroyed = false

  function connect() {
    if (destroyed) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${proto}://${window.location.host}/ws/live`)

    ws.onopen = () => {
      retryDelay = 1000
      onStatus?.('connected')
    }

    ws.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data))
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (destroyed) return
      onStatus?.('reconnecting')
      setTimeout(connect, Math.min(retryDelay, 30000))
      retryDelay = Math.min(retryDelay * 2, 30000)
    }

    ws.onerror = () => ws?.close()
  }

  connect()
  return () => {
    destroyed = true
    ws?.close()
  }
}
