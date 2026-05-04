const COLOR_MAP: Record<string, string> = {
  coding: 'bg-blue-900/60 text-blue-300 border-blue-800',
  debugging: 'bg-red-900/60 text-red-300 border-red-800',
  architecture: 'bg-purple-900/60 text-purple-300 border-purple-800',
  documentation: 'bg-green-900/60 text-green-300 border-green-800',
  question: 'bg-yellow-900/60 text-yellow-300 border-yellow-800',
  planning: 'bg-orange-900/60 text-orange-300 border-orange-800',
  review: 'bg-cyan-900/60 text-cyan-300 border-cyan-800',
  other: 'bg-gray-800 text-gray-400 border-gray-700',
}

export function IntentBadge({ intent }: { intent: string }) {
  const cls = COLOR_MAP[intent] ?? COLOR_MAP.other
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium ${cls}`}
    >
      {intent}
    </span>
  )
}
