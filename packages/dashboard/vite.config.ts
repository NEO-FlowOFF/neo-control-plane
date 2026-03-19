import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const envDir = fileURLToPath(new URL('../..', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, envDir, '')

  if (command === 'build' && !env.VITE_API_BASE_URL?.trim()) {
    throw new Error('VITE_API_BASE_URL is required to build the dashboard')
  }

  return {
    envDir,
    plugins: [react()],
  }
})
