const BASE = '/api/v1'

async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  sessions: (params?: Record<string, string | number | undefined>) =>
    get<unknown[]>('/sessions', params),

  session: (id: string) =>
    get<{ session: unknown; messages: unknown[] }>(`/sessions/${id}`),

  search: (q: string, limit = 20) =>
    get<unknown[]>('/search', { q, limit }),

  statsIntents: (from?: number, to?: number) =>
    get<unknown[]>('/stats/intents', { from_ts: from, to_ts: to }),

  statsTokens: (from?: number, to?: number, bucket = 'day') =>
    get<unknown[]>('/stats/tokens', { from_ts: from, to_ts: to, bucket }),
}
