const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required for production dashboard builds')
}

const defaultApiBaseUrl = 'http://localhost:3000'

export const apiBaseUrl = (configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/$/, '')

export async function fetchApiHealth(signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/health`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`API healthcheck failed with status ${response.status}`)
  }

  return response.json() as Promise<{ ok: boolean }>
}
