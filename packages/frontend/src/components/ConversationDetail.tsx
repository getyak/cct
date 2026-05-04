import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IntentBadge } from './IntentBadge'
import type { Message } from '../types/api'

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === 'user'
  const totalTok = (m.input_tokens ?? 0) + (m.output_tokens ?? 0)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-purple-900/50 border border-purple-800/40'
            : 'bg-gray-800/80 border border-gray-700/40'
        }`}
      >
        {/* header */}
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 flex-wrap">
          <span className="font-semibold text-gray-300">
            {isUser ? '你' : 'Claude'}
          </span>
          <span>{fmtTime(m.created_at)}</span>
          {m.intent && <IntentBadge intent={m.intent.primary} />}
          {totalTok > 0 && <span className="text-gray-500">{totalTok} tok</span>}
          {m.model && <span className="text-gray-600">{m.model}</span>}
        </div>

        {/* content */}
        <div className="prose-cct">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
        </div>

        {/* keywords */}
        {m.intent?.keywords && m.intent.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {m.intent.keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs bg-gray-700/60 text-gray-400 px-1.5 py-0.5 rounded"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConversationDetail({ messages }: { messages: Message[] }) {
  if (!messages.length) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">暂无消息</div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {messages.map((m) => (
        <MessageBubble key={m.id} m={m} />
      ))}
    </div>
  )
}
