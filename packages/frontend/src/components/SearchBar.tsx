import { useState, useCallback } from 'react'

interface Props {
  onSearch: (q: string) => void
  onClear?: () => void
}

export function SearchBar({ onSearch, onClear }: Props) {
  const [val, setVal] = useState('')

  const submit = useCallback(() => {
    const q = val.trim()
    if (q) onSearch(q)
  }, [val, onSearch])

  const clear = useCallback(() => {
    setVal('')
    onClear?.()
  }, [onClear])

  return (
    <div className="flex gap-2">
      <input
        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
                   focus:outline-none focus:border-purple-500 placeholder-gray-500"
        placeholder="搜索对话内容… (回车确认)"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {val && (
        <button
          onClick={clear}
          className="px-3 py-2 text-gray-400 hover:text-gray-200 text-sm"
        >
          ✕
        </button>
      )}
      <button
        onClick={submit}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium
                   transition-colors disabled:opacity-50"
        disabled={!val.trim()}
      >
        搜索
      </button>
    </div>
  )
}
