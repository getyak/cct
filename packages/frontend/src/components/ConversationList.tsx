import { useNavigate } from 'react-router-dom'
import type { Session } from '../types/api'

function fmtTime(ms: number) {
  return new Date(ms).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

interface Props {
  sessions: Session[]
  loading: boolean
}

export function ConversationList({ sessions, loading }: Props) {
  const nav = useNavigate()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        加载中…
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-2">
        <span className="text-2xl opacity-30">💬</span>
        <p>暂无对话记录</p>
        <p className="text-xs text-gray-600">安装 Hook 后对话将自动出现</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-800/60">
      {sessions.map((s) => {
        const title = s.title ?? s.project_name ?? s.project_path?.split('/').pop() ?? '未知会话'
        const totalTok = s.total_input_tokens + s.total_output_tokens

        return (
          <div
            key={s.id}
            className="px-4 py-3.5 hover:bg-gray-800/40 cursor-pointer transition-colors"
            onClick={() => nav(`/session/${s.id}`)}
          >
            {/* session title (first user message) */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium text-gray-200 truncate">{title}</p>
              <span className="text-xs text-gray-500 shrink-0">{fmtTime(s.started_at)}</span>
            </div>
            {/* project name + directory path */}
            {(s.project_name || s.project_path) && (
              <div className="flex items-center gap-1.5 text-xs mb-1 truncate">
                <span className="text-gray-600">📁</span>
                {s.project_name && (
                  <span className="text-purple-400/80 font-medium">{s.project_name}</span>
                )}
                {s.project_name && s.project_path && (
                  <span className="text-gray-700">·</span>
                )}
                {s.project_path && (
                  <span className="text-gray-500 truncate">{s.project_path}</span>
                )}
              </div>
            )}
            {/* stats */}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span>{s.message_count} 条消息</span>
              <span>·</span>
              <span>{fmtTokens(totalTok)} tok</span>
              <span>·</span>
              <span>{s.source}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
