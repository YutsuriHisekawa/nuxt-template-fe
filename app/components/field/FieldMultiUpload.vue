<script setup>
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'

const props = defineProps({
  id: { type: String, default: '' },
  label: { type: String, default: '' },
  value: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  errorname: { type: String, default: '' },
  hints: { type: String, default: '' },
  accept: { type: String, default: 'image/*' },
  maxImages: { type: Number, default: 10 },
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
const currentPreviewIndex = ref(0)

const images = computed(() => props.value || [])
const hasImages = computed(() => images.value.length > 0)
const canAddMore = computed(() => images.value.length < props.maxImages)

const getImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = baseUrl.replace(/\/api\/?$/, '')
  return path.startsWith('uploads/') ? `${base}/${path}` : `${base}/uploads/${path}`
}

const isImageFile = (item) => {
  if (!item) return false
  const p = item.gambar || item.lampiran || ''
  const ft = item.file_type || ''
  return ft.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|avif|svg)$/i.test(p)
}

const isPdfFile = (item) => {
  if (!item) return false
  const p = item.gambar || item.lampiran || ''
  const ft = item.file_type || ''
  return ft === 'application/pdf' || p.toLowerCase().endsWith('.pdf')
}

const getFileName = (item) => {
  if (!item) return 'file'
  if (item.file_name) return item.file_name
  return (item.gambar || item.lampiran || '').split('/').pop() || 'file'
}

const currentPreviewUrl = computed(() => {
  if (!hasImages.value) return ''
  return getImageUrl(images.value[currentPreviewIndex.value]?.gambar || '')
})

const handleFileSelect = () => {
  if (!canAddMore.value) { toast.warning(`Maksimal ${props.maxImages} gambar`); return }
  fileInput.value?.click()
}

const compressImage = (file, maxSizeMB = 5, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        const maxDim = 1920
        if (w > h && w > maxDim) { h = (h * maxDim) / w; w = maxDim }
        else if (h > maxDim) { w = (w * maxDim) / h; h = maxDim }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Compression failed')); return }
          if (blob.size / (1024 * 1024) > maxSizeMB && quality > 0.3) {
            compressImage(file, maxSizeMB, quality - 0.1).then(resolve).catch(reject); return
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
  const target = event.target
  const files = target.files
  if (!files || files.length === 0) return
  if (images.value.length + files.length > props.maxImages) {
    toast.warning(`Maksimal ${props.maxImages} gambar. Bisa tambah ${props.maxImages - images.value.length} lagi`); return
  }
  uploading.value = true
  const uploaded = []
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      if (file.size / (1024 * 1024) > props.maxSizeMB) { toast.error(`File ${file.name} terlalu besar (max ${props.maxSizeMB}MB)`); continue }
      let fileToUpload = file
      const isImage = file.type.startsWith('image/')
      if (isImage) {
        toast.info(`Mengkompress gambar ${i + 1}/${files.length}...`)
        fileToUpload = await compressImage(file, props.maxSizeMB, 0.8)
      } else { toast.info(`Mengupload file ${i + 1}/${files.length}...`) }
      const formData = new FormData()
      formData.append('file', fileToUpload)
      const res = await fetch(`${baseUrl}/api/dynamic/m_file`, { method: 'POST', credentials: 'include', headers: getAuthHeaders(), body: formData })
      if (!res.ok) throw new Error(`Upload gagal: ${res.status}`)
      const result = await res.json()
      const path = result.data?.file || result.data?.file_path || result.file || result.file_path || result.data?.filename
      if (result.status === 'success' && path) {
        uploaded.push({ gambar: path, lampiran: path, file_type: file.type, file_name: file.name })
      } else { throw new Error(result.message || 'Upload gagal') }
    }
    const updated = [...images.value, ...uploaded]
    emit('input', updated); emit('update:value', updated)
    toast.success(`${uploaded.length} file berhasil diupload`)
  } catch (e) { toast.error(e.message || 'Upload gagal') }
  finally { uploading.value = false; if (target) target.value = '' }
}

const handleRemove = (index) => {
  const updated = images.value.filter((_, i) => i !== index)
  emit('input', updated); emit('update:value', updated); toast.info('File dihapus')
}
const handlePreview = (index) => { currentPreviewIndex.value = index; showPreview.value = true }
const nextImage = () => { currentPreviewIndex.value = currentPreviewIndex.value < images.value.length - 1 ? currentPreviewIndex.value + 1 : 0 }
const prevImage = () => { currentPreviewIndex.value = currentPreviewIndex.value > 0 ? currentPreviewIndex.value - 1 : images.value.length - 1 }
const handleKeyPress = (e) => {
  if (!showPreview.value) return
  if (e.key === 'ArrowRight') nextImage()
  else if (e.key === 'ArrowLeft') prevImage()
  else if (e.key === 'Escape') showPreview.value = false
}
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" class="text-sm font-medium leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <div class="flex gap-2">
      <input ref="fileInput" type="file" :accept="accept" multiple class="hidden" :disabled="disabled || readonly || uploading || !canAddMore" @change="handleFileChange" />
      <Button type="button" variant="outline" :disabled="disabled || readonly || uploading || !canAddMore" @click="handleFileSelect" class="flex-1">
        <svg v-if="!uploading" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        {{ uploading ? 'Mengupload...' : `Upload File (${images.length}/${maxImages})` }}
      </Button>
    </div>

    <!-- Thumbnail grid -->
    <div v-if="hasImages" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
      <div v-for="(img, index) in images" :key="index" class="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
        <img v-if="isImageFile(img)" :src="getImageUrl(img.gambar || img.lampiran)" :alt="`Image ${index + 1}`" class="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" @click="handlePreview(index)" />
        <div v-else class="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted-foreground/10 transition-colors p-2" @click="handlePreview(index)">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-muted-foreground mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          <p class="text-xs text-center text-muted-foreground line-clamp-2 break-all px-1">{{ getFileName(img) }}</p>
        </div>
        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button type="button" class="h-8 w-8 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center" @click.stop="handlePreview(index)" title="Preview">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button v-if="!readonly" type="button" class="h-8 w-8 rounded-md bg-destructive text-destructive-foreground flex items-center justify-center" :disabled="disabled || uploading" @click.stop="handleRemove(index)" title="Hapus">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">{{ index + 1 }}</div>
      </div>
    </div>

    <p v-if="hints" :class="['text-xs', errorname === 'failed' ? 'text-destructive' : 'text-muted-foreground']">{{ hints }}</p>

    <!-- Preview Carousel -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPreview" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4" @click="showPreview = false" @keydown="handleKeyPress" tabindex="0">
          <div class="relative w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center gap-4">
            <!-- Close -->
            <button class="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-md z-10" @click="showPreview = false">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <!-- Prev -->
            <button v-if="images.length > 1" class="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 p-2 rounded-md z-10" @click.stop="prevImage">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <!-- Next -->
            <button v-if="images.length > 1" class="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 p-2 rounded-md z-10" @click.stop="nextImage">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <!-- Content -->
            <div class="flex flex-col items-center justify-center gap-3 w-full h-full px-4 pb-4">
              <div v-if="isImageFile(images[currentPreviewIndex])" class="flex items-center justify-center rounded-lg bg-white dark:bg-gray-900 p-4 max-w-full" style="max-height: calc(95vh - 200px);">
                <img :src="currentPreviewUrl" :alt="`Image ${currentPreviewIndex + 1}`" class="max-w-[85vw] w-auto h-auto object-contain" style="max-height: calc(95vh - 220px);" @click.stop />
              </div>
              <div v-else-if="isPdfFile(images[currentPreviewIndex])" class="flex flex-col items-center justify-center gap-2 w-full" style="max-height: calc(95vh - 200px);">
                <embed :src="currentPreviewUrl + '#toolbar=0'" type="application/pdf" class="w-[85vw] rounded-lg" style="height: calc(95vh - 280px);" @click.stop />
                <div class="flex gap-2">
                  <a :href="currentPreviewUrl" target="_blank" class="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90" @click.stop>Buka di Tab Baru</a>
                  <a :href="currentPreviewUrl" :download="getFileName(images[currentPreviewIndex])" class="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-md hover:bg-secondary/90" @click.stop>Download</a>
                </div>
              </div>
              <div v-else class="flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-900 p-8 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                <p class="text-lg font-medium">{{ getFileName(images[currentPreviewIndex]) }}</p>
                <a :href="currentPreviewUrl" target="_blank" download class="text-white hover:underline flex items-center gap-2" @click.stop>Download File</a>
              </div>
              <!-- Counter -->
              <div class="text-white text-sm bg-black/60 px-4 py-2 rounded-full">{{ currentPreviewIndex + 1 }} / {{ images.length }}</div>
              <!-- Thumbnails -->
              <div v-if="images.length > 1" class="flex gap-2 overflow-x-auto max-w-full px-4">
                <button v-for="(img, index) in images" :key="index" type="button" class="shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all flex items-center justify-center bg-muted" :class="index === currentPreviewIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'" @click.stop="currentPreviewIndex = index">
                  <img v-if="isImageFile(img)" :src="getImageUrl(img.gambar || img.lampiran)" :alt="`Thumb ${index + 1}`" class="w-full h-full object-cover" />
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                </button>
              </div>
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
