<script setup lang="js">
import { toast } from "vue-sonner";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings2,
  Loader2,
  CheckCircle,
  Table2,
  Search,
  RefreshCw,
  Database,
  X,
  BookOpen,
  Copy,
  Download,
  Upload,
} from "lucide-vue-next";
import { createBlankField, createBlankDetail, getComponentBadge, getRegistryEntry } from "~/utils/builder/fieldRegistry";
import { Layers } from "lucide-vue-next";
import { AgGridVue } from "ag-grid-vue3";

// Theme for AG Grid
const themeCookie = useCookie('theme');
const isDark = computed(() => themeCookie.value === 'dark');

// ============================================================================
// META & ROUTE
// ============================================================================
definePageMeta({ layout: false });

const route = useRoute();
const builderToken = route.params.token;

// ============================================================================
// STATE
// ============================================================================
const config = ref(null);
const configError = ref("");
const generating = ref(false);
const generated = ref(false);
const generatedMessage = ref("");
const panelOpen = ref(false);
const panelIndex = ref(-1);
const docsOpen = ref(false);

// Shared preview values for cascading selects in builder preview
const previewValues = reactive({});
function onPreviewChange(fieldName, value) {
  previewValues[fieldName] = value;
  // Cascading clear: find all descendants and clear their preview values
  function clearDescendants(parentField) {
    fields.value.forEach(f => {
      if (f.dependsOn === parentField && f.field) {
        previewValues[f.field] = '';
        clearDescendants(f.field);
      }
    });
  }
  clearDescendants(fieldName);
}

// Detail tabs state
const detailPanelOpen = ref(false);
const detailPanelIndex = ref(-1);

// ── Cookie-backed state (survives refresh) ─────────────────────────────────
const DEFAULT_FIELDS = [];

const savedFields = useCookie('builder_fields', { default: () => null, maxAge: 60 * 60 * 24 });
const savedDetails = useCookie('builder_details', { default: () => null, maxAge: 60 * 60 * 24 });
const savedLandingConfig = useCookie('builder_landing', { default: () => null, maxAge: 60 * 60 * 24 });
const savedColumnLayout = useCookie('builder_col_layout', { default: () => 2, maxAge: 60 * 60 * 24 });

const fields = ref(savedFields.value && savedFields.value.length ? savedFields.value : structuredClone(DEFAULT_FIELDS));
const details = ref(savedDetails.value && savedDetails.value.length ? savedDetails.value : []);
const landingConfig = ref(savedLandingConfig.value || []);
const columnLayout = ref(savedColumnLayout.value || 2);

// Auto-save to cookies on change
watch(fields, (v) => { savedFields.value = v; }, { deep: true });
watch(details, (v) => { savedDetails.value = v; }, { deep: true });
watch(landingConfig, (v) => { savedLandingConfig.value = v; }, { deep: true });
watch(columnLayout, (v) => { savedColumnLayout.value = v; });

// Auto-sync landing config ketika fields berubah
watch(fields, (newFields) => {
  const current = landingConfig.value;
  const validFields = newFields.filter(f => {
    const entry = getRegistryEntry(f.type);
    return !entry?.isSpace && !entry?.isSwitch && f.field?.trim();
  });
  const existingSet = new Set(current.map(c => c.field));
  const newFieldSet = new Set(validFields.map(f => f.field));
  // Pertahankan urutan existing yg masih ada, update label
  const result = current
    .filter(c => newFieldSet.has(c.field))
    .map(c => {
      const f = validFields.find(vf => vf.field === c.field);
      return { ...c, label: f?.label || c.label };
    });
  // Tambahkan field baru yang belum ada di config
  validFields.forEach(f => {
    if (!existingSet.has(f.field)) {
      const entry = getRegistryEntry(f.type);
      result.push({
        field: f.field,
        label: f.label || f.field,
        displayField: '',
        visible: true,
        minWidth: 140,
      });
    }
  });
  landingConfig.value = result;
}, { deep: true, immediate: true });

function clearBuilderCookies() {
  savedFields.value = null;
  savedDetails.value = null;
  savedLandingConfig.value = null;
  savedColumnLayout.value = null;
}

// Dynamic grid class for column layout
const gridClass = computed(() => {
  const cols = { 1: 'grid grid-cols-1 gap-6', 2: 'grid grid-cols-1 md:grid-cols-2 gap-6', 3: 'grid grid-cols-1 md:grid-cols-3 gap-6' };
  return cols[columnLayout.value] || cols[2];
});
const colSpanFull = computed(() => {
  const spans = { 1: '', 2: 'md:col-span-2', 3: 'md:col-span-3' };
  return spans[columnLayout.value] || spans[2];
});

async function cancelBuilder() {
  clearBuilderCookies();
  fields.value = structuredClone(DEFAULT_FIELDS);
  details.value = [];
  landingConfig.value = [];
  closePanel();
  closeDetailPanel();
  // Delete config on server so token is invalidated
  try {
    await $fetch("/api/builder/cancel", { method: "POST", body: { token: builderToken } });
  } catch {}
  toast.info('Builder di-reset');
  // Redirect to home — this route is no longer accessible
  await navigateTo('/', { replace: true });
}

// ============================================================================
// LOAD CONFIG (with token validation)
// ============================================================================
onMounted(async () => {
  try {
    const data = await $fetch("/api/builder/config", { params: { token: builderToken } });
    config.value = data;
  } catch (e) {
    configError.value =
      "Builder tidak aktif atau token tidak valid. Jalankan: node add_route.cjs <module_path>";
  }
});

// ============================================================================
// FIELD ACTIONS
// ============================================================================
function addField() {
  fields.value.push(createBlankField());
  openPanel(fields.value.length - 1);
}

function removeField(idx) {
  fields.value.splice(idx, 1);
  if (panelIndex.value === idx) closePanel();
}

function moveField(idx, dir) {
  const to = idx + dir;
  if (to < 0 || to >= fields.value.length) return;
  const tmp = fields.value[idx];
  fields.value[idx] = fields.value[to];
  fields.value[to] = tmp;
  if (panelIndex.value === idx) panelIndex.value = to;
  else if (panelIndex.value === to) panelIndex.value = idx;
}

function cloneField(idx) {
  const src = fields.value[idx];
  const copy = JSON.parse(JSON.stringify(src));
  copy.field = src.field ? src.field + '_copy' : '';
  copy.label = src.label ? src.label + ' (Copy)' : '';
  fields.value.splice(idx + 1, 0, copy);
  openPanel(idx + 1);
  toast.success('Field diduplikasi');
}

function exportConfig() {
  const data = {
    fields: fields.value,
    details: details.value,
    landingConfig: landingConfig.value,
    columnLayout: columnLayout.value,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `builder_config_${config.value?.moduleName || 'export'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Config exported');
}

function importConfig() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.fields)) fields.value = data.fields;
      if (Array.isArray(data.details)) details.value = data.details;
      if (Array.isArray(data.landingConfig)) landingConfig.value = data.landingConfig;
      if (data.columnLayout) columnLayout.value = data.columnLayout;
      toast.success(`Config imported: ${data.fields?.length || 0} fields`);
    } catch (err) {
      toast.error('Gagal import: file JSON tidak valid');
    }
  };
  input.click();
}

function openPanel(idx) {
  closeDetailPanel();
  panelIndex.value = idx;
  panelOpen.value = true;
}
function closePanel() {
  panelOpen.value = false;
  panelIndex.value = -1;
}

// ============================================================================
// LANDING CONFIG ACTIONS
// ============================================================================
function moveLandingCol(idx, dir) {
  const to = idx + dir;
  if (to < 0 || to >= landingConfig.value.length) return;
  const arr = [...landingConfig.value];
  const tmp = arr[idx];
  arr[idx] = arr[to];
  arr[to] = tmp;
  landingConfig.value = arr;
}

function updateLandingCol(idx, key, val) {
  const arr = [...landingConfig.value];
  arr[idx] = { ...arr[idx], [key]: val };
  landingConfig.value = arr;
}

// Computed: kolom AG Grid untuk preview landing
const landingPreviewCols = computed(() => {
  const cols = [
    {
      headerName: 'No',
      valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
      width: 60,
      minWidth: 60,
      maxWidth: 80,
      pinned: 'left',
      sortable: false,
      filter: false,
      suppressMovable: true,
    },
  ];
  landingConfig.value
    .filter(c => c.visible)
    .forEach(c => {
      const df = c.displayField?.trim();
      const colDef = {
        headerName: c.label || c.field,
        minWidth: c.minWidth || 140,
        filter: true,
        floatingFilter: true,
        floatingFilterComponentParams: { suppressFilterButton: true },
        suppressMenu: true,
      };
      if (df && df.includes('.')) {
        colDef.valueGetter = (params) => {
          return df.split('.').reduce((obj, k) => obj?.[k], params.data);
        };
      } else {
        colDef.field = df || c.field;
      }
      cols.push(colDef);
    });
  return cols;
});

// ── Landing Preview: sample vs real API data ──
const useRealApi = ref(false);
const realApiLoading = ref(false);
const realApiRows = ref([]);
const apiParams = ref([{ key: '', value: '' }]);

function addApiParam() {
  apiParams.value.push({ key: '', value: '' });
}
function removeApiParam(idx) {
  apiParams.value.splice(idx, 1);
  if (!apiParams.value.length) apiParams.value.push({ key: '', value: '' });
}

async function fetchRealApiData() {
  if (!config.value?.apiEndpoint) {
    toast.error('API endpoint belum tersedia');
    return;
  }
  realApiLoading.value = true;
  try {
    const qp = new URLSearchParams();
    qp.set('join', 'true');
    apiParams.value.forEach(p => {
      if (p.key?.trim() && p.value?.trim()) qp.set(p.key.trim(), p.value.trim());
    });
    const api = useApi();
    const res = await api.get(`/api/dynamic/${config.value.apiEndpoint}?${qp.toString()}`);
    const list = Array.isArray(res) ? res : (res?.data || res?.rows || []);
    realApiRows.value = list;
    toast.success(`${list.length} baris data diterima`);
  } catch (e) {
    toast.error('Gagal fetch: ' + (e?.data?.message || e?.message || 'Error'));
    realApiRows.value = [];
  } finally {
    realApiLoading.value = false;
  }
}

// Dummy rows untuk preview landing (sample data)
const sampleRows = computed(() => {
  const visible = landingConfig.value.filter(c => c.visible);
  if (!visible.length) return [];
  const rows = [];
  for (let r = 1; r <= 3; r++) {
    const row = { id: r };
    visible.forEach(c => {
      row[c.field] = `Sample ${c.label || c.field} ${r}`;
    });
    rows.push(row);
  }
  return rows;
});

const landingPreviewRows = computed(() => {
  if (useRealApi.value && realApiRows.value.length) return realApiRows.value;
  return sampleRows.value;
});

// ============================================================================
// DETAIL TAB ACTIONS
// ============================================================================
function addDetail() {
  details.value.push(createBlankDetail());
  openDetailPanel(details.value.length - 1);
}

function removeDetail(idx) {
  details.value.splice(idx, 1);
  if (detailPanelIndex.value === idx) closeDetailPanel();
}

function openDetailPanel(idx) {
  closePanel();
  detailPanelIndex.value = idx;
  detailPanelOpen.value = true;
}
function closeDetailPanel() {
  detailPanelOpen.value = false;
  detailPanelIndex.value = -1;
}

function updateDetailAtIndex(updated) {
  details.value[detailPanelIndex.value] = updated;
}

function updateFieldAtIndex(updated) {
  fields.value[panelIndex.value] = updated;
}

// ============================================================================
// DETAIL PREVIEW — interactive test data
// ============================================================================
const detailPreviewData = reactive({});

function getPreviewArr(dIdx) {
  if (!detailPreviewData[dIdx]) detailPreviewData[dIdx] = [];
  return detailPreviewData[dIdx];
}

function getPreviewExcludeIds(dIdx) {
  const detail = details.value[dIdx];
  const fk = detail?.foreignKey || 'id';
  const arr = getPreviewArr(dIdx);
  return arr.map(d => d[fk]);
}

function handlePreviewMultiSelectAdd(dIdx, selectedItems) {
  const detail = details.value[dIdx];
  const fk = detail?.foreignKey || 'id';
  const fkDisplay = detail?.foreignDisplay || '';
  const uk = detail?.uniqueKey || 'id';
  const arr = getPreviewArr(dIdx);
  let added = 0;
  selectedItems.forEach(item => {
    if (arr.some(d => d[fk] === item[uk])) return;
    const row = { [fk]: item[uk] };
    if (fkDisplay) row[fkDisplay] = item;
    (detail.detailFields || []).forEach(df => {
      if (df.type === 'checkbox') row[df.key] = df.default !== false;
      else if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) row[df.key] = df.default || 0;
      else row[df.key] = df.default || '';
    });
    arr.push(row);
    added++;
  });
  if (added) {
    detailPreviewData[dIdx] = [...arr];
    toast.success(`${added} item ditambahkan (preview)`);
  }
}

function handlePreviewAddRow(dIdx) {
  const detail = details.value[dIdx];
  const arr = getPreviewArr(dIdx);
  const row = {};
  (detail.detailFields || []).forEach(df => {
    if (df.type === 'checkbox') row[df.key] = df.default !== false;
    else if (['number', 'fieldnumber', 'fieldnumber_decimal'].includes(df.type)) row[df.key] = df.default || 0;
    else row[df.key] = df.default || '';
  });
  arr.push(row);
  detailPreviewData[dIdx] = [...arr];
}

function removePreviewRow(dIdx, rowIdx) {
  const arr = getPreviewArr(dIdx);
  arr.splice(rowIdx, 1);
  detailPreviewData[dIdx] = [...arr];
}

// ============================================================================
// DETAIL AG GRID HELPERS
// ============================================================================
function getDetailColumnDefs(dIdx) {
  const detail = details.value[dIdx];
  const cols = [];

  // No column
  cols.push({
    headerName: 'No',
    valueGetter: (params) => params.node.rowIndex + 1,
    width: 60,
    pinned: 'left',
    sortable: false,
    filter: false,
    suppressMovable: true,
  });

  // Display columns (ButtonMultiSelect mode only)
  if (detail.mode !== 'add_to_list') {
    (detail.displayColumns || []).forEach(dc => {
      cols.push({
        headerName: dc.label || dc.key,
        field: dc.key,
        flex: 1,
        minWidth: 100,
        valueGetter: (params) => {
          if (detail.foreignDisplay) {
            return params.data?.[detail.foreignDisplay]?.[dc.key] || '-';
          }
          return params.data?.[dc.key] || '-';
        },
      });
    });
  }

  // Detail fields (editable)
  (detail.detailFields || []).forEach(df => {
    if (df.type === 'checkbox') {
      cols.push({
        headerName: df.label || df.key,
        field: df.key,
        width: 100,
        minWidth: 80,
        cellRenderer: (params) => {
          const val = params.value;
          const label = val ? (df.labelTrue || 'Ya') : (df.labelFalse || 'Tidak');
          const cls = val ? 'text-green-600 font-semibold' : 'text-red-500';
          return `<span class="cursor-pointer select-none ${cls}">${label}</span>`;
        },
        onCellClicked: (params) => {
          params.data[df.key] = !params.data[df.key];
          params.api.refreshCells({ rowNodes: [params.node], columns: [df.key], force: true });
        },
      });
    } else if (['fieldnumber', 'fieldnumber_decimal', 'number'].includes(df.type)) {
      cols.push({
        headerName: df.label || df.key,
        field: df.key,
        flex: 1,
        minWidth: 100,
        editable: true,
        cellEditor: 'agNumberCellEditor',
        valueSetter: (params) => {
          params.data[df.key] = Number(params.newValue) || 0;
          return true;
        },
      });
    } else {
      cols.push({
        headerName: df.label || df.key,
        field: df.key,
        flex: 1,
        minWidth: 120,
        editable: true,
        valueSetter: (params) => {
          params.data[df.key] = params.newValue;
          return true;
        },
      });
    }
  });

  // Aksi column
  cols.push({
    headerName: 'Aksi',
    width: 70,
    pinned: 'right',
    sortable: false,
    filter: false,
    suppressMovable: true,
    cellRenderer: () => `<button class="text-destructive hover:text-destructive/80 text-xs font-medium">Hapus</button>`,
    onCellClicked: (params) => {
      removePreviewRow(dIdx, params.node.rowIndex);
    },
  });

  return cols;
}

const detailDefaultColDef = {
  sortable: true,
  resizable: true,
};

// ============================================================================
// GENERATE
// ============================================================================
async function generate() {
  const empty = fields.value.filter((f) => {
    const entry = getRegistryEntry(f.type)
    if (entry?.isSpace || entry?.isSection) return false
    return !f.field?.trim()
  });
  if (empty.length) {
    toast.error("Ada field yang belum memiliki Field Name!");
    return;
  }
  generating.value = true;
  try {
    const result = await $fetch("/api/builder/generate", {
      method: "POST",
      body: {
        token: builderToken,
        modulePath: config.value.modulePath,
        moduleName: config.value.moduleName,
        apiEndpoint: config.value.apiEndpoint,
        routePath: config.value.routePath,
        pageTitle: config.value.readableName,
        fields: fields.value,
        details: details.value,
        landingConfig: landingConfig.value,
        columnLayout: columnLayout.value,
      },
    });
    if (result.success) {
      clearBuilderCookies();
      generated.value = true;
      generatedMessage.value = result.message;
      toast.success("Files generated!");
    } else {
      toast.error(result.error || "Gagal generate");
    }
  } catch (e) {
    toast.error("Gagal: " + (e.data?.message || e.message));
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div class="h-screen overflow-y-auto">
  <!-- ================================================================ -->
  <!-- ERROR: Config not found -->
  <!-- ================================================================ -->
  <div
    v-if="configError"
    class="min-h-screen flex items-center justify-center bg-background p-6"
  >
    <Card class="max-w-md w-full">
      <CardHeader>
        <CardTitle class="text-destructive">Builder Tidak Aktif</CardTitle>
        <CardDescription>{{ configError }}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre
          class="text-sm bg-muted p-3 rounded-md overflow-x-auto"
        >node add_route.cjs setup/m_supplier</pre>
      </CardContent>
    </Card>
  </div>

  <!-- ================================================================ -->
  <!-- SUCCESS overlay -->
  <!-- ================================================================ -->
  <div
    v-else-if="generated"
    class="min-h-screen flex items-center justify-center bg-background p-6"
  >
    <Card class="max-w-md w-full text-center">
      <CardContent class="pt-8 pb-8 space-y-4">
        <CheckCircle class="h-16 w-16 mx-auto text-green-500" />
        <h2 class="text-xl font-bold text-green-600">Berhasil!</h2>
        <p
          class="text-sm text-muted-foreground"
          v-html="generatedMessage"
        ></p>
        <p class="text-xs text-muted-foreground">
          Tab ini bisa ditutup. Nuxt akan auto-reload halaman baru.
        </p>
      </CardContent>
    </Card>
  </div>

  <!-- ================================================================ -->
  <!-- LOADING config -->
  <!-- ================================================================ -->
  <div
    v-else-if="!config"
    class="min-h-screen flex items-center justify-center bg-background"
  >
    <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
  </div>

  <!-- ================================================================ -->
  <!-- MAIN BUILDER -->
  <!-- ================================================================ -->
  <div v-else class="min-h-screen bg-background transition-[padding-right] duration-[250ms]" :style="panelOpen ? 'padding-right:480px' : detailPanelOpen ? 'padding-right:520px' : ''">
    <!-- Config bar -->
    <div
      class="border-b border-border bg-card sticky top-0 z-50 px-6 py-3 flex flex-wrap items-center gap-4 text-sm"
    >
      <span class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium">{{ config?.modulePath }}</span>
      <span class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium">{{ config?.routePath }}</span>
      <span class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium">Endpoint: {{ config?.apiEndpoint }}</span>
      <span class="bg-primary text-primary-foreground px-2.5 py-1 rounded-md text-xs font-semibold">{{ config?.readableName }}</span>

      <!-- Theme toggles + docs (matches default layout) -->
      <div class="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" class="h-8 gap-1 text-xs" title="Import Config" @click="importConfig">
          <Upload class="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" class="h-8 gap-1 text-xs" title="Export Config" @click="exportConfig">
          <Download class="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" class="h-8 w-8" title="Dokumentasi Builder" @click="docsOpen = true">
          <BookOpen class="h-4 w-4" />
        </Button>
        <ThemeColorToggle />
        <ThemeToggle />
      </div>
    </div>

    <!-- Documentation Dialog -->
    <BuilderDocs v-model:open="docsOpen" />

    <div class="max-w-[80%] mx-auto p-6 space-y-6">
      <!-- Builder Tabs -->
      <Tabs default-value="form" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="form">
            <Settings2 class="h-4 w-4 mr-1.5" /> Form Builder
          </TabsTrigger>
          <TabsTrigger value="landing">
            <Table2 class="h-4 w-4 mr-1.5" /> Konfigurasi Landing
          </TabsTrigger>
        </TabsList>

        <!-- ============================================================ -->
        <!-- TAB: FORM BUILDER -->
        <!-- ============================================================ -->
        <TabsContent value="form" class="space-y-6 mt-4">
      <!-- Page header (preview) -->
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" disabled>
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <div>
          <h1 class="text-2xl font-bold text-foreground">
            Tambah {{ config?.readableName || '' }} Baru
          </h1>
          <p class="text-sm text-muted-foreground">
            Buat data {{ (config?.readableName || '').toLowerCase() }} baru
          </p>
        </div>
        <!-- Column layout selector -->
        <div class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span class="font-medium">Kolom:</span>
          <button
            v-for="n in [1, 2, 3]"
            :key="n"
            class="h-7 w-7 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors"
            :class="columnLayout === n ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary hover:text-primary'"
            @click="columnLayout = n"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Form Card (preview with real components) -->
      <Card>
        <CardHeader>
          <CardTitle>Informasi {{ config?.readableName || '' }}</CardTitle>
          <CardDescription>
            Isi data {{ (config?.readableName || '').toLowerCase() }} dengan lengkap
            dan benar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div :class="gridClass">
            <!-- Render each field with real components -->
            <div
              v-for="(f, idx) in fields"
              :key="idx"
              class="relative group rounded-lg pt-4 pb-2 px-2 transition-all"
              :class="[
                f.fullWidth || getRegistryEntry(f.type)?.isSection ? colSpanFull : '',
                panelIndex === idx
                  ? 'ring-2 ring-ring ring-offset-2 ring-offset-background bg-accent/50'
                  : 'hover:ring-2 hover:ring-ring/40 hover:ring-offset-2 hover:ring-offset-background hover:bg-accent/30',
                f.visibleWhenField && String(previewValues[f.visibleWhenField] ?? '') !== String(f.visibleWhenValue ?? '')
                  ? 'opacity-30 pointer-events-none'
                  : '',
              ]"
            >
              <!-- Action buttons (show on hover) -->
              <div
                class="absolute -top-2.5 -right-1.5 hidden group-hover:flex gap-1 z-10"
              >
                <button
                  class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-primary hover:border-primary flex items-center justify-center shadow-sm"
                  @click.stop="openPanel(idx)"
                  title="Edit field"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button
                  class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-blue-500 hover:border-blue-500 flex items-center justify-center shadow-sm"
                  @click.stop="cloneField(idx)"
                  title="Duplikasi field"
                >
                  <Copy class="h-3 w-3" />
                </button>
                <button
                  v-if="idx > 0"
                  class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-primary hover:border-primary flex items-center justify-center shadow-sm"
                  @click.stop="moveField(idx, -1)"
                >
                  <ChevronUp class="h-3 w-3" />
                </button>
                <button
                  v-if="idx < fields.length - 1"
                  class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-primary hover:border-primary flex items-center justify-center shadow-sm"
                  @click.stop="moveField(idx, 1)"
                >
                  <ChevronDown class="h-3 w-3" />
                </button>
                <button
                  class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-destructive hover:border-destructive flex items-center justify-center shadow-sm"
                  @click.stop="removeField(idx)"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              </div>

              <!-- Component badge -->
              <span
                class="absolute top-0 left-2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
              >
                {{ getComponentBadge(f.type) }}
              </span>

              <!-- VisibleWhen indicator badge -->
              <span
                v-if="f.visibleWhenField"
                class="absolute top-0 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5"
                :style="{ left: `${(getComponentBadge(f.type)?.length || 5) * 7 + 24}px` }"
                :title="`Tampil jika ${f.visibleWhenField} = ${f.visibleWhenValue}`"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                Kondisional
              </span>

              <!-- Dynamic preview from registry -->
              <BuilderFieldPreview
                :field="f"
                :previewValues="previewValues"
                @previewChange="(fieldName, val) => onPreviewChange(fieldName, val)"
              />
            </div>

            <!-- Add field zone -->
            <div
              class="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center cursor-pointer text-muted-foreground hover:border-primary hover:text-primary hover:bg-accent/30 transition-all"
              :class="colSpanFull"
              @click="addField"
            >
              <Plus class="h-5 w-5 mr-2" />
              <span class="text-sm font-medium">Tambah Field</span>
            </div>
          </div>
        </CardContent>
      </Card>

        </TabsContent>

        <!-- ============================================================ -->
        <!-- TAB: KONFIGURASI LANDING -->
        <!-- ============================================================ -->
        <TabsContent value="landing" class="space-y-6 mt-4">
      <Card v-if="landingConfig.length > 0">
        <CardHeader>
          <div class="flex items-center gap-3">
            <Table2 class="h-5 w-5 text-primary shrink-0" />
            <div>
              <CardTitle class="text-base">Konfigurasi Landing</CardTitle>
              <CardDescription>Atur kolom tabel & tampilan di halaman daftar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <!-- Quick hint for Display Field -->
          <div class="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            <BookOpen class="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>Untuk data nested/relasi, isi <strong>Display Field</strong> dengan dot-notation (misal: <code class="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">unit_bisnis.nama_comp</code>). <button class="text-primary hover:underline font-medium" @click="docsOpen = true">Lihat dokumentasi lengkap →</button></span>
          </div>

          <div class="border border-border rounded-lg overflow-hidden text-xs">
            <!-- Table Header -->
            <div class="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_52px_52px_28px] gap-1.5 px-2.5 py-2 bg-muted font-semibold text-muted-foreground items-center">
              <span class="text-center">#</span>
              <span>Field</span>
              <span>Label Kolom</span>
              <span title="Field yang ditampilkan (kosong = field asli, misal: unit_bisnis.nama_comp)">Display Field</span>
              <span class="text-center" title="Tampil di tabel desktop">Tampil</span>
              <span class="text-center" title="Min Width (px)">Width</span>
              <span></span>
            </div>
            <!-- Rows -->
            <div
              v-for="(col, i) in landingConfig"
              :key="col.field"
              class="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_52px_52px_28px] gap-1.5 px-2.5 py-1.5 border-t border-border items-center transition-opacity"
              :class="!col.visible ? 'opacity-40' : ''"
            >
              <span class="text-center text-muted-foreground">{{ i + 1 }}</span>
              <span class="font-mono text-[11px] truncate" :title="col.field">{{ col.field }}</span>
              <input
                type="text"
                :value="col.label"
                class="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-0.5 py-0.5 text-xs"
                @input="updateLandingCol(i, 'label', $event.target.value)"
              />
              <input
                type="text"
                :value="col.displayField"
                :placeholder="col.field"
                class="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-0.5 py-0.5 text-xs font-mono text-[11px]"
                @input="updateLandingCol(i, 'displayField', $event.target.value)"
              />
              <div class="flex justify-center">
                <input
                  type="checkbox"
                  :checked="col.visible"
                  class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                  @change="updateLandingCol(i, 'visible', $event.target.checked)"
                />
              </div>
              <input
                type="number"
                :value="col.minWidth"
                min="50"
                max="500"
                class="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-center px-0 py-0.5 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @input="updateLandingCol(i, 'minWidth', parseInt($event.target.value) || 140)"
              />
              <div class="flex flex-col items-center -space-y-1">
                <button
                  v-if="i > 0"
                  class="text-muted-foreground hover:text-foreground transition-colors p-0"
                  @click="moveLandingCol(i, -1)"
                >
                  <ChevronUp class="h-3.5 w-3.5" />
                </button>
                <button
                  v-if="i < landingConfig.length - 1"
                  class="text-muted-foreground hover:text-foreground transition-colors p-0"
                  @click="moveLandingCol(i, 1)"
                >
                  <ChevronDown class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Landing Preview (DataTable style) -->
          <div class="mt-5">
            <p class="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Preview Tabel Landing</p>

            <!-- Toolbar: Refresh + Try API -->
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <Button variant="outline" size="sm" @click="useRealApi = false; realApiRows = [];">
                <RefreshCw class="h-3.5 w-3.5 mr-1" /> Sample Data
              </Button>
              <Button
                variant="outline" size="sm"
                :class="useRealApi ? 'border-primary text-primary' : ''"
                @click="useRealApi = !useRealApi"
              >
                <Database class="h-3.5 w-3.5 mr-1" />
                {{ useRealApi ? 'Mode: Real API' : 'Coba dengan Real API' }}
              </Button>
              <span v-if="useRealApi && config" class="text-[10px] text-muted-foreground font-mono">
                /api/dynamic/{{ config.apiEndpoint }}
              </span>
            </div>

            <!-- API Params (shown when real API mode) -->
            <div v-if="useRealApi" class="rounded-lg border border-border bg-muted/50 p-3 mb-2 space-y-2">
              <p class="text-[11px] font-medium text-muted-foreground">Parameter API</p>
              <div v-for="(p, pi) in apiParams" :key="pi" class="flex items-center gap-2">
                <input
                  v-model="p.key"
                  placeholder="key (misal: filter_column_nama)"
                  class="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  v-model="p.value"
                  placeholder="value"
                  class="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button class="text-muted-foreground hover:text-destructive p-0.5" @click="removeApiParam(pi)">
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm" class="h-7 text-xs" @click="addApiParam">
                  <Plus class="h-3 w-3 mr-1" /> Tambah Param
                </Button>
                <Button size="sm" class="h-7 text-xs" :disabled="realApiLoading" @click="fetchRealApiData">
                  <Loader2 v-if="realApiLoading" class="h-3 w-3 mr-1 animate-spin" />
                  <Search v-else class="h-3 w-3 mr-1" />
                  Fetch Data
                </Button>
                <span v-if="realApiRows.length" class="text-[10px] text-muted-foreground">
                  {{ realApiRows.length }} baris
                </span>
              </div>
            </div>

            <!-- AG Grid preview -->
            <div class="rounded-lg border border-border bg-card overflow-hidden">
              <ClientOnly>
                <div
                  :class="isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'"
                  class="w-full"
                  style="height: 220px"
                >
                  <AgGridVue
                    class="w-full h-full"
                    :columnDefs="landingPreviewCols"
                    :rowData="landingPreviewRows"
                    :defaultColDef="{ sortable: true, resizable: true, flex: 1 }"
                    :animateRows="true"
                    :overlayNoRowsTemplate="'<span class=&quot;text-muted-foreground text-sm&quot;>Belum ada kolom yang ditampilkan</span>'"
                  />
                </div>
              </ClientOnly>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <!-- ================================================================ -->
      <!-- DETAIL TABS SECTION -->
      <!-- ================================================================ -->
      <div v-if="details.length > 0" class="space-y-4">
        <div v-for="(detail, dIdx) in details" :key="dIdx">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Layers class="h-4 w-4 text-primary" />
                  <CardTitle class="text-base">{{ detail.tabLabel || 'Detail Tab' }}</CardTitle>
                  <span class="text-xs text-muted-foreground">{{ detail.responseKey || '?' }} → {{ detail.payloadKey || '?' }}</span>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded" :class="detail.mode === 'add_to_list' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'">
                    {{ detail.mode === 'add_to_list' ? 'Add To List' : 'ButtonMultiSelect' }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" @click="openDetailPanel(dIdx)">
                    <Settings2 class="h-3.5 w-3.5 mr-1" />
                    Konfigurasi
                  </Button>
                  <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive" @click="removeDetail(dIdx)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                <template v-if="detail.mode !== 'add_to_list'">
                  API: {{ detail.apiUrl || '-' }} · FK: {{ detail.foreignKey || '-' }} · {{ (detail.detailFields || []).length }} field per baris
                </template>
                <template v-else>
                  {{ (detail.detailFields || []).length }} field per baris (manual add)
                </template>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <!-- Action button: ButtonMultiSelect or Tambah -->
              <div class="flex justify-end mb-3">
                <ButtonMultiSelect
                  v-if="detail.mode !== 'add_to_list' && detail.apiUrl"
                  :title="detail.buttonLabel || 'Pilih Item'"
                  :api="{ url: detail.apiUrl }"
                  :columns="(detail.columns || []).filter(c => c.key).map(c => ({ key: c.key, label: c.label, sortable: true, ...(c.width ? { width: c.width } : {}) }))"
                  :searchKey="detail.searchKey || 'name'"
                  :displayKey="detail.displayKey || 'name'"
                  :uniqueKey="detail.uniqueKey || 'id'"
                  :excludeIds="getPreviewExcludeIds(dIdx)"
                  @add="(items) => handlePreviewMultiSelectAdd(dIdx, items)"
                />
                <Button
                  v-else-if="detail.mode === 'add_to_list'"
                  variant="outline"
                  size="sm"
                  class="gap-1.5"
                  @click="handlePreviewAddRow(dIdx)"
                >
                  <Plus class="h-4 w-4" />
                  {{ detail.buttonLabel || 'Tambah' }}
                </Button>
                <span v-else class="text-xs text-muted-foreground italic">Isi API Endpoint dulu untuk test ButtonMultiSelect</span>
              </div>

              <!-- AG Grid Detail Table -->
              <ClientOnly>
                <div
                  :class="isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'"
                  class="w-full rounded-lg overflow-hidden"
                  :style="{ height: Math.max(150, Math.min(400, (getPreviewArr(dIdx).length + 1) * 42 + 10)) + 'px' }"
                >
                  <AgGridVue
                    class="w-full h-full"
                    :columnDefs="getDetailColumnDefs(dIdx)"
                    :rowData="getPreviewArr(dIdx)"
                    :defaultColDef="detailDefaultColDef"
                    :animateRows="true"
                    :singleClickEdit="true"
                    :stopEditingWhenCellsLoseFocus="true"
                    :overlayNoRowsTemplate="'<span class=&quot;text-muted-foreground text-sm&quot;>Belum ada item ditambahkan</span>'"
                  />
                </div>
              </ClientOnly>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Add Detail Tab button -->
      <div
        class="border-2 border-dashed border-border rounded-lg p-4 flex items-center justify-center cursor-pointer text-muted-foreground hover:border-primary hover:text-primary hover:bg-accent/30 transition-all"
        @click="addDetail"
      >
        <Layers class="h-5 w-5 mr-2" />
        <span class="text-sm font-medium">Tambah Detail Tab</span>
      </div>

      <!-- Action bar -->
      <div class="flex justify-end gap-3">
        <Button variant="outline" @click="cancelBuilder">Batal</Button>
        <Button @click="generate" :disabled="generating" class="gap-2">
          <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Generate
        </Button>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- CONFIG PANEL — Field (slide from right) -->
    <!-- ================================================================ -->
    <Teleport to="body">
      <!-- Panel -->
      <Transition name="slide">
        <div
          v-if="panelOpen && panelIndex >= 0 && panelIndex < fields.length"
          class="fixed top-0 right-0 z-[101] h-full w-[480px] bg-card border-l border-border shadow-xl overflow-y-auto overflow-x-hidden"
        >
          <div
            class="flex items-center justify-between px-5 py-4 border-b border-border"
          >
            <h3 class="text-base font-semibold flex items-center gap-2">
              <Settings2 class="h-4 w-4" />
              Konfigurasi Field
            </h3>
            <button
              class="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
              @click="closePanel"
            >
              &times;
            </button>
          </div>

          <div class="p-5">
            <BuilderFieldPanel
              :field="fields[panelIndex]"
              :allFields="fields"
              :fieldIndex="panelIndex"
              @update:field="updateFieldAtIndex"
              @remove="removeField"
              @close="closePanel"
            />
          </div>

          <!-- Footer -->
          <div class="p-5 border-t border-border">
            <Button class="w-full" @click="closePanel">Selesai</Button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ================================================================ -->
    <!-- CONFIG PANEL — Detail Tab (slide from right) -->
    <!-- ================================================================ -->
    <Teleport to="body">
      <Transition name="slide">
        <div
          v-if="detailPanelOpen && detailPanelIndex >= 0 && detailPanelIndex < details.length"
          class="fixed top-0 right-0 z-[101] h-full w-[520px] bg-card border-l border-border shadow-xl overflow-y-auto"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 class="text-base font-semibold flex items-center gap-2">
              <Layers class="h-4 w-4" />
              Konfigurasi Detail Tab
            </h3>
            <button class="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground" @click="closeDetailPanel">&times;</button>
          </div>

          <div class="p-5">
            <BuilderDetailPanel
              :detail="details[detailPanelIndex]"
              :detailIndex="detailPanelIndex"
              @update:detail="updateDetailAtIndex"
              @remove="removeDetail"
              @close="closeDetailPanel"
            />
          </div>

          <div class="p-5 border-t border-border">
            <Button class="w-full" @click="closeDetailPanel">Selesai</Button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
