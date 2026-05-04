import { useEffect, useState } from 'react'
import { createWsConnection } from '../lib/ws'
import type { ConnStatus } from '../lib/ws'
import type { LiveEvent } from '../types/api'

export function useLiveFeed(onEvent: (e: LiveEvent) => void) {
  const [status, setStatus] = useState<ConnStatus>('reconnecting')

  useEffect(() => {
    return createWsConnection(onEvent, setStatus)
  }, [onEvent])

  return { status, connected: status === 'connected' }
}
