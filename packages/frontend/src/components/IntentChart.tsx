import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { IntentStat } from '../types/api'

const COLORS = [
  '#7c3aed', '#2563eb', '#dc2626', '#16a34a',
  '#d97706', '#0891b2', '#9333ea', '#6b7280',
]

interface Props {
  data: IntentStat[]
}

export function IntentChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        暂无数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="intent"
          cx="50%"
          cy="50%"
          outerRadius={95}
          label={({ intent, percentage }: { intent: string; percentage: number }) =>
            `${intent} ${percentage}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value} 次`, '对话数']}
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#e5e7eb' }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
