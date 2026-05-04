import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ConversationDetail } from '../components/ConversationDetail'
import { api } from '../lib/api'
import type { Session, Message } from '../types/api'

function fmtTime(ms: number) {
  return new Date(ms).toLocaleString('zh-CN')
}

export function DetailRoute() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .session(id)
      .then((r) => {
        setSession(r.session as Session)
        setMessages(r.messages as Message[])
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="p-6 text-gray-500 text-sm">加载中…</div>
  }

  if (error || !session) {
    return <div className="p-6 text-red-400 text-sm">{error ?? '会话不存在'}</div>
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* back */}
      <button
        onClick={() => nav(-1)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-5 transition-colors"
      >
        ← 返回
      </button>

      {/* session meta */}
      <div className="mb-5 bg-gray-900/60 border border-gray-800/60 rounded-xl p-4 space-y-2">
        {/* title: first user message */}
        <p className="font-semibold text-gray-100 leading-snug">
          {session.title ?? session.project_name ?? session.project_path ?? 'Unknown Session'}
        </p>
        {/* project name + path */}
        {(session.project_name || session.project_path) && (
          <div className="flex items-start gap-2 text-xs">
            <span className="text-gray-600 mt-0.5">📁</span>
            <div className="flex flex-col gap-0.5">
              {session.project_name && (
                <span className="text-purple-400/90 font-medium">{session.project_name}</span>
              )}
              {session.project_path && (
                <span className="text-gray-500 break-all">{session.project_path}</span>
              )}
            </div>
          </div>
        )}
        {/* stats */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1 border-t border-gray-800/40">
          <span>{session.message_count} 条消息</span>
          <span>
            {(session.total_input_tokens + session.total_output_tokens).toLocaleString()} tokens
          </span>
          <span>{session.source}</span>
          <span>{fmtTime(session.started_at)}</span>
        </div>
      </div>

      {/* messages */}
      <ConversationDetail messages={messages} />
    </div>
  )
}
