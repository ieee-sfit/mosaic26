import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { workstation4ResultsPlugin } from './src/workstation4/utils/resultsServerPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    workstation4ResultsPlugin(),
  ],
})

