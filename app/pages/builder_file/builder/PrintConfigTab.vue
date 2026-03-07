<script setup>
import { Plus, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-vue-next'
import { Printer } from 'lucide-vue-next'
import PrintBlockEditor from './PrintBlockEditor.vue'
import PrintBlockPreview from './PrintBlockPreview.vue'
import {
  PRINT_BLOCK_TYPES,
  PRINT_PAPER_OPTIONS,
  printUid,
  normalizePrintBlock,
  normalizePrintConfig,
  createDefaultPrintBlocks,
  createDefaultPrintConfig,
  getPaperPreviewStyle,
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

const printPreviewStyle = computed(() => getPaperPreviewStyle(props.printConfig))

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
            <Button type="button" variant="outline" size="sm" class="gap-2" @click="showPrintHelp = !showPrintHelp">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              {{ showPrintHelp ? 'Sembunyikan Help' : 'Help Print Builder' }}
            </Button>
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
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] gap-5 items-start">
          <!-- Block list (editors) -->
          <div class="space-y-3">
            <div
              v-for="(block, blockIndex) in printConfig.blocks"
              :key="block.id"
              class="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold capitalize">{{ block.type.replace(/_/g, ' ') }}</p>
                  <p class="text-[11px] text-muted-foreground">Block #{{ blockIndex + 1 }}</p>
                </div>
                <div class="flex items-center gap-1">
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
          </div>

          <!-- Preview -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview Layout Print</p>
            <div class="rounded-xl border border-border bg-[#0b1220] p-4 overflow-auto">
              <div class="mx-auto rounded-lg bg-white text-black shadow-sm relative" :style="printPreviewStyle">
                <!-- Watermark overlay (absolute positioned) -->
                <template v-for="block in printConfig.blocks" :key="'wm-' + block.id">
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

                <!-- Block content -->
                <div style="position: relative; z-index: 1;">
                  <template v-for="block in printConfig.blocks" :key="'preview-' + block.id">
                    <PrintBlockPreview
                      v-if="block.type !== 'watermark'"
                      :block="block"
                      :renderTokens="renderPrintTokens"
                      :renderHtml="renderPrintHtmlPreview"
                      :getFieldLabel="getPrintableFieldLabel"
                      :getFieldValue="getPreviewFieldValue"
                    />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
