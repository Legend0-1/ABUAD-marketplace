'use client'

// Lightweight fetch wrapper with JSON handling + auth cookie (same-origin)
export async function api<T = any>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any; query?: Record<string, string | number | undefined> } = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const { method = 'GET', body, query } = opts
  let url = path
  if (query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })
    const text = await res.text()
    let json: any = null
    try { json = text ? JSON.parse(text) : null } catch { json = { error: text } }
    if (!res.ok) {
      return { error: json?.error || `HTTP ${res.status}`, status: res.status }
    }
    return { data: json as T, status: res.status }
  } catch (e: any) {
    return { error: e?.message || 'Network error', status: 0 }
  }
}
