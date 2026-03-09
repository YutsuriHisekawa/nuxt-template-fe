<script setup>
import { getBlockWrapperStyle, getFontStyle, parsePrintFieldTable, parseSignatureTitles, parseListItems, parseTableCells, resolveLogoUrl } from './_usePrint'

const props = defineProps({
  block: { type: Object, required: true },
  renderTokens: { type: Function, required: true },
  renderHtml: { type: Function, required: true },
  getFieldLabel: { type: Function, required: true },
  getFieldValue: { type: Function, required: true },
})
</script>

<template>
  <div :style="getBlockWrapperStyle(block)">
    <!-- Company Header -->
    <div v-if="block.type === 'company_header'" class="mb-5">
      <div class="flex gap-4 items-start" :class="block.align === 'center' ? 'justify-center text-center' : 'justify-start text-left'">
        <div v-if="block.logoUrl" class="shrink-0">
          <img :src="resolveLogoUrl(block.logoUrl)" alt="logo" class="w-16 h-16 object-cover rounded" />
        </div>
        <div>
          <h2 class="text-xl font-bold uppercase tracking-wide">{{ renderTokens(block.companyName) }}</h2>
          <p v-if="block.companySubtitle" class="text-sm font-semibold mt-1">{{ renderTokens(block.companySubtitle) }}</p>
          <p v-if="block.address" class="text-xs mt-1 whitespace-pre-wrap">{{ renderTokens(block.address) }}</p>
          <p v-if="block.meta" class="text-[11px] mt-1 text-slate-600">{{ renderTokens(block.meta) }}</p>
        </div>
      </div>
    </div>

    <!-- Heading -->
    <component
      :is="`h${Math.min(3, Math.max(1, Number(block.level || 1)))}`"
      v-else-if="block.type === 'heading'"
      class="tracking-wide mb-3"
      :class="{
        'text-center': block.align === 'center',
        'text-right': block.align === 'right',
      }"
      :style="getFontStyle(block)"
    >{{ renderTokens(block.text) }}</component>

    <!-- Paragraph -->
    <p
      v-else-if="block.type === 'paragraph'"
      class="mb-3 whitespace-pre-wrap leading-6"
      :class="{
        'text-center': block.align === 'center',
        'text-right': block.align === 'right',
        'text-justify': block.align === 'justify',
      }"
      :style="{ ...getFontStyle(block), fontSize: block.fontSize ? `${block.fontSize}px` : '0.875rem' }"
    >{{ renderTokens(block.text) }}</p>

    <!-- Field -->
    <div v-else-if="block.type === 'field'" class="mb-3" :class="block.layout === 'stacked' ? 'space-y-1' : 'grid grid-cols-[180px_minmax(0,1fr)] gap-3'">
      <div class="font-semibold text-sm">{{ block.label || getFieldLabel(block.field) }}</div>
      <div class="text-sm text-slate-500 italic">{{ getFieldValue(block.field) }}</div>
    </div>

    <!-- Field Table -->
    <div v-else-if="block.type === 'field_table'" class="mb-4">
      <h3 v-if="block.title" class="text-sm font-bold uppercase mb-2">{{ renderTokens(block.title) }}</h3>
      <table class="w-full text-sm border-collapse">
        <tbody>
          <tr v-for="item in parsePrintFieldTable(block.itemsText)" :key="`${block.id}-${item.field}`" class="border-b border-slate-300">
            <td class="py-2 pr-4 w-45 font-medium text-slate-700 align-top">{{ item.label || getFieldLabel(item.field) }}</td>
            <td class="py-2 text-slate-500 italic">{{ getFieldValue(item.field) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail Table -->
    <div v-else-if="block.type === 'detail_table'" class="mb-4">
      <h3 class="text-sm font-bold uppercase mb-2">{{ renderTokens(block.title || 'Detail') }}</h3>
      <div class="rounded border border-slate-300 overflow-hidden">
        <table class="w-full text-xs border-collapse">
          <thead class="bg-slate-100">
            <tr>
              <th class="border border-slate-300 px-2 py-1.5 text-left">No</th>
              <th class="border border-slate-300 px-2 py-1.5 text-left">Preview</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-slate-300 px-2 py-1.5">1</td>
              <td class="border border-slate-300 px-2 py-1.5 text-slate-500 italic">Tabel detail akan mengikuti konfigurasi detail <strong>{{ block.responseKey || '-' }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Image -->
    <div v-else-if="block.type === 'image'" class="mb-4" :class="{ 'text-center': block.align === 'center', 'text-right': block.align === 'right' }">
      <img v-if="block.src" :src="block.src" :alt="block.alt || 'image'" class="inline-block object-contain" :style="{ width: `${Number(block.width || 120)}px`, height: `${Number(block.height || 120)}px` }" />
      <div v-else class="inline-flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs" :style="{ width: `${Number(block.width || 120)}px`, height: `${Number(block.height || 120)}px` }">Image Placeholder</div>
    </div>

    <!-- Columns -->
    <div v-else-if="block.type === 'columns'" class="mb-4" :style="{ display: 'grid', gridTemplateColumns: `repeat(${block.colCount || 2}, 1fr)`, gap: `${block.gap || 16}px` }">
      <div v-for="(html, ci) in (block.columnsHtml || [])" :key="ci" class="prose prose-sm max-w-none text-sm" v-html="renderHtml(html)"></div>
    </div>

    <!-- List -->
    <component
      :is="block.listType === 'number' ? 'ol' : 'ul'"
      v-else-if="block.type === 'list'"
      class="mb-4 pl-6"
      :class="block.listType === 'number' ? 'list-decimal' : 'list-disc'"
      :style="{ fontSize: block.fontSize ? `${block.fontSize}px` : '0.875rem', fontFamily: block.fontFamily || undefined, color: block.color || undefined }"
    >
      <li v-for="(item, li) in parseListItems(block.itemsText)" :key="li" class="mb-1">{{ renderTokens(item) }}</li>
    </component>

    <!-- Table (Free-form) -->
    <div v-else-if="block.type === 'table'" class="mb-4">
      <table class="w-full text-sm border-collapse" :class="block.showBorder ? '' : 'no-border'">
        <thead v-if="block.headerRow">
          <tr>
            <th v-for="(cell, ci) in parseTableCells(block.cellsText, block.rows, block.cols)[0]" :key="ci" class="px-2 py-1.5 text-left bg-slate-100 font-semibold" :class="block.showBorder ? 'border border-slate-300' : ''">{{ renderTokens(cell) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in parseTableCells(block.cellsText, block.rows, block.cols).slice(block.headerRow ? 1 : 0)" :key="ri">
            <td v-for="(cell, ci) in row" :key="ci" class="px-2 py-1.5" :class="block.showBorder ? 'border border-slate-300' : ''">{{ renderTokens(cell) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Divider -->
    <div v-else-if="block.type === 'divider'" class="mb-4" :style="{ borderBottom: `${Number(block.thickness || 1)}px ${block.style || 'solid'} black` }"></div>

    <!-- Spacer -->
    <div v-else-if="block.type === 'spacer'" :style="{ height: `${Number(block.height || 20)}px` }"></div>

    <!-- Page Break -->
    <div v-else-if="block.type === 'page_break'" class="mb-4 flex items-center gap-3 text-xs text-slate-400">
      <div class="flex-1 border-t-2 border-dashed border-slate-300"></div>
      <span class="uppercase font-semibold tracking-wider">Page Break</span>
      <div class="flex-1 border-t-2 border-dashed border-slate-300"></div>
    </div>

    <!-- Page Number -->
    <div
      v-else-if="block.type === 'page_number'"
      class="mb-3 text-slate-500"
      :class="{ 'text-center': block.align === 'center', 'text-right': block.align === 'right' }"
      :style="{ fontSize: block.fontSize ? `${block.fontSize}px` : '0.75rem' }"
    >{{ (block.format || 'Halaman {page}').replace('{page}', '1') }}</div>

    <!-- Watermark -->
    <div v-else-if="block.type === 'watermark'" class="mb-4 relative h-24 flex items-center justify-center overflow-hidden">
      <span
        class="absolute select-none pointer-events-none font-bold uppercase"
        :style="{
          fontSize: `${block.fontSize || 80}px`,
          opacity: block.opacity || 0.08,
          color: block.color || '#000',
          transform: `rotate(${block.rotate ?? -35}deg)`,
        }"
      >{{ block.text || 'DRAFT' }}</span>
    </div>

    <!-- Signature -->
    <div v-else-if="block.type === 'signature'" class="mt-8 grid gap-6 text-center text-xs" :style="{ gridTemplateColumns: `repeat(${Math.max(1, parseSignatureTitles(block.titlesText).length)}, minmax(0, 1fr))` }">
      <div v-for="(title, titleIndex) in parseSignatureTitles(block.titlesText)" :key="`${block.id}-${titleIndex}`">
        <p class="font-semibold mb-14">{{ title }}</p>
        <div class="border-t border-black pt-1 text-slate-400">{{ block.caption || 'Nama / Tanggal' }}</div>
      </div>
    </div>

    <!-- Header (Kop Halaman) -->
    <div
      v-else-if="block.type === 'header'"
      class="mb-3"
      :class="{ 'text-center': block.align === 'center', 'text-right': block.align === 'right' }"
    >
      <p
        class="whitespace-pre-wrap leading-6"
        :style="{ fontSize: block.fontSize ? `${block.fontSize}px` : '0.75rem', fontFamily: block.fontFamily || undefined, fontWeight: block.bold ? 'bold' : undefined, fontStyle: block.italic ? 'italic' : undefined, textDecoration: block.underline ? 'underline' : undefined, color: block.color || undefined }"
      >{{ renderTokens(block.text) }}</p>
      <div v-if="block.showLine !== false" class="mt-1 border-b border-black"></div>
    </div>

    <!-- Footer (Kaki Halaman) -->
    <div
      v-else-if="block.type === 'footer'"
      class="mt-3"
      :class="{ 'text-center': block.align === 'center', 'text-right': block.align === 'right' }"
    >
      <div v-if="block.showLine !== false" class="mb-1 border-t border-black"></div>
      <p
        class="whitespace-pre-wrap leading-6"
        :style="{ fontSize: block.fontSize ? `${block.fontSize}px` : '0.75rem', fontFamily: block.fontFamily || undefined, fontWeight: block.bold ? 'bold' : undefined, fontStyle: block.italic ? 'italic' : undefined, textDecoration: block.underline ? 'underline' : undefined, color: block.color || undefined }"
      >{{ renderTokens(block.text.replace('{page}', '1').replace('{pages}', '1')) }}</p>
    </div>

    <!-- HTML Custom -->
    <div v-else-if="block.type === 'html'" class="mb-3 prose prose-sm max-w-none" v-html="renderHtml(block.html)"></div>
  </div>
</template>
