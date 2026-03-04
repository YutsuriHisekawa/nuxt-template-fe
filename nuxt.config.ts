// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 5731 },

  app: {
    head: {
      title: 'Endfield',
      titleTemplate: '%s - Endfield',
      link: [
        {
          rel: 'icon',
          type: 'image/webp',
          href: '/logo.webp'
        }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: false
  },

  modules: [
    '@pinia/nuxt',
    '@vueuse/motion/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'https://server.qqltech.com:8002'
    }
  },

  alias: {
    '@': fileURLToPath(new URL('./app', import.meta.url))
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
      extensions: ['.vue']
    }
  ],

  vite: {
    plugins: [tailwindcss() as any]
  }
})
