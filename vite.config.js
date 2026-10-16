/* global process */
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { workstation4ResultsPlugin } from './src/workstation4/utils/resultsServerPlugin.js'
import { workstation1ResultsPlugin } from './src/legacy-f1-stream/utils/resultsServerPlugin.js'
import { workstation3ResultsPlugin } from './src/workstation3/utils/resultsServerPlugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // Two production targets: `kiosk` (launcher + all games + kiosk secret) and `board` (public leaderboard + committee desk).
  // Anything built on Vercel is public, so it is ALWAYS the board unless explicitly built with `--mode kiosk`.
  const board = mode === 'board' || (command === 'build' && !!process.env.VERCEL && mode !== 'kiosk')
  return {
  publicDir: board ? false : 'public',
  define: {
    'import.meta.env.VITE_TARGET': JSON.stringify(board ? 'board' : 'kiosk'),
    ...(board ? { 'import.meta.env.VITE_KIOSK_SECRET': '""' } : {}),
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    workstation1ResultsPlugin(),
    workstation3ResultsPlugin(),
    workstation4ResultsPlugin(),
  ],
  }
})
