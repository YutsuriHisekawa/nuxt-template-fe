<script setup lang="js">
// @ts-nocheck — Template builder, bukan runtime code
import { Printer, ArrowLeft, Loader2, FileText, FileDown } from "lucide-vue-next";

definePageMeta({ layout: false });

const api = useApi();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const record = ref(null);
const errorMessage = ref("");
const exportingPdf = ref(false);
const exportingDocx = ref(false);
const printRoot = ref(null);

const recordId = computed(() => route.params.id);
const printConfig = __PRINT_CONFIG_JSON__;
const fieldMeta = __PRINT_FIELD_META_JSON__;
const detailMeta = __PRINT_DETAIL_META_JSON__;

const API_BASE = "/api/dynamic/__API_ENDPOINT__";

function getPaperStyle(cfg) {
  const sizes = {
    A4: { portrait: { width: "210mm", minHeight: "297mm" }, landscape: { width: "297mm", minHeight: "210mm" } },
    A5: { portrait: { width: "148mm", minHeight: "210mm" }, landscape: { width: "210mm", minHeight: "148mm" } },
    Letter: { portrait: { width: "216mm", minHeight: "279mm" }, landscape: { width: "279mm", minHeight: "216mm" } },
    Legal: { portrait: { width: "216mm", minHeight: "356mm" }, landscape: { width: "356mm", minHeight: "216mm" } },
  };
  const paper = sizes[cfg?.paperSize || "A4"] || sizes.A4;
  const dims = paper[cfg?.orientation === "landscape" ? "landscape" : "portrait"];
  return {
    width: "100%",
    maxWidth: dims.width,
    minHeight: dims.minHeight,
    padding: `${Number(cfg?.marginMm || 15)}mm`,
  };
}

const paperStyle = computed(() => getPaperStyle(printConfig));

useHead(() => ({
  style: [
    {
      children: `@page { size: ${printConfig.paperSize || "A4"} ${printConfig.orientation === "landscape" ? "landscape" : "portrait"}; margin: ${Number(printConfig.marginMm || 15)}mm; }`,
    },
  ],
}));

function parseFieldTableItems(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [field, label] = line.split("|").map((part) => part.trim());
      return { field, label: label || field };
    })
    .filter((item) => item.field);
}

function parseSignatureTitles(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveFieldValue(fieldName) {
  const meta = fieldMeta?.[fieldName] || {};
  const value = record.value?.[fieldName];

  if (value === undefined || value === null || value === "") return "-";
  if (meta.type === "switch") return value === true || value === 1 || value === "1" ? meta.labelTrue || "Aktif" : meta.labelFalse || "Tidak Aktif";
  if (meta.type === "currency") return Number(value || 0).toLocaleString("id-ID");
  if (meta.type === "date") return new Date(value).toLocaleDateString("id-ID");
  if (meta.type === "datetime") return new Date(value).toLocaleString("id-ID");
  if ((meta.type === "popup" || meta.type === "select") && typeof value === "object") return value?.[meta.displayField || "name"] || value?.name || "-";
  return String(value);
}

function renderTokens(text) {
  return String(text || "")
    .replace(/\{\{\s*page_title\s*\}\}/gi, "__READABLE_NAME__")
    .replace(/\{\{\s*current_date\s*\}\}/gi, new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }))
    .replace(/\{\{\s*current_datetime\s*\}\}/gi, new Date().toLocaleString("id-ID"))
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, fieldName) => resolveFieldValue(fieldName));
}

function renderHtmlBlock(html) {
  return renderTokens(html).replace(/\n/g, "<br>");
}

function getDetailDefinition(responseKey) {
  return (detailMeta || []).find((detail) => detail.responseKey === responseKey);
}

function getDetailRows(responseKey) {
  const rows = record.value?.[responseKey];
  return Array.isArray(rows) ? rows : [];
}

function getDetailColumns(definition) {
  if (!definition) return [];
  const cols = [];
  if (definition.mode !== "add_to_list") {
    (definition.displayColumns || []).forEach((column) => {
      cols.push({
        key: column.key,
        label: column.label || column.key,
        accessor: definition.foreignDisplay ? `${definition.foreignDisplay}.${column.key}` : column.key,
      });
    });
  }
  (definition.detailFields || []).forEach((field) => {
    cols.push({
      key: field.key,
      label: field.label || field.key,
      type: field.type,
      labelTrue: field.labelTrue,
      labelFalse: field.labelFalse,
    });
  });
  return cols;
}

function formatDetailValue(row, column) {
  if (!column) return "-";
  const value = column.accessor ? column.accessor.split(".").reduce((acc, key) => acc?.[key], row) : row?.[column.key];
  if (value === undefined || value === null || value === "") return "-";
  if (column.type === "checkbox" || column.type === "status") return value ? column.labelTrue || "Ya" : column.labelFalse || "Tidak";
  if (column.type === "currency") return Number(value || 0).toLocaleString("id-ID");
  return String(value);
}

function getExportFilename(ext) {
  const slug = String("__READABLE_NAME__")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "printout"}-${recordId.value || "dokumen"}.${ext}`;
}

function buildExportHtml() {
  const content = printRoot.value?.innerHTML || "";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>__READABLE_NAME__</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; }
      h1, h2, h3 { margin: 0 0 12px; }
      p { margin: 0 0 12px; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
      .no-border td, .no-border th { border-left: none; border-right: none; }
    </style>
  </head>
  <body>${content}</body>
</html>`;
}

async function exportPdf() {
  if (!printRoot.value || exportingPdf.value) return;
  exportingPdf.value = true;
  try {
    const module = await import("html2pdf.js");
    const html2pdf = module.default || module;
    await html2pdf()
      .set({
        margin: 0,
        filename: getExportFilename("pdf"),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm",
          format: String(printConfig.paperSize || "A4").toLowerCase(),
          orientation: printConfig.orientation === "landscape" ? "landscape" : "portrait",
        },
      })
      .from(printRoot.value)
      .save();
  } catch (error) {
    console.error(error);
    alert("Export PDF gagal");
  } finally {
    exportingPdf.value = false;
  }
}

async function exportDocx() {
  if (!printRoot.value || exportingDocx.value) return;
  exportingDocx.value = true;
  try {
    const response = await fetch("/api/print/export-docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: buildExportHtml(),
        filename: getExportFilename("docx"),
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getExportFilename("docx");
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert("Export DOCX gagal");
  } finally {
    exportingDocx.value = false;
  }
}

onMounted(async () => {
  if (!recordId.value) {
    errorMessage.value = "ID tidak ditemukan";
    loading.value = false;
    return;
  }
  try {
    const params = new URLSearchParams({ join: "true" });
    const res = await api.get(`${API_BASE}/${recordId.value}?${params}`);
    const data = res?.data ?? res;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Data tidak ditemukan");
    }
    record.value = data;
  } catch (err) {
    errorMessage.value = err?.message || "Gagal memuat data";
  }
  loading.value = false;
});

const handlePrint = () => {
  window.print();
};

const handleBack = () => {
  router.back();
};
</script>

<template>
  <div class="print-page min-h-screen bg-slate-100 text-black">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="errorMessage" class="flex items-center justify-center min-h-screen">
      <div class="text-center text-red-500">
        <p class="text-lg font-semibold">Gagal</p>
        <p class="text-sm">{{ errorMessage }}</p>
      </div>
    </div>

    <div v-else-if="record" class="px-4 py-6 print:p-0">
      <div class="print:hidden flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 max-w-[1200px] mx-auto">
        <button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50" @click="handleBack">
          <ArrowLeft class="h-4 w-4" />
          Kembali
        </button>
        <button class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700" @click="handlePrint">
          <Printer class="h-4 w-4" />
          Cetak
        </button>
        <button v-if="printConfig.exportPdf !== false" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60" :disabled="exportingPdf" @click="exportPdf">
          <FileDown class="h-4 w-4" />
          {{ exportingPdf ? 'Exporting PDF...' : 'Export PDF' }}
        </button>
        <button v-if="printConfig.exportDocx !== false" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-60" :disabled="exportingDocx" @click="exportDocx">
          <FileText class="h-4 w-4" />
          {{ exportingDocx ? 'Exporting DOCX...' : 'Export DOCX' }}
        </button>
      </div>

      <div ref="printRoot" class="mx-auto bg-white shadow-sm print:shadow-none print:max-w-none" :style="paperStyle">
        <template v-for="block in printConfig.blocks" :key="block.id">
          <div
            v-if="block.type === 'company_header'"
            class="mb-5"
          >
            <div class="flex gap-4 items-start" :class="block.align === 'center' ? 'justify-center text-center' : 'justify-start text-left'">
              <div v-if="block.logoUrl" class="shrink-0">
                <img :src="block.logoUrl" alt="logo" class="object-contain max-h-20 max-w-24" />
              </div>
              <div>
                <h1 class="text-xl font-bold uppercase tracking-wide">{{ renderTokens(block.companyName) }}</h1>
                <p v-if="block.companySubtitle" class="text-sm font-semibold mt-1">{{ renderTokens(block.companySubtitle) }}</p>
                <p v-if="block.address" class="text-xs mt-1 whitespace-pre-wrap">{{ renderTokens(block.address) }}</p>
                <p v-if="block.meta" class="text-[11px] mt-1 text-slate-600">{{ renderTokens(block.meta) }}</p>
              </div>
            </div>
            <div v-if="block.showDivider" class="mt-3 border-b-2 border-black"></div>
          </div>

          <component
            :is="`h${Math.min(3, Math.max(1, Number(block.level || 1)))}`"
            v-else-if="block.type === 'heading'"
            class="font-bold tracking-wide mb-3"
            :class="{
              'text-center': block.align === 'center',
              'text-right': block.align === 'right',
            }"
          >{{ renderTokens(block.text) }}</component>

          <p
            v-else-if="block.type === 'paragraph'"
            class="mb-3 whitespace-pre-wrap text-sm leading-6"
            :class="{
              'text-center': block.align === 'center',
              'text-right': block.align === 'right',
              'text-justify': block.align === 'justify',
            }"
          >{{ renderTokens(block.text) }}</p>

          <div v-else-if="block.type === 'field'" class="mb-3" :class="block.layout === 'stacked' ? 'space-y-1' : 'grid grid-cols-[180px_minmax(0,1fr)] gap-3'">
            <div class="font-semibold text-sm">{{ block.label || fieldMeta?.[block.field]?.label || block.field }}</div>
            <div class="text-sm">{{ resolveFieldValue(block.field) }}</div>
          </div>

          <div v-else-if="block.type === 'field_table'" class="mb-4">
            <h3 v-if="block.title" class="text-sm font-bold uppercase mb-2">{{ renderTokens(block.title) }}</h3>
            <table class="w-full text-sm border-collapse no-border">
              <tbody>
                <tr v-for="item in parseFieldTableItems(block.itemsText)" :key="`${block.id}-${item.field}`" class="border-b border-slate-300">
                  <td class="py-2 pr-4 w-50 font-medium text-slate-700 align-top border-l-0">{{ item.label || fieldMeta?.[item.field]?.label || item.field }}</td>
                  <td class="py-2 border-r-0">{{ resolveFieldValue(item.field) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else-if="block.type === 'detail_table'" class="mb-5">
            <h3 class="text-sm font-bold uppercase mb-2">{{ renderTokens(block.title || 'Detail') }}</h3>
            <table class="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th class="border border-slate-300 px-2 py-1.5 text-left bg-slate-100">No</th>
                  <th v-for="column in getDetailColumns(getDetailDefinition(block.responseKey))" :key="`${block.id}-${column.key}`" class="border border-slate-300 px-2 py-1.5 text-left bg-slate-100">{{ column.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in getDetailRows(block.responseKey)" :key="`${block.id}-${rowIndex}`">
                  <td class="border border-slate-300 px-2 py-1.5">{{ rowIndex + 1 }}</td>
                  <td v-for="column in getDetailColumns(getDetailDefinition(block.responseKey))" :key="`${block.id}-${column.key}-${rowIndex}`" class="border border-slate-300 px-2 py-1.5">{{ formatDetailValue(row, column) }}</td>
                </tr>
                <tr v-if="!getDetailRows(block.responseKey).length">
                  <td :colspan="1 + getDetailColumns(getDetailDefinition(block.responseKey)).length" class="border border-slate-300 px-2 py-4 text-center text-slate-400">Tidak ada data</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else-if="block.type === 'image'" class="mb-4" :class="{ 'text-center': block.align === 'center', 'text-right': block.align === 'right' }">
            <img
              v-if="block.src"
              :src="block.src"
              :alt="block.alt || 'image'"
              class="inline-block"
              :style="{ width: `${Number(block.width || 120)}px`, height: `${Number(block.height || 120)}px`, objectFit: block.fit || 'contain' }"
            />
          </div>

          <div v-else-if="block.type === 'divider'" class="mb-4 border-b border-black" :style="{ borderBottomWidth: `${Number(block.thickness || 1)}px` }"></div>

          <div v-else-if="block.type === 'spacer'" :style="{ height: `${Number(block.height || 20)}px` }"></div>

          <div v-else-if="block.type === 'signature'" class="mt-10 grid gap-8 text-center text-sm" :style="{ gridTemplateColumns: `repeat(${Math.max(1, parseSignatureTitles(block.titlesText).length)}, minmax(0, 1fr))` }">
            <div v-for="(title, titleIndex) in parseSignatureTitles(block.titlesText)" :key="`${block.id}-${titleIndex}`">
              <p class="font-semibold mb-16">{{ renderTokens(title) }}</p>
              <div class="border-t border-black pt-1 text-slate-500">{{ renderTokens(block.caption || 'Nama / Tanggal') }}</div>
            </div>
          </div>

          <div v-else-if="block.type === 'html'" class="mb-3 prose prose-sm max-w-none" v-html="renderHtmlBlock(block.html)"></div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print-page {
    margin: 0;
    padding: 0;
    background: white;
  }
}
</style>
