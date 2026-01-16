import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // base: '//',
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT) || 3011,
      allowedHosts: ['a29bbd47db71.ngrok-free.app'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '~': path.resolve(__dirname, 'node_modules'),
        '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
        '~socicon': path.resolve(__dirname, 'node_modules/socicon'),
        'tailwindcss/defaultConfig': path.resolve(
          __dirname,
          'app/theme/helpers/tailwindDefaultConfig.js'
        ),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
          additionalData: `@use "sass:color";`,
        },
      },
    },
  }
})
