import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { IntentChart } from '../components/IntentChart'
import { TokenChart } from '../components/TokenChart'
import type { IntentStat, TokenStat } from '../types/api'

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

export function DashboardRoute() {
  const [intents, setIntents] = useState<IntentStat[]>([])
  const [tokens, setTokens] = useState<TokenStat[]>([])

  useEffect(() => {
    api.statsIntents().then((d) => setIntents(d as IntentStat[]))
    api.statsTokens().then((d) => setTokens(d as TokenStat[]))
  }, [])

  const totalConversations = intents.reduce((s, i) => s + i.count, 0)
  const totalTokens = tokens.reduce(
    (s, t) => s + t.input_tokens + t.output_tokens,
    0,
  )
  const topIntent = intents[0]?.intent ?? '-'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-6 text-gray-100">数据看板</h2>

      {/* stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="总对话数" value={totalConversations} />
        <StatCard
          label="总 Token 消耗"
          value={
            totalTokens >= 1000
              ? `${(totalTokens / 1000).toFixed(1)}k`
              : totalTokens
          }
        />
        <StatCard label="最常见意图" value={topIntent} />
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">意图分布</h3>
          <IntentChart data={intents} />
        </div>
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Token 使用趋势</h3>
          <TokenChart data={tokens} />
        </div>
      </div>
    </div>
  )
}
