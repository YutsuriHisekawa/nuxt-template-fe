<script setup lang="ts">
import { AlertCircle, Home, ArrowLeft, Settings, Code } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const currentPath = computed(() => route.fullPath)

const goBack = () => {
  router.back()
}

const goHome = () => {
  router.push('/')
}

const contactDeveloper = () => {
  window.open('https://github.com/YutsuriHisekawa/mitravisualgroup/issues', '_blank')
}
</script>

<template>
  <div class="flex items-center justify-center p-4">
    <Card class="w-full max-w-2xl shadow-lg"
      v-motion
      :initial="{ opacity: 0, scale: 0.97, y: 16 }"
      :enter="{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } }"
    >
      <CardHeader class="text-center space-y-2 pb-4">
        <div class="flex justify-center"
          v-motion
          :initial="{ opacity: 0, scale: 0.5 }"
          :enter="{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 140, damping: 12, delay: 80 } }"
        >
          <div class="relative">
            <div class="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
            <div class="relative bg-primary/10 p-4 rounded-full border-4 border-primary/30">
              <AlertCircle class="h-10 w-10 text-primary" stroke-width="2.5" />
            </div>
          </div>
        </div>
        <div
          v-motion
          :initial="{ opacity: 0, y: 12 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 150 } }"
        >
          <h1 class="text-7xl font-black leading-none text-primary">
            404
          </h1>
          <CardTitle class="text-xl mt-1 font-bold">
            Halaman Tidak Ditemukan
          </CardTitle>
          <CardDescription class="text-sm mt-1">
            Maaf, halaman yang Anda cari tidak tersedia
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent class="space-y-4"
        v-motion
        :initial="{ opacity: 0, y: 12 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 220 } }"
      >
        <div class="bg-muted/50 backdrop-blur-sm p-4 rounded-lg border border-border/50 space-y-3">
          <div class="flex items-start gap-3">
            <div class="p-1.5 bg-primary/10 rounded-md shrink-0">
              <Settings class="h-4 w-4 text-primary" />
            </div>
            <div class="space-y-1 flex-1">
              <p class="text-sm font-semibold text-foreground">
                Route Belum Terdaftar dalam Router
              </p>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Halaman yang Anda cari belum dikonfigurasi dalam sistem routing aplikasi. 
                Kemungkinan route ini belum dipasang oleh developer atau masih dalam tahap pengembangan.
              </p>
            </div>
          </div>
          <div class="pt-2 border-t border-border/50">
            <div class="flex items-start gap-2 text-xs">
              <span class="font-semibold text-foreground shrink-0">Catatan:</span> 
              <span class="text-muted-foreground">
                Jika Anda yakin halaman ini seharusnya tersedia, silakan hubungi tim developer 
                untuk melakukan konfigurasi route yang diperlukan.
              </span>
            </div>
          </div>
        </div>

        <div class="bg-secondary/50 backdrop-blur-sm p-3 rounded-lg border border-border/50">
          <div class="flex items-center gap-2 mb-1">
            <Code class="h-3.5 w-3.5 text-muted-foreground" />
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Path yang diminta:</p>
          </div>
          <code class="text-xs font-mono text-foreground bg-background/50 px-2 py-1.5 rounded border border-border/50 block break-all">
            {{ currentPath }}
          </code>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 pt-1">
          <Button @click="goBack" variant="outline" class="flex-1 gap-2 group">
            <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Kembali
          </Button>
          <Button @click="goHome" class="flex-1 gap-2 group">
            <Home class="h-4 w-4" />
            Ke Halaman Utama
          </Button>
        </div>

        <div class="text-center">
          <p class="text-xs text-muted-foreground">
            Butuh bantuan? 
            <button @click="contactDeveloper" class="text-primary hover:underline font-medium ml-1">
              Hubungi Tim Developer
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
