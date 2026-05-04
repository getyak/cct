import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { TokenStat } from '../types/api'

interface Props {
  data: TokenStat[]
}

export function TokenChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        暂无数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={{ stroke: '#374151' }}
        />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#374151' }} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#e5e7eb' }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>
          )}
        />
        <Bar dataKey="input_tokens" name="输入 Token" fill="#7c3aed" radius={[3, 3, 0, 0]} />
        <Bar dataKey="output_tokens" name="输出 Token" fill="#2563eb" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
