const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init)
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}
