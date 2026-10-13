import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { workstation4ResultsPlugin } from './src/workstation4/utils/resultsServerPlugin.js'
import { workstation1ResultsPlugin } from './src/legacy-f1-stream/utils/resultsServerPlugin.js'
import { workstation3ResultsPlugin } from './src/workstation3/utils/resultsServerPlugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Two production targets: `kiosk` (launcher + all games + kiosk secret) and `board` (public leaderboard only).
  publicDir: mode === 'board' ? false : 'public',
  define: {
    'import.meta.env.VITE_TARGET': JSON.stringify(mode === 'board' ? 'board' : 'kiosk'),
    ...(mode === 'board' ? { 'import.meta.env.VITE_KIOSK_SECRET': '""' } : {}),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    workstation1ResultsPlugin(),
    workstation3ResultsPlugin(),
    workstation4ResultsPlugin(),
  ],
}))
