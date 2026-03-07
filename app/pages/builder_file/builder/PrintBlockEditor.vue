<script setup>
import { FONT_FAMILY_OPTIONS } from './_usePrint'

const props = defineProps({
  block: { type: Object, required: true },
  blockIndex: { type: Number, required: true },
  printableFields: { type: Array, default: () => [] },
  printableDetails: { type: Array, default: () => [] },
})

const emit = defineEmits(['update'])

function update(key, value) {
  emit('update', props.blockIndex, key, value)
}

function updateColumnsHtml(colIdx, value) {
  const arr = [...(props.block.columnsHtml || [])]
  arr[colIdx] = value
  emit('update', props.blockIndex, 'columnsHtml', arr)
}

function onColCountChange(newCount) {
  const n = Math.max(1, Math.min(4, Number(newCount) || 2))
  emit('update', props.blockIndex, 'colCount', n)
  const arr = [...(props.block.columnsHtml || [])]
  while (arr.length < n) arr.push('')
  emit('update', props.blockIndex, 'columnsHtml', arr.slice(0, n))
}

// ── Table grid helpers ─────────────────────────────────────────────────
function parseCellsText(text, rows, cols) {
  const lines = (text || '').split('\n')
  const grid = []
  for (let r = 0; r < rows; r++) {
    const cells = (lines[r] || '').split('|')
    const row = []
    for (let c = 0; c < cols; c++) {
      row.push(cells[c] ?? '')
    }
    grid.push(row)
  }
  return grid
}

function updateTableCell(rowIdx, colIdx, value) {
  const grid = parseCellsText(props.block.cellsText, props.block.rows, props.block.cols)
  grid[rowIdx][colIdx] = value
  emit('update', props.blockIndex, 'cellsText', grid.map(r => r.join('|')).join('\n'))
}

function onTableRowsChange(newRows) {
  const n = Math.max(1, Math.min(50, Number(newRows) || 1))
  const grid = parseCellsText(props.block.cellsText, props.block.rows, props.block.cols)
  while (grid.length < n) grid.push(new Array(props.block.cols).fill(''))
  emit('update', props.blockIndex, 'rows', n)
  emit('update', props.blockIndex, 'cellsText', grid.slice(0, n).map(r => r.join('|')).join('\n'))
}

function onTableColsChange(newCols) {
  const n = Math.max(1, Math.min(10, Number(newCols) || 1))
  const grid = parseCellsText(props.block.cellsText, props.block.rows, props.block.cols)
  const resized = grid.map(row => {
    const r = [...row]
    while (r.length < n) r.push('')
    return r.slice(0, n)
  })
  emit('update', props.blockIndex, 'cols', n)
  emit('update', props.blockIndex, 'cellsText', resized.map(r => r.join('|')).join('\n'))
}
</script>

<template>
  <!-- ── Heading ── -->
  <template v-if="block.type === 'heading'">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="md:col-span-3 space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Text</label>
        <input :value="block.text" @input="update('text', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Level</label>
        <select :value="block.level" @change="update('level', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option :value="1">H1</option>
          <option :value="2">H2</option>
          <option :value="3">H3</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Align</label>
        <select :value="block.align" @change="update('align', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Size (px, 0=default)</label>
        <input type="number" min="0" max="72" :value="block.fontSize" @input="update('fontSize', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Family</label>
        <select :value="block.fontFamily" @change="update('fontFamily', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="">Default</option>
          <option v-for="ff in FONT_FAMILY_OPTIONS" :key="ff" :value="ff">{{ ff }}</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Warna</label>
        <input type="color" :value="block.color || '#000000'" @input="update('color', $event.target.value)" class="h-9 w-16 rounded-md border border-border bg-background" />
      </div>
      <div class="md:col-span-3 flex items-center gap-4 text-sm">
        <label class="flex items-center gap-1.5">
          <input type="checkbox" :checked="block.bold" @change="update('bold', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
          <span class="font-bold">B</span>
        </label>
        <label class="flex items-center gap-1.5">
          <input type="checkbox" :checked="block.italic" @change="update('italic', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
          <span class="italic">I</span>
        </label>
        <label class="flex items-center gap-1.5">
          <input type="checkbox" :checked="block.underline" @change="update('underline', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
          <span class="underline">U</span>
        </label>
      </div>
    </div>
  </template>

  <!-- ── Company Header ── -->
  <template v-else-if="block.type === 'company_header'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5 md:col-span-2">
        <FieldUpload
          label="Logo Perusahaan"
          :value="block.logoUrl"
          accept="image/*"
          :maxSizeMB="2"
          @input="(v) => update('logoUrl', v)"
        />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Nama Perusahaan</label>
        <input :value="block.companyName" @input="update('companyName', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Sub Title / Divisi</label>
        <input :value="block.companySubtitle" @input="update('companySubtitle', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs font-semibold text-muted-foreground">Alamat</label>
        <textarea :value="block.address" @input="update('address', $event.target.value)" rows="3" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs font-semibold text-muted-foreground">Info Tambahan</label>
        <input :value="block.meta" @input="update('meta', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="Telp, Email, Website, NPWP, dll" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Align</label>
        <select :value="block.align" @change="update('align', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="left">Left</option>
          <option value="center">Center</option>
        </select>
      </div>
    </div>
  </template>

  <!-- ── Paragraph ── -->
  <template v-else-if="block.type === 'paragraph'">
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Isi Teks</label>
      <textarea :value="block.text" @input="update('text', $event.target.value)" rows="4" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <p class="text-[11px] text-muted-foreground">Token: <code>&#123;&#123;page_title&#125;&#125;</code>, <code>&#123;&#123;current_date&#125;&#125;</code>, <code>&#123;&#123;nama_field&#125;&#125;</code></p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Align</label>
        <select :value="block.align" @change="update('align', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Size (px, 0=default)</label>
        <input type="number" min="0" max="72" :value="block.fontSize" @input="update('fontSize', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Family</label>
        <select :value="block.fontFamily" @change="update('fontFamily', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="">Default</option>
          <option v-for="ff in FONT_FAMILY_OPTIONS" :key="ff" :value="ff">{{ ff }}</option>
        </select>
      </div>
    </div>
    <div class="flex items-center gap-4 text-sm">
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.bold" @change="update('bold', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="font-bold">B</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.italic" @change="update('italic', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="italic">I</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.underline" @change="update('underline', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="underline">U</span>
      </label>
      <div class="space-y-1.5">
        <input type="color" :value="block.color || '#000000'" @input="update('color', $event.target.value)" class="h-7 w-10 rounded border border-border bg-background" title="Warna teks" />
      </div>
    </div>
  </template>

  <!-- ── Field ── -->
  <template v-else-if="block.type === 'field'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Field</label>
        <select :value="block.field" @change="update('field', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option v-if="!printableFields.length" value="" disabled>Belum ada field</option>
          <option v-for="field in printableFields" :key="field.field" :value="field.field">{{ field.label || field.field }}</option>
        </select>
        <p v-if="!printableFields.length" class="text-[11px] text-amber-500">Tambahkan field di tab Form terlebih dahulu.</p>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Layout</label>
        <select :value="block.layout" @change="update('layout', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="row">Row</option>
          <option value="stacked">Stacked</option>
        </select>
      </div>
      <div class="md:col-span-2 space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Label Override</label>
        <input :value="block.label" @input="update('label', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
    </div>
  </template>

  <!-- ── Field Table ── -->
  <template v-else-if="block.type === 'field_table'">
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Judul Section</label>
      <input :value="block.title" @input="update('title', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
    </div>
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Daftar Field</label>
      <textarea :value="block.itemsText" @input="update('itemsText', $event.target.value)" rows="8" class="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono" />
      <p class="text-[11px] text-muted-foreground">Format per baris: <code>field_name|Label Custom</code></p>
    </div>
  </template>

  <!-- ── Detail Table ── -->
  <template v-else-if="block.type === 'detail_table'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Judul</label>
        <input :value="block.title" @input="update('title', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Sumber Detail</label>
        <select :value="block.responseKey" @change="update('responseKey', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option v-if="!printableDetails.length" value="" disabled>Belum ada detail</option>
          <option v-for="detail in printableDetails" :key="detail.responseKey" :value="detail.responseKey">{{ detail.tabLabel || detail.responseKey }}</option>
        </select>
      </div>
    </div>
  </template>

  <!-- ── Image ── -->
  <template v-else-if="block.type === 'image'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5 md:col-span-2">
        <label class="text-xs font-semibold text-muted-foreground">Image URL</label>
        <input :value="block.src" @input="update('src', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="https://.../image.png" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Alt Text</label>
        <input :value="block.alt" @input="update('alt', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Align</label>
        <select :value="block.align" @change="update('align', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Width (px)</label>
        <input type="number" min="40" max="400" :value="block.width" @input="update('width', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Height (px)</label>
        <input type="number" min="40" max="400" :value="block.height" @input="update('height', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
    </div>
  </template>

  <!-- ── Columns ── -->
  <template v-else-if="block.type === 'columns'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Jumlah Kolom</label>
        <input type="number" min="1" max="4" :value="block.colCount" @input="onColCountChange($event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Gap (px)</label>
        <input type="number" min="0" max="48" :value="block.gap" @input="update('gap', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
    </div>
    <div class="space-y-2 mt-2">
      <div v-for="(_, ci) in (block.columnsHtml || [])" :key="ci" class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Kolom {{ ci + 1 }} (HTML)</label>
        <textarea :value="block.columnsHtml[ci]" @input="updateColumnsHtml(ci, $event.target.value)" rows="3" class="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono" />
      </div>
      <p class="text-[11px] text-muted-foreground">Setiap kolom bisa berisi HTML + token. Contoh: <code>&#123;&#123;nama_field&#125;&#125;</code></p>
    </div>
  </template>

  <!-- ── List ── -->
  <template v-else-if="block.type === 'list'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Tipe List</label>
        <select :value="block.listType" @change="update('listType', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="bullet">Bullet (•)</option>
          <option value="number">Numbered (1. 2. 3.)</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Size (px, 0=default)</label>
        <input type="number" min="0" max="72" :value="block.fontSize" @input="update('fontSize', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
    </div>
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Daftar Item</label>
      <textarea :value="block.itemsText" @input="update('itemsText', $event.target.value)" rows="6" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <p class="text-[11px] text-muted-foreground">Satu baris = satu item. Token tetap jalan.</p>
    </div>
  </template>

  <!-- ── Table (Free-form) ── -->
  <template v-else-if="block.type === 'table'">
    <div class="grid grid-cols-3 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Baris</label>
        <input type="number" min="1" max="50" :value="block.rows" @change="onTableRowsChange($event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Kolom</label>
        <input type="number" min="1" max="10" :value="block.cols" @change="onTableColsChange($event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="flex items-end gap-3 pb-1">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="block.showBorder" @change="update('showBorder', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
          Border
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="block.headerRow" @change="update('headerRow', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
          Header Row
        </label>
      </div>
    </div>
    <!-- Interactive table grid editor -->
    <div class="space-y-1.5 mt-1">
      <label class="text-xs font-semibold text-muted-foreground">Isi Tabel</label>
      <div class="overflow-x-auto rounded-md border border-border">
        <table class="w-full border-collapse text-xs">
          <tbody>
            <tr
              v-for="(row, rIdx) in parseCellsText(block.cellsText, block.rows, block.cols)"
              :key="rIdx"
              :class="rIdx === 0 && block.headerRow ? 'bg-primary/10' : 'hover:bg-muted/20'"
            >
              <td
                v-for="(cell, cIdx) in row"
                :key="cIdx"
                class="border border-border p-0"
              >
                <input
                  :value="cell"
                  @input="updateTableCell(rIdx, cIdx, $event.target.value)"
                  class="w-full h-7 min-w-[80px] px-2 bg-transparent text-xs outline-none focus:bg-primary/5 focus:outline-none"
                  :class="rIdx === 0 && block.headerRow ? 'font-semibold' : ''"
                  :placeholder="rIdx === 0 && block.headerRow ? `Kolom ${cIdx + 1}` : ''"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-muted-foreground">Klik sel untuk mengedit. Row pertama dijadikan header jika "Header Row" aktif.</p>
    </div>
  </template>

  <!-- ── Divider ── -->
  <template v-else-if="block.type === 'divider'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Ketebalan Garis</label>
        <input type="number" min="1" max="6" :value="block.thickness" @input="update('thickness', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Style</label>
        <select :value="block.style" @change="update('style', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="double">Double</option>
        </select>
      </div>
    </div>
  </template>

  <!-- ── Spacer ── -->
  <template v-else-if="block.type === 'spacer'">
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Tinggi Spacer (px)</label>
      <input type="number" min="8" max="120" :value="block.height" @input="update('height', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
    </div>
  </template>

  <!-- ── Page Break ── -->
  <template v-else-if="block.type === 'page_break'">
    <p class="text-xs text-muted-foreground">Tidak ada konfigurasi. Block ini memaksa pindah halaman baru saat print / export PDF.</p>
  </template>

  <!-- ── Page Number ── -->
  <template v-else-if="block.type === 'page_number'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Format</label>
        <input :value="block.format" @input="update('format', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="Halaman {page}" />
        <p class="text-[11px] text-muted-foreground"><code>{page}</code> = nomor halaman</p>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Align</label>
        <select :value="block.align" @change="update('align', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Size (px, 0=default)</label>
        <input type="number" min="0" max="72" :value="block.fontSize" @input="update('fontSize', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
    </div>
  </template>

  <!-- ── Watermark ── -->
  <template v-else-if="block.type === 'watermark'">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Teks Watermark</label>
        <input :value="block.text" @input="update('text', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="DRAFT" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Size (px)</label>
        <input type="number" min="20" max="200" :value="block.fontSize" @input="update('fontSize', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Opacity</label>
        <input type="number" min="0.01" max="0.5" step="0.01" :value="block.opacity" @input="update('opacity', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Rotasi (derajat)</label>
        <input type="number" min="-90" max="90" :value="block.rotate" @input="update('rotate', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Warna</label>
        <input type="color" :value="block.color || '#000000'" @input="update('color', $event.target.value)" class="h-9 w-16 rounded-md border border-border bg-background" />
      </div>
    </div>
  </template>

  <!-- ── Signature ── -->
  <template v-else-if="block.type === 'signature'">
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Judul Signature</label>
      <textarea :value="block.titlesText" @input="update('titlesText', $event.target.value)" rows="4" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <p class="text-[11px] text-muted-foreground">Satu baris = satu kolom tanda tangan</p>
    </div>
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Caption</label>
      <input :value="block.caption" @input="update('caption', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
    </div>
  </template>

  <!-- ── Header (Kop Halaman) ── -->
  <template v-else-if="block.type === 'header'">
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Teks Header</label>
      <input :value="block.text" @input="update('text', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      <p class="text-[11px] text-muted-foreground">Token: <code>&#123;&#123;page_title&#125;&#125;</code>, <code>&#123;&#123;current_date&#125;&#125;</code>, <code>&#123;&#123;nama_field&#125;&#125;</code></p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Align</label>
        <select :value="block.align" @change="update('align', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Size (px, 0=default)</label>
        <input type="number" min="0" max="72" :value="block.fontSize" @input="update('fontSize', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Family</label>
        <select :value="block.fontFamily" @change="update('fontFamily', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="">Default</option>
          <option v-for="ff in FONT_FAMILY_OPTIONS" :key="ff" :value="ff">{{ ff }}</option>
        </select>
      </div>
    </div>
    <div class="flex items-center gap-4 text-sm flex-wrap">
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.bold" @change="update('bold', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="font-bold">B</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.italic" @change="update('italic', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="italic">I</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.underline" @change="update('underline', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="underline">U</span>
      </label>
      <div class="space-y-1.5">
        <input type="color" :value="block.color || '#000000'" @input="update('color', $event.target.value)" class="h-7 w-10 rounded border border-border bg-background" title="Warna teks" />
      </div>
      <label class="flex items-center gap-1.5 ml-auto">
        <input type="checkbox" :checked="block.showLine" @change="update('showLine', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="text-xs">Garis bawah</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.showOnFirstPage" @change="update('showOnFirstPage', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="text-xs">Tampil di halaman 1</span>
      </label>
    </div>
  </template>

  <!-- ── Footer (Kaki Halaman) ── -->
  <template v-else-if="block.type === 'footer'">
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">Teks Footer</label>
      <input :value="block.text" @input="update('text', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      <p class="text-[11px] text-muted-foreground">Token: <code>&#123;&#123;page_title&#125;&#125;</code>, <code>&#123;&#123;current_date&#125;&#125;</code>, <code>{page}</code> = nomor halaman</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Align</label>
        <select :value="block.align" @change="update('align', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Size (px, 0=default)</label>
        <input type="number" min="0" max="72" :value="block.fontSize" @input="update('fontSize', Number($event.target.value))" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-muted-foreground">Font Family</label>
        <select :value="block.fontFamily" @change="update('fontFamily', $event.target.value)" class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="">Default</option>
          <option v-for="ff in FONT_FAMILY_OPTIONS" :key="ff" :value="ff">{{ ff }}</option>
        </select>
      </div>
    </div>
    <div class="flex items-center gap-4 text-sm flex-wrap">
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.bold" @change="update('bold', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="font-bold">B</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.italic" @change="update('italic', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="italic">I</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.underline" @change="update('underline', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="underline">U</span>
      </label>
      <div class="space-y-1.5">
        <input type="color" :value="block.color || '#000000'" @input="update('color', $event.target.value)" class="h-7 w-10 rounded border border-border bg-background" title="Warna teks" />
      </div>
      <label class="flex items-center gap-1.5 ml-auto">
        <input type="checkbox" :checked="block.showLine" @change="update('showLine', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="text-xs">Garis atas</span>
      </label>
      <label class="flex items-center gap-1.5">
        <input type="checkbox" :checked="block.showOnFirstPage" @change="update('showOnFirstPage', $event.target.checked)" class="h-4 w-4 rounded border-border accent-primary" />
        <span class="text-xs">Tampil di halaman 1</span>
      </label>
    </div>
  </template>

  <!-- ── HTML Custom ── -->
  <template v-else-if="block.type === 'html'">
    <div class="space-y-1.5">
      <label class="text-xs font-semibold text-muted-foreground">HTML Custom</label>
      <textarea :value="block.html" @input="update('html', $event.target.value)" rows="8" class="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono" />
      <p class="text-[11px] text-muted-foreground">Bisa isi bebas. Token tetap jalan, misal <code>&#123;&#123;nama_kary&#125;&#125;</code>.</p>
    </div>
  </template>

  <!-- ── Per-Block Styling (shown for all block types) ── -->
  <details class="mt-3 text-xs">
    <summary class="cursor-pointer text-muted-foreground font-semibold select-none">Styling Lanjutan</summary>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
      <div class="space-y-1">
        <label class="text-[11px] text-muted-foreground">Margin Atas</label>
        <input type="number" min="0" max="100" :value="block.marginTop" @input="update('marginTop', Number($event.target.value))" class="h-8 w-full rounded border border-border bg-background px-2 text-xs" />
      </div>
      <div class="space-y-1">
        <label class="text-[11px] text-muted-foreground">Margin Bawah</label>
        <input type="number" min="0" max="100" :value="block.marginBottom" @input="update('marginBottom', Number($event.target.value))" class="h-8 w-full rounded border border-border bg-background px-2 text-xs" />
      </div>
      <div class="space-y-1">
        <label class="text-[11px] text-muted-foreground">Border (px)</label>
        <input type="number" min="0" max="10" :value="block.borderWidth" @input="update('borderWidth', Number($event.target.value))" class="h-8 w-full rounded border border-border bg-background px-2 text-xs" />
      </div>
      <div class="space-y-1">
        <label class="text-[11px] text-muted-foreground">Border Color</label>
        <input type="color" :value="block.borderColor || '#000000'" @input="update('borderColor', $event.target.value)" class="h-8 w-12 rounded border border-border bg-background" />
      </div>
      <div class="space-y-1">
        <label class="text-[11px] text-muted-foreground">Background</label>
        <input type="color" :value="block.backgroundColor || '#ffffff'" @input="update('backgroundColor', $event.target.value)" class="h-8 w-12 rounded border border-border bg-background" />
      </div>
      <div class="space-y-1">
        <label class="text-[11px] text-muted-foreground">Padding (px)</label>
        <input type="number" min="0" max="40" :value="block.blockPadding" @input="update('blockPadding', Number($event.target.value))" class="h-8 w-full rounded border border-border bg-background px-2 text-xs" />
      </div>
    </div>
  </details>
</template>
