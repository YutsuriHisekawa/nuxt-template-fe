<script setup>
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'

const props = defineProps({
  id: { type: String, default: '' },
  label: { type: String, default: '' },
  value: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  errorname: { type: String, default: '' },
  hints: { type: String, default: '' },
  accept: { type: String, default: 'image/*' },
  maxSizeMB: { type: Number, default: 5 },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['input', 'update:value'])

const config = useRuntimeConfig()
const baseUrl = config.public.baseUrl

function getAuthHeaders() {
  const authStore = useAuthStore()
  return authStore.token ? { 'Authorization': `Bearer ${authStore.token}` } : {}
}

const fileInput = ref(null)
const uploading = ref(false)
const showPreview = ref(false)

const imageUrl = computed(() => {
  if (!props.value) return ''
  if (props.value.startsWith('http')) return props.value
  const base = baseUrl.replace(/\/api\/?$/, '')
  if (props.value.startsWith('uploads/')) return `${base}/${props.value}`
  return `${base}/uploads/${props.value}`
})

const hasImage = computed(() => !!props.value)
const isImageFile = computed(() => {
  if (!props.value) return false
  return /\.(jpg|jpeg|png|gif|webp|bmp|avif|svg)$/i.test(props.value)
})

const handleFileSelect = () => { fileInput.value?.click() }

const compressImage = (file, maxSizeMB = 5, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 1920
        if (width > height && width > maxDim) { height = (height * maxDim) / width; width = maxDim }
        else if (height > maxDim) { width = (width * maxDim) / height; height = maxDim }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Compression failed')); return }
          if (blob.size / (1024 * 1024) > maxSizeMB && quality > 0.3) {
            compressImage(file, maxSizeMB, quality - 0.1).then(resolve).catch(reject)
            return
          }
          resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }))
        }, file.type, quality)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const maxBytes = props.maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) { toast.error(`File terlalu besar (max ${props.maxSizeMB}MB)`); if (event.target) event.target.value = ''; return }
  uploading.value = true
  try {
    let fileToUpload = file
    if (file.type.startsWith('image/')) {
      toast.info('Mengkompress gambar...')
      fileToUpload = await compressImage(file, props.maxSizeMB, 0.8)
    } else {
      toast.info('Mengupload file...')
    }
    const formData = new FormData()
    formData.append('file', fileToUpload)
    const res = await fetch(`${baseUrl}/api/dynamic/m_file`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(), body: formData })
    if (!res.ok) throw new Error(`Upload gagal: ${res.status}`)
    const result = await res.json()
    const path = result.data?.file || result.data?.file_path || result.file || result.file_path || result.data?.filename
    if (result.status === 'success' && path) {
      emit('input', path)
      emit('update:value', path)
      toast.success('File berhasil diupload')
    } else {
      throw new Error(result.message || 'Upload gagal')
    }
  } catch (e) {
    toast.error(e.message || 'Upload gagal')
  } finally {
    uploading.value = false
    if (event.target) event.target.value = ''
  }
}

const handleClear = () => { emit('input', ''); emit('update:value', ''); toast.info('File dihapus') }
const handlePreview = () => { if (hasImage.value) showPreview.value = true }
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" class="text-sm font-medium leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <input ref="fileInput" type="file" :accept="accept" class="hidden" :disabled="disabled || readonly || uploading" @change="handleFileChange" />

    <!-- Image uploaded: show image as the field, click to replace -->
    <div v-if="hasImage && isImageFile" class="relative group w-full rounded-lg overflow-hidden border border-border bg-muted">
      <img :src="imageUrl" :alt="label" class="w-full h-auto max-h-56 object-contain cursor-pointer" @click="handleFileSelect" />
      <!-- Hover overlay -->
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
        <span class="text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-md">Klik untuk ganti gambar</span>
      </div>
      <!-- Action buttons -->
      <div class="absolute top-2 right-2 flex gap-1.5">
        <button type="button" class="h-7 w-7 rounded-md bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-background transition-colors" @click.stop="handlePreview" title="Preview">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button v-if="!readonly" type="button" class="h-7 w-7 rounded-md bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors" :disabled="disabled || uploading" @click.stop="handleClear" title="Hapus">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <!-- Loading overlay -->
      <div v-if="uploading" class="absolute inset-0 bg-black/50 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
    </div>

    <!-- Non-image file or no file: show upload button -->
    <template v-else>
      <div class="flex gap-2">
        <Button type="button" variant="outline" :disabled="disabled || readonly || uploading" @click="handleFileSelect" class="flex-1">
          <svg v-if="!uploading" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          {{ uploading ? 'Mengupload...' : hasImage ? 'Ganti File' : 'Upload File' }}
        </Button>
        <Button v-if="hasImage" type="button" variant="outline" size="icon" @click="handlePreview" title="Preview">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
        </Button>
        <Button v-if="hasImage && !readonly" type="button" variant="outline" size="icon" :disabled="disabled || uploading" @click="handleClear" title="Hapus">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </Button>
      </div>
      <p v-if="hasImage" class="text-xs text-muted-foreground truncate">File: {{ value }}</p>
    </template>
    <p v-if="hints" :class="['text-xs', errorname === 'failed' ? 'text-destructive' : 'text-muted-foreground']">{{ hints }}</p>

    <!-- Preview Popup -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPreview" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" @click="showPreview = false">
          <div class="relative w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center gap-4">
            <button class="absolute top-0 right-0 text-white hover:bg-white/20 p-2 rounded-md z-10" @click="showPreview = false">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="flex items-center justify-center rounded-lg bg-white dark:bg-gray-900 p-4 max-w-full max-h-full overflow-hidden">
              <img :src="imageUrl" :alt="label" class="max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain" @click.stop />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
