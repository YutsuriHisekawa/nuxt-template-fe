<script setup>
import { Plus, Copy, Trash2, ChevronUp, ChevronDown, GripVertical, FileDown, FileText, Loader2, HelpCircle, X, RotateCcw } from 'lucide-vue-next'
import { Printer } from 'lucide-vue-next'
import { BLOCK_HELP } from './blok_help.js'
import PrintBlockEditor from './PrintBlockEditor.vue'
import PrintBlockPreview from './PrintBlockPreview.vue'
import {
  PRINT_BLOCK_TYPES,
  PRINT_PAPER_OPTIONS,
  PRINT_LAYOUT_TEMPLATES,
  printUid,
  normalizePrintBlock,
  normalizePrintConfig,
  createDefaultPrintBlocks,
  createDefaultPrintConfig,
  getPaperPreviewStyle,
  getPaperDimensions,
  parsePrintFieldTable,
  parseSignatureTitles,
} from './_usePrint'

const props = defineProps({
  printConfig: { type: Object, required: true },
  fields: { type: Array, required: true },
  details: { type: Array, required: true },
  printableFields: { type: Array, required: true },
  printableDetails: { type: Array, required: true },
  configTitle: { type: String, default: 'Dokumen' },
  printTokenExamples: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:printConfig', 'pushUndo'])

const showPrintHelp = ref(false)
const showTemplates = ref(false)
const helpBlockType = ref(null)
const insertAtIndex = ref(null)

function applyTemplate(tpl) {
  emit('pushUndo')
  const newBlocks = tpl.blocks.map((b) => normalizePrintBlock(b, props.fields, props.details, props.configTitle))
  const next = cloneState()
  next.blocks = newBlocks
  next.paperSize = tpl.paperSize || next.paperSize
  next.orientation = tpl.orientation || next.orientation
  next.marginMm = tpl.marginMm || next.marginMm
  emitUpdate(next)
  showTemplates.value = false
}

const printPreviewStyle = computed(() => getPaperPreviewStyle(props.printConfig))

// Multi-page: measure each content block individually to avoid splitting rows across pages
const blockMeasureRefs = ref([])  // per-block measurement elements
const blockHeights = ref([])      // px height of each content block (parallel to contentBlocks)
let resizeObserver = null

const paperDims = computed(() => getPaperDimensions(props.printConfig))
const pageHeightMm = computed(() => paperDims.value.height)
const marginMm = computed(() => Number(props.printConfig?.marginMm || 15))

// Extract header/footer blocks from regular content
const headerBlocks = computed(() => (props.printConfig?.blocks || []).filter(b => b.type === 'header'))
const footerBlocks = computed(() => (props.printConfig?.blocks || []).filter(b => b.type === 'footer'))
const contentBlocks = computed(() => (props.printConfig?.blocks || []).filter(b => b.type !== 'header' && b.type !== 'footer'))

// Measure header/footer height for inner content area calculation
const headerRef = ref(null)
const footerRef = ref(null)
const headerHeight = ref(0)
const footerHeight = ref(0)

const innerHeightMm = computed(() => pageHeightMm.value - marginMm.value * 2)

// Assign blocks to pages without ever splitting a block across page boundaries
const pageAssignments = computed(() => {
  const mmToPx = 3.7795
  const availableHeightPx = (innerHeightMm.value * mmToPx) - headerHeight.value - footerHeight.value
  if (availableHeightPx <= 0) return [contentBlocks.value.map((_, i) => i)]
  const pages = [[]]
  let currentPageHeight = 0
  contentBlocks.value.forEach((block, idx) => {
    if (block.type === 'watermark') return
    const blockH = blockHeights.value[idx] || 0
    if (currentPageHeight + blockH > availableHeightPx && pages[pages.length - 1].length > 0) {
      pages.push([])
      currentPageHeight = 0
    }
    pages[pages.length - 1].push(idx)
    currentPageHeight += blockH
  })
  return pages
})

const pageCount = computed(() => Math.max(1, pageAssignments.value.length))

function setBlockMeasureRef(el, idx) {
  if (el) blockMeasureRefs.value[idx] = el
}

function observeContent() {
  if (resizeObserver) resizeObserver.disconnect()
  const elToIdx = new Map()
  resizeObserver = new ResizeObserver((entries) => {
    const heightsCopy = blockHeights.value.slice()
    for (const entry of entries) {
      const target = entry.target
      const hdrEl = Array.isArray(headerRef.value) ? headerRef.value[0] : headerRef.value
      const ftrEl = Array.isArray(footerRef.value) ? footerRef.value[0] : footerRef.value
      if (target === hdrEl) {
        headerHeight.value = entry.contentRect.height
      } else if (target === ftrEl) {
        footerHeight.value = entry.contentRect.height
      } else {
        const idx = elToIdx.get(target)
        if (idx !== undefined) {
          while (heightsCopy.length <= idx) heightsCopy.push(0)
          heightsCopy[idx] = entry.contentRect.height
        }
      }
    }
    blockHeights.value = [...heightsCopy]
  })
  const headerEl = Array.isArray(headerRef.value) ? headerRef.value[0] : headerRef.value
  const footerEl = Array.isArray(footerRef.value) ? footerRef.value[0] : footerRef.value
  if (headerEl) resizeObserver.observe(headerEl)
  if (footerEl) resizeObserver.observe(footerEl)
  const els = blockMeasureRefs.value || []
  const initialHeights = new Array(els.length).fill(0)
  els.forEach((el, idx) => {
    if (!el) return
    elToIdx.set(el, idx)
    resizeObserver.observe(el)
    initialHeights[idx] = el.getBoundingClientRect().height
  })
  blockHeights.value = initialHeights
}

watch(blockMeasureRefs, () => nextTick(observeContent), { deep: false })
watch(headerRef, () => nextTick(observeContent))
watch(footerRef, () => nextTick(observeContent))
watch(() => contentBlocks.value.length, () => nextTick(observeContent))
onMounted(() => nextTick(observeContent))
onUnmounted(() => { if (resizeObserver) resizeObserver.disconnect() })

function clonePlain(value, fallback = null) {
  if (value === undefined) return fallback
  return JSON.parse(JSON.stringify(value))
}

function cloneState() {
  return normalizePrintConfig(
    clonePlain(props.printConfig, createDefaultPrintConfig(props.fields, props.details, props.configTitle)),
    props.fields,
    props.details,
    props.configTitle,
  )
}

function emitUpdate(next) {
  emit('update:printConfig', next)
}

function setPrintEnabled(enabled) {
  const next = normalizePrintConfig(props.printConfig, props.fields, props.details, props.configTitle)
  next.enabled = !!enabled
  if (next.enabled && (!Array.isArray(next.blocks) || next.blocks.length === 0)) {
    next.blocks = createDefaultPrintBlocks(props.fields, props.details, props.configTitle)
  }
  emitUpdate(next)
}

function addPrintBlock(type) {
  emit('pushUndo')
  const next = cloneState()
  next.blocks = [...(next.blocks || []), normalizePrintBlock({ type }, props.fields, props.details, props.configTitle)]
  emitUpdate(next)
}

function addPrintBlockAt(type, atIndex) {
  emit('pushUndo')
  const next = cloneState()
  const newBlock = normalizePrintBlock({ type }, props.fields, props.details, props.configTitle)
  next.blocks.splice(atIndex, 0, newBlock)
  emitUpdate(next)
  insertAtIndex.value = null
}

const confirmResetPrint = ref(false)
function resetPrintBlocks() {
  if (!confirmResetPrint.value) {
    confirmResetPrint.value = true
    setTimeout(() => { confirmResetPrint.value = false }, 3000)
    return
  }
  emit('pushUndo')
  const next = cloneState()
  next.blocks = []
  emitUpdate(next)
  confirmResetPrint.value = false
}

function updatePrintBlock(idx, key, value) {
  const next = cloneState()
  next.blocks[idx][key] = value
  emitUpdate(next)
}

function duplicatePrintBlock(idx) {
  emit('pushUndo')
  const next = cloneState()
  const copied = JSON.parse(JSON.stringify(next.blocks[idx]))
  copied.id = printUid()
  next.blocks.splice(idx + 1, 0, copied)
  emitUpdate(next)
}

function removePrintBlock(idx) {
  emit('pushUndo')
  const next = cloneState()
  next.blocks.splice(idx, 1)
  emitUpdate(next)
}

function movePrintBlock(idx, dir) {
  const next = cloneState()
  const target = idx + dir
  if (target < 0 || target >= next.blocks.length) return
  ;[next.blocks[idx], next.blocks[target]] = [next.blocks[target], next.blocks[idx]]
  emitUpdate(next)
}

function updateGlobal(key, value) {
  const next = cloneState()
  next[key] = value
  emitUpdate(next)
}

// ── Drag & Drop ────────────────────────────────────────────────────────
const dragIndex = ref(null)
const dropTargetIndex = ref(null)

function onDragStart(e, idx) {
  dragIndex.value = idx
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(idx))
}

function onDragOver(e, idx) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dropTargetIndex.value = idx
}

function onDragLeave() {
  dropTargetIndex.value = null
}

function onDrop(e, idx) {
  e.preventDefault()
  const from = dragIndex.value
  if (from === null || from === idx) { dragIndex.value = null; dropTargetIndex.value = null; return }
  emit('pushUndo')
  const next = cloneState()
  const [moved] = next.blocks.splice(from, 1)
  next.blocks.splice(idx, 0, moved)
  emitUpdate(next)
  dragIndex.value = null
  dropTargetIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
  dropTargetIndex.value = null
}

// ── Click-to-select from preview ───────────────────────────────────────
const selectedBlockId = ref(null)

// ── Download DOCX / PDF preview ─────────────────────────────────────────────
const previewRoot = ref(null)
const downloadingDocx = ref(false)
const downloadingPdf = ref(false)

async function downloadDocxPreview() {
  const el = previewRoot.value
  if (!el || downloadingDocx.value) return
  downloadingDocx.value = true
  try {
    const content = el.innerHTML || ''
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${props.configTitle}</title><style>body{font-family:Arial,sans-serif;color:#111827}h1,h2,h3{margin:0 0 12px}p{margin:0 0 12px;line-height:1.6}table{width:100%;border-collapse:collapse}td,th{border:1px solid #d1d5db;padding:8px;vertical-align:top}</style></head><body>${content}</body></html>`
    const response = await fetch('/api/print/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, filename: `preview-${props.configTitle || 'layout'}.docx` }),
    })
    if (!response.ok) throw new Error(await response.text())
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `preview-${props.configTitle || 'layout'}.docx`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error(err)
    alert('Download DOCX gagal: ' + (err?.message || 'Error'))
  } finally {
    downloadingDocx.value = false
  }
}

async function downloadPdfPreview() {
  const el = previewRoot.value
  if (!el || downloadingPdf.value) return
  downloadingPdf.value = true
  try {
    const module = await import('html2pdf.js')
    const html2pdf = module.default || module
    const filename = `preview-${props.configTitle || 'layout'}.pdf`
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: 'mm',
          format: String(props.printConfig?.paperSize || 'A4').toLowerCase(),
          orientation: props.printConfig?.orientation === 'landscape' ? 'landscape' : 'portrait',
        },
      })
      .from(el)
      .save()
  } catch (err) {
    console.error(err)
    alert('Download PDF gagal: ' + (err?.message || 'Error'))
  } finally {
    downloadingPdf.value = false
  }
}

function selectBlockFromPreview(blockId) {
  selectedBlockId.value = blockId
  // scroll editor block into view
  nextTick(() => {
    const el = document.getElementById(`print-block-editor-${blockId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

// ── Preview helpers ────────────────────────────────────────────────────────
function getPrintableFieldLabel(fieldName) {
  return props.fields.find((field) => field.field === fieldName)?.label || fieldName
}

function getPreviewFieldValue(fieldName) {
  const field = props.fields.find((item) => item.field === fieldName)
  if (!field) return '-'
  if (field.type === 'switch') return field.labelTrue || 'Aktif'
  if (field.type === 'currency') return '1.250.000'
  if (field.type === 'date') return '07 Maret 2026'
  if (field.type === 'datetime') return '07 Maret 2026 10:30'
  if (field.type === 'popup' || field.type === 'select') return `${field.label || field.field} Sample`
  if (field.type === 'textarea') return `Contoh ${field.label || field.field}`
  return `${field.label || field.field} sample`
}

function renderPrintTokens(text) {
  const value = String(text || '')
  return value
    .replace(/\{\{\s*page_title\s*\}\}/gi, props.configTitle || 'Dokumen')
    .replace(/\{\{\s*current_date\s*\}\}/gi, new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }))
    .replace(/\{\{\s*current_datetime\s*\}\}/gi, new Date().toLocaleString('id-ID'))
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, fieldName) => getPreviewFieldValue(fieldName))
}

function renderPrintHtmlPreview(html) {
  return renderPrintTokens(html).replace(/\n/g, '<br>')
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <Printer class="h-5 w-5 text-primary shrink-0" />
          <div>
            <CardTitle class="text-base">Konfigurasi Print</CardTitle>
            <CardDescription>Printout opsional. Aktifkan hanya jika modul ini memang punya layout cetak.</CardDescription>
          </div>
        </div>
        <label class="inline-flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            :checked="printConfig.enabled"
            class="h-4 w-4 rounded border-border accent-primary"
            @change="setPrintEnabled($event.target.checked)"
          />
          Aktifkan Printout
        </label>
      </div>
    </CardHeader>
    <CardContent class="space-y-5">
      <div v-if="!printConfig.enabled" class="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        <Printer class="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p class="text-sm font-medium mb-1">Printout belum diaktifkan</p>
        <p class="text-xs">Aktifkan jika modul ini perlu layout cetak, export PDF, atau export DOCX.</p>
      </div>

      <template v-else>
        <!-- Global settings -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 rounded-lg border border-border p-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-muted-foreground">Ukuran Kertas</label>
            <select :value="printConfig.paperSize" @change="updateGlobal('paperSize', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option v-for="size in PRINT_PAPER_OPTIONS" :key="size" :value="size">{{ size }}</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-muted-foreground">Orientasi</label>
            <select :value="printConfig.orientation" @change="updateGlobal('orientation', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-muted-foreground">Margin (mm)</label>
            <input type="number" min="5" max="40" :value="printConfig.marginMm" @input="updateGlobal('marginMm', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <label class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <input type="checkbox" :checked="printConfig.exportPdf" @change="updateGlobal('exportPdf', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
            Support PDF
          </label>
          <label class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <input type="checkbox" :checked="printConfig.exportDocx" @change="updateGlobal('exportDocx', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
            Support DOCX
          </label>
        </div>

        <!-- Block builder -->
        <div class="rounded-lg border border-border p-4 space-y-3">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p class="text-sm font-semibold">Builder Layout</p>
              <p class="text-xs text-muted-foreground">Susun block seperti Google Docs / Word: heading, teks, field, tabel, signature, watermark, page break, dll.</p>
            </div>
            <div class="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" class="gap-2" @click="showTemplates = !showTemplates">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                {{ showTemplates ? 'Tutup Template' : 'Template Layout' }}
              </Button>
              <Button type="button" variant="outline" size="sm" class="gap-2" @click="showPrintHelp = !showPrintHelp">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                {{ showPrintHelp ? 'Sembunyikan Help' : 'Help Print Builder' }}
              </Button>
              <Button type="button" :variant="confirmResetPrint ? 'destructive' : 'outline'" size="sm" class="gap-2" :title="confirmResetPrint ? 'Klik sekali lagi untuk konfirmasi reset' : 'Reset semua blok print (Undo tersedia)'" @click="resetPrintBlocks">
                <RotateCcw class="h-4 w-4" />
                {{ confirmResetPrint ? 'Yakin Reset?' : 'Reset Blok' }}
              </Button>
            </div>
          </div>

          <!-- Template picker -->
          <div v-if="showTemplates" class="rounded-lg border border-violet-200 bg-violet-50/60 dark:bg-violet-950/20 dark:border-violet-800 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-violet-900 dark:text-violet-200">Pilih Template Layout Siap Pakai</p>
              <p class="text-xs text-muted-foreground">Klik template untuk mengganti layout saat ini</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
              <button
                v-for="tpl in PRINT_LAYOUT_TEMPLATES"
                :key="tpl.id"
                type="button"
                class="flex flex-col gap-1 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-card hover:border-violet-400 hover:shadow-md text-left px-3 py-3 transition-all duration-150 group"
                @click="applyTemplate(tpl)"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl leading-none">{{ tpl.icon }}</span>
                  <span class="text-xs font-semibold text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300 leading-tight">{{ tpl.name }}</span>
                </div>
                <p class="text-[11px] text-muted-foreground leading-snug">{{ tpl.desc }}</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span class="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-medium">{{ tpl.paperSize }}</span>
                  <span class="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-medium">{{ tpl.orientation === 'landscape' ? 'Landscape' : 'Portrait' }}</span>
                  <span class="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-medium">{{ tpl.blocks.length }} blok</span>
                </div>
              </button>
            </div>
            <p class="text-[11px] text-amber-600 dark:text-amber-400">⚠ Menerapkan template akan mengganti semua blok yang ada. Pastikan sudah backup (Undo tersedia).</p>
          </div>

          <!-- Help section -->
          <div v-if="showPrintHelp" class="rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-4 text-sm text-slate-700 space-y-4">
            <div>
              <p class="font-semibold text-slate-900 mb-1">Block yang tersedia</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px]">
                <div><strong>Company Header</strong>: kop surat — logo, nama perusahaan, alamat.</div>
                <div><strong>Heading</strong>: judul besar dengan styling font.</div>
                <div><strong>Paragraph</strong>: teks bebas dengan font control.</div>
                <div><strong>Field / Field Table</strong>: tampilkan data field dari record.</div>
                <div><strong>Detail Table</strong>: cetak tabel detail.</div>
                <div><strong>Image / Logo</strong>: gambar dengan ukuran custom.</div>
                <div><strong>Multi Column</strong>: layout multi-kolom (2-4).</div>
                <div><strong>List</strong>: bullet atau numbered list.</div>
                <div><strong>Table</strong>: tabel free-form dengan border opsional.</div>
                <div><strong>Divider / Spacer</strong>: garis pemisah atau jarak kosong.</div>
                <div><strong>Page Break</strong>: paksa pindah halaman baru.</div>
                <div><strong>Page Number</strong>: tampilkan nomor halaman.</div>
                <div><strong>Watermark</strong>: teks diagonal semi-transparan (DRAFT, RAHASIA, COPY).</div>
                <div><strong>Signature</strong>: area tanda tangan multi-kolom.</div>
                <div><strong>HTML / Custom</strong>: isi HTML bebas.</div>
                <div><strong>Header (Kop Halaman)</strong>: teks berulang di atas setiap halaman.</div>
                <div><strong>Footer (Kaki Halaman)</strong>: teks berulang di bawah setiap halaman, bisa pakai <code>{page}</code>.</div>
              </div>
            </div>

            <div>
              <p class="font-semibold text-slate-900 mb-1">Token</p>
              <div class="flex flex-wrap gap-2 mb-2 text-[12px]">
                <code class="rounded bg-white px-2 py-1 border border-sky-200">&#123;&#123;page_title&#125;&#125;</code>
                <code class="rounded bg-white px-2 py-1 border border-sky-200">&#123;&#123;current_date&#125;&#125;</code>
                <code class="rounded bg-white px-2 py-1 border border-sky-200">&#123;&#123;current_datetime&#125;&#125;</code>
                <code class="rounded bg-white px-2 py-1 border border-sky-200">&#123;&#123;nama_field&#125;&#125;</code>
              </div>
            </div>

            <div>
              <p class="font-semibold text-slate-900 mb-1">Styling per block</p>
              <p class="text-[13px]">Klik <strong>Styling Lanjutan</strong> di bawah tiap block untuk mengatur margin, border, background, dan padding per block — seperti Google Docs formatting.</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button v-for="blockType in PRINT_BLOCK_TYPES" :key="blockType.value" type="button" variant="outline" size="sm" @click="addPrintBlock(blockType.value)">
              <Plus class="h-3.5 w-3.5 mr-1" /> {{ blockType.label }}
            </Button>
          </div>
        </div>

        <!-- Editor + Preview -->
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] gap-5 items-start" style="height: calc(100vh - 120px);">
          <!-- Block list (editors) -->
          <div class="overflow-y-auto pr-1" style="max-height: calc(100vh - 140px);">
            <!-- Insert zone before first block -->
            <div class="group flex flex-col items-stretch mb-2">
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="flex-1 h-px bg-border"></div>
                <button type="button" @click.stop="insertAtIndex = insertAtIndex === 0 ? null : 0" class="shrink-0 h-5 px-2 rounded-full bg-card border border-border text-muted-foreground text-[10px] hover:border-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"><span class="text-sm leading-none">+</span> tambah</button>
                <div class="flex-1 h-px bg-border"></div>
              </div>
              <div v-if="insertAtIndex === 0" class="mt-1.5 bg-muted/40 rounded-lg p-2.5 border border-border">
                <p class="text-[10px] text-muted-foreground mb-1.5">Tambah block di posisi ini:</p>
                <div class="flex flex-wrap gap-1">
                  <button v-for="bt in PRINT_BLOCK_TYPES" :key="bt.value" type="button" @click="addPrintBlockAt(bt.value, 0)" class="text-[11px] px-2 py-0.5 rounded border border-border bg-card text-foreground hover:border-muted-foreground hover:bg-accent transition-colors">{{ bt.label }}</button>
                </div>
              </div>
            </div>

            <template v-for="(block, blockIndex) in printConfig.blocks" :key="block.id">
            <div
              :id="`print-block-editor-${block.id}`"
              draggable="true"
              class="rounded-lg border bg-card p-4 space-y-3 transition-all duration-150"
              :class="[
                selectedBlockId === block.id ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                dragIndex === blockIndex ? 'opacity-40' : '',
                dropTargetIndex === blockIndex && dragIndex !== blockIndex ? 'border-primary border-dashed border-2 scale-[1.01]' : '',
              ]"
              @dragstart="onDragStart($event, blockIndex)"
              @dragover="onDragOver($event, blockIndex)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, blockIndex)"
              @dragend="onDragEnd"
              @click="selectedBlockId = block.id"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <GripVertical class="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                  <div>
                    <p class="text-sm font-semibold capitalize">{{ block.type.replace(/_/g, ' ') }}</p>
                    <p class="text-[11px] text-muted-foreground">Block #{{ blockIndex + 1 }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" class="h-8 w-8 text-blue-400 hover:text-blue-300" :title="'Cara pakai ' + block.type" @click.stop="helpBlockType = block.type">
                    <HelpCircle class="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" class="h-8 w-8" :disabled="blockIndex === 0" @click="movePrintBlock(blockIndex, -1)">
                    <ChevronUp class="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" class="h-8 w-8" :disabled="blockIndex === printConfig.blocks.length - 1" @click="movePrintBlock(blockIndex, 1)">
                    <ChevronDown class="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" class="h-8 w-8" @click="duplicatePrintBlock(blockIndex)">
                    <Copy class="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" class="h-8 w-8 text-destructive" @click="removePrintBlock(blockIndex)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <PrintBlockEditor
                :block="block"
                :blockIndex="blockIndex"
                :printableFields="printableFields"
                :printableDetails="printableDetails"
                @update="updatePrintBlock"
              />
            </div>

            <!-- Insert zone after this block -->
            <div class="group flex flex-col items-stretch my-2">
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="flex-1 h-px bg-border"></div>
                <button type="button" @click.stop="insertAtIndex = insertAtIndex === blockIndex + 1 ? null : blockIndex + 1" class="shrink-0 h-5 px-2 rounded-full bg-card border border-border text-muted-foreground text-[10px] hover:border-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"><span class="text-sm leading-none">+</span> tambah</button>
                <div class="flex-1 h-px bg-border"></div>
              </div>
              <div v-if="insertAtIndex === blockIndex + 1" class="mt-1.5 bg-muted/40 rounded-lg p-2.5 border border-border">
                <p class="text-[10px] text-muted-foreground mb-1.5">Tambah block di posisi ini:</p>
                <div class="flex flex-wrap gap-1">
                  <button v-for="bt in PRINT_BLOCK_TYPES" :key="bt.value" type="button" @click="addPrintBlockAt(bt.value, blockIndex + 1)" class="text-[11px] px-2 py-0.5 rounded border border-border bg-card text-foreground hover:border-muted-foreground hover:bg-accent transition-colors">{{ bt.label }}</button>
                </div>
              </div>
            </div>
            </template>
          </div>

          <!-- Preview -->
          <div class="flex flex-col overflow-y-auto" style="max-height: calc(100vh - 140px);">
            <div class="flex items-center justify-between shrink-0 mb-2">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview Layout Print</p>
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-muted-foreground">{{ pageCount }} halaman</span>
                <Button type="button" variant="outline" size="sm" class="gap-1.5 h-7 text-xs" :disabled="downloadingPdf || downloadingDocx" @click="downloadPdfPreview">
                  <Loader2 v-if="downloadingPdf" class="h-3.5 w-3.5 animate-spin" />
                  <FileText v-else class="h-3.5 w-3.5" />
                  {{ downloadingPdf ? 'Proses...' : 'Download PDF' }}
                </Button>
                <Button type="button" variant="outline" size="sm" class="gap-1.5 h-7 text-xs" :disabled="downloadingDocx || downloadingPdf" @click="downloadDocxPreview">
                  <Loader2 v-if="downloadingDocx" class="h-3.5 w-3.5 animate-spin" />
                  <FileDown v-else class="h-3.5 w-3.5" />
                  {{ downloadingDocx ? 'Proses...' : 'Download DOCX' }}
                </Button>
              </div>
            </div>
            <div class="rounded-xl border border-border bg-[#0b1220] p-4 flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
              <!-- Hidden measurement containers (off-screen, same width as paper content area) -->
              <div
                style="position: fixed; left: -9999px; top: 0; visibility: hidden;"
                :style="{ width: `calc(${paperDims.width}mm - ${marginMm * 2}mm)` }"
                aria-hidden="true"
              >
                <!-- Measure each content block individually (per-block height avoids splitting) -->
                <template v-for="(block, bIdx) in contentBlocks" :key="'measure-' + block.id">
                  <div :ref="el => setBlockMeasureRef(el, bIdx)">
                    <PrintBlockPreview
                      v-if="block.type !== 'watermark'"
                      :block="block"
                      :renderTokens="renderPrintTokens"
                      :renderHtml="renderPrintHtmlPreview"
                      :getFieldLabel="getPrintableFieldLabel"
                      :getFieldValue="getPreviewFieldValue"
                    />
                  </div>
                </template>
                <!-- Measure header blocks -->
                <div ref="headerRef">
                  <template v-for="block in headerBlocks" :key="'measure-h-' + block.id">
                    <PrintBlockPreview
                      :block="block"
                      :renderTokens="renderPrintTokens"
                      :renderHtml="renderPrintHtmlPreview"
                      :getFieldLabel="getPrintableFieldLabel"
                      :getFieldValue="getPreviewFieldValue"
                    />
                  </template>
                </div>
                <!-- Measure footer blocks -->
                <div ref="footerRef">
                  <template v-for="block in footerBlocks" :key="'measure-f-' + block.id">
                    <PrintBlockPreview
                      :block="block"
                      :renderTokens="renderPrintTokens"
                      :renderHtml="renderPrintHtmlPreview"
                      :getFieldLabel="getPrintableFieldLabel"
                      :getFieldValue="getPreviewFieldValue"
                    />
                  </template>
                </div>
              </div>

              <!-- Render each page -->
              <div ref="previewRoot" class="space-y-4 flex flex-col items-center pt-2">
              <div
                v-for="page in pageCount"
                :key="'page-' + page"
                class="mx-auto rounded-lg bg-white text-black shadow-sm relative overflow-hidden"
                :style="{
                  width: `${paperDims.width}mm`,
                  height: `${paperDims.height}mm`,
                }"
              >
                <!-- Page number label -->
                <div class="absolute top-1 right-2 text-[9px] text-gray-300 z-10 select-none">{{ page }} / {{ pageCount }}</div>

                <!-- Watermark overlay per page -->
                <template v-for="block in contentBlocks" :key="'wm-' + page + '-' + block.id">
                  <div
                    v-if="block.type === 'watermark'"
                    class="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
                    style="z-index: 0;"
                  >
                    <span
                      class="select-none font-bold uppercase whitespace-nowrap"
                      :style="{
                        fontSize: `${block.fontSize || 80}px`,
                        opacity: block.opacity || 0.08,
                        color: block.color || '#000',
                        transform: `rotate(${block.rotate ?? -35}deg)`,
                      }"
                    >{{ block.text || 'DRAFT' }}</span>
                  </div>
                </template>

                <!-- Page content area with margin -->
                <div
                  class="absolute left-0 right-0 flex flex-col"
                  :style="{
                    top: `${marginMm}mm`,
                    left: `${marginMm}mm`,
                    right: `${marginMm}mm`,
                    width: `calc(${paperDims.width}mm - ${marginMm * 2}mm)`,
                    height: `calc(${paperDims.height}mm - ${marginMm * 2}mm)`,
                    overflow: 'hidden',
                  }"
                  style="z-index: 1;"
                >
                  <!-- Header rendered at the top of each page -->
                  <div v-if="headerBlocks.length" class="shrink-0">
                    <template v-for="block in headerBlocks" :key="'hdr-' + page + '-' + block.id">
                      <div
                        v-if="block.showOnFirstPage !== false || page > 1"
                        class="cursor-pointer transition-shadow rounded"
                        :class="selectedBlockId === block.id ? 'ring-2 ring-blue-400/60' : 'hover:ring-1 hover:ring-blue-300/40'"
                        @click.stop="selectBlockFromPreview(block.id)"
                      >
                        <PrintBlockPreview
                          :block="block"
                          :renderTokens="renderPrintTokens"
                          :renderHtml="renderPrintHtmlPreview"
                          :getFieldLabel="getPrintableFieldLabel"
                          :getFieldValue="getPreviewFieldValue"
                        />
                      </div>
                    </template>
                  </div>

                  <!-- Main content: only blocks assigned to this page, never split across boundary -->
                  <div class="flex-1 min-h-0 overflow-hidden">
                    <template v-for="bIdx in (pageAssignments[page - 1] || [])" :key="'preview-' + page + '-' + (contentBlocks[bIdx]?.id)">
                      <div
                        v-if="contentBlocks[bIdx]"
                        class="cursor-pointer transition-shadow rounded"
                        :class="selectedBlockId === contentBlocks[bIdx].id ? 'ring-2 ring-blue-400/60' : 'hover:ring-1 hover:ring-blue-300/40'"
                        @click.stop="selectBlockFromPreview(contentBlocks[bIdx].id)"
                      >
                        <PrintBlockPreview
                          :block="contentBlocks[bIdx]"
                          :renderTokens="renderPrintTokens"
                          :renderHtml="renderPrintHtmlPreview"
                          :getFieldLabel="getPrintableFieldLabel"
                          :getFieldValue="getPreviewFieldValue"
                        />
                      </div>
                    </template>
                  </div>

                  <!-- Footer rendered at the bottom of each page -->
                  <div v-if="footerBlocks.length" class="shrink-0">
                    <template v-for="block in footerBlocks" :key="'ftr-' + page + '-' + block.id">
                      <div
                        v-if="block.showOnFirstPage !== false || page > 1"
                        class="cursor-pointer transition-shadow rounded"
                        :class="selectedBlockId === block.id ? 'ring-2 ring-blue-400/60' : 'hover:ring-1 hover:ring-blue-300/40'"
                        @click.stop="selectBlockFromPreview(block.id)"
                      >
                        <PrintBlockPreview
                          :block="{ ...block, text: (block.text || '').replace('{page}', String(page)).replace('{pages}', String(pageCount)) }"
                          :renderTokens="renderPrintTokens"
                          :renderHtml="renderPrintHtmlPreview"
                          :getFieldLabel="getPrintableFieldLabel"
                          :getFieldValue="getPreviewFieldValue"
                        />
                      </div>
                    </template>
                  </div>
                </div>
              </div>
              </div><!-- end previewRoot -->
            </div>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>

  <!-- ── Block Help Modal ─────────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="help-fade">
      <div
        v-if="helpBlockType"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        @click.self="helpBlockType = null"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="helpBlockType = null" />

        <!-- Card -->
        <div class="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ BLOCK_HELP[helpBlockType]?.icon || '📦' }}</span>
              <div>
                <p class="font-bold text-base">{{ BLOCK_HELP[helpBlockType]?.title || helpBlockType }}</p>
                <p class="text-[11px] text-muted-foreground font-mono">block: {{ helpBlockType }}</p>
              </div>
            </div>
            <button type="button" class="rounded-full p-1.5 hover:bg-muted transition-colors" @click="helpBlockType = null">
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <!-- Description -->
            <p class="text-sm text-muted-foreground leading-relaxed">{{ BLOCK_HELP[helpBlockType]?.desc }}</p>

            <!-- Steps -->
            <div v-if="BLOCK_HELP[helpBlockType]?.steps?.length">
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Cara Implementasi</p>
              <ol class="space-y-1.5">
                <li
                  v-for="(step, i) in BLOCK_HELP[helpBlockType].steps"
                  :key="i"
                  class="flex gap-2.5 text-sm"
                >
                  <span class="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold mt-0.5">{{ i + 1 }}</span>
                  <span class="text-muted-foreground leading-relaxed">{{ step }}</span>
                </li>
              </ol>
            </div>

            <!-- Token chips -->
            <div v-if="BLOCK_HELP[helpBlockType]?.tokens?.length">
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Token yang Bisa Dipakai</p>
              <div class="flex flex-wrap gap-1.5">
                <code
                  v-for="tok in BLOCK_HELP[helpBlockType].tokens"
                  :key="tok"
                  class="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[11px] font-mono"
                >{{ tok }}</code>
              </div>
            </div>

            <!-- Example -->
            <div v-if="BLOCK_HELP[helpBlockType]?.example">
              <p class="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Contoh Data / Output</p>
              <pre class="rounded-lg bg-muted/60 border border-border px-3 py-2.5 text-[11px] font-mono text-foreground whitespace-pre-wrap leading-relaxed">{{ BLOCK_HELP[helpBlockType].example }}</pre>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
            <button
              type="button"
              class="rounded-lg px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              @click="helpBlockType = null"
            >Tutup</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.help-fade-enter-active,
.help-fade-leave-active {
  transition: opacity 0.18s ease;
}
.help-fade-enter-from,
.help-fade-leave-to {
  opacity: 0;
}
.help-fade-enter-active .relative,
.help-fade-leave-active .relative {
  transition: transform 0.18s ease;
}
.help-fade-enter-from .relative,
.help-fade-leave-to .relative {
  transform: scale(0.95);
}
</style>
