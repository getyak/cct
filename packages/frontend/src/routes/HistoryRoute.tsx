import { useCallback, useState } from 'react'
import { ConversationList } from '../components/ConversationList'
import { SearchBar } from '../components/SearchBar'
import { useSessions } from '../hooks/useSessions'
import { useLiveFeed } from '../hooks/useLiveFeed'
import { api } from '../lib/api'
import type { LiveEvent, SearchResult } from '../types/api'

export function HistoryRoute() {
  const { sessions, loading, refresh } = useSessions()
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  const handleLive = useCallback(
    (e: LiveEvent) => {
      if (e.type === 'message.created') refresh()
    },
    [refresh],
  )

  const { status } = useLiveFeed(handleLive)

  const handleSearch = async (q: string) => {
    setSearching(true)
    try {
      const r = await api.search(q)
      setSearchResults(r as SearchResult[])
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => setSearchResults(null)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-100">对话历史</h2>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              status === 'connected'
                ? 'bg-green-400'
                : status === 'reconnecting'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-gray-600'
            }`}
          />
          <span
            className={
              status === 'connected'
                ? 'text-green-400'
                : status === 'reconnecting'
                ? 'text-yellow-400'
                : 'text-gray-500'
            }
          >
            {status === 'connected' ? '实时' : status === 'reconnecting' ? '重连中…' : '离线'}
          </span>
        </div>
      </div>

      {/* search */}
      <div className="mb-4">
        <SearchBar onSearch={handleSearch} onClear={clearSearch} />
      </div>

      {/* results or list */}
      {searchResults !== null ? (
        <div>
          <div className="flex items-center justify-between mb-3 text-sm text-gray-400">
            <span>
              {searching ? '搜索中…' : `${searchResults.length} 条结果`}
            </span>
            <button
              onClick={clearSearch}
              className="text-purple-400 hover:text-purple-300 text-xs"
            >
              清除搜索
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map((r) => (
              <div
                key={r.message_id}
                className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-3 text-sm"
              >
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                  <span className="capitalize">{r.role}</span>
                  {r.primary_intent && (
                    <span className="text-purple-400">{r.primary_intent}</span>
                  )}
                  <span>{new Date(r.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <p
                  className="text-gray-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl overflow-hidden">
          <ConversationList sessions={sessions} loading={loading} />
        </div>
      )}
    </div>
  )
}
