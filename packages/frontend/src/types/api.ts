export interface Session {
  id: string
  source: string
  project_path: string | null
  project_name: string | null
  title: string | null
  started_at: number
  ended_at: number | null
  message_count: number
  total_input_tokens: number
  total_output_tokens: number
  metadata: Record<string, unknown> | null
}

export interface Intent {
  primary: string
  confidence: number
  keywords: string[]
  summary: string | null
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: number
  input_tokens: number | null
  output_tokens: number | null
  model: string | null
  intent: Intent | null
}

export interface SearchResult {
  message_id: string
  session_id: string
  role: string
  snippet: string
  created_at: number
  primary_intent: string | null
}

export interface IntentStat {
  intent: string
  count: number
  percentage: number
}

export interface TokenStat {
  bucket: string
  input_tokens: number
  output_tokens: number
}

export interface LiveEvent {
  type: string
  data: Record<string, unknown>
  ts?: number
}
