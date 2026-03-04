<script setup lang="ts">
import { AlertCircle, Home, ArrowLeft } from 'lucide-vue-next'

const props = defineProps<{
  error: {
    statusCode: number
    statusMessage?: string
    message?: string
  }
}>()

// === Theme support (error.vue berjalan terpisah dari app.vue) ===
const themeCookie = useCookie('theme')
const themeColorCookie = useCookie('theme-color')
const isDark = computed(() => themeCookie.value === 'dark')

useHead(() => ({
  htmlAttrs: {
    class: isDark.value ? 'dark' : '',
    'data-theme': themeColorCookie.value || 'default'
  }
}))

const goBack = () => {
  clearError()
  useRouter().back()
}

const goHome = () => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-background">
    <Card class="w-full max-w-md shadow-lg">
      <CardHeader class="text-center space-y-2 pb-4">
        <div class="flex justify-center">
          <div class="relative">
            <div class="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
            <div class="relative bg-primary/10 p-4 rounded-full border-4 border-primary/30">
              <AlertCircle class="h-10 w-10 text-primary" stroke-width="2.5" />
            </div>
          </div>
        </div>
        <div>
          <h1 class="text-7xl font-black leading-none text-primary">
            {{ error.statusCode }}
          </h1>
          <CardTitle class="text-xl mt-1 font-bold">Terjadi Kesalahan</CardTitle>
          <CardDescription class="text-sm mt-1">
            {{ error.statusMessage || error.message || 'Terjadi kesalahan pada sistem' }}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <div class="flex flex-col sm:flex-row gap-2">
          <Button @click="goBack" variant="outline" class="flex-1 gap-2 group">
            <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Kembali
          </Button>
          <Button @click="goHome" class="flex-1 gap-2 group">
            <Home class="h-4 w-4" />
            Ke Halaman Utama
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
