import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { Session } from '../types/api'

export function useSessions(project?: string) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.sessions(project ? { project } : undefined)
      setSessions(data as Session[])
    } finally {
      setLoading(false)
    }
  }, [project])

  useEffect(() => {
    load()
  }, [load])

  return { sessions, loading, refresh: load }
}
