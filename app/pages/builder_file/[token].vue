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
  Undo2,
  Redo2,
  AlertTriangle,
  Package,
  CheckSquare,
  Square,
  ListChecks,
  Footprints,
  ExternalLink,
  Zap,
} from "lucide-vue-next";
import {
  createBlankField,
  createBlankDetail,
  getComponentBadge,
  getRegistryEntry,
  getDetailFieldDefaultWidth,
  getDetailFieldDecimalPlaces,
  isDetailNumericFieldType,
} from "~/utils/builder/fieldRegistry";
import { Layers, Printer } from "lucide-vue-next";
import { AgGridVue } from "ag-grid-vue3";
import { PRESET_TEMPLATES } from "./_presets";
import { useLanding } from "./_useLanding";
import { useDetailPreview } from "./_useDetailPreview";
import {
  isPrintableField as _isPrintableField,
  normalizePrintConfig,
  createDefaultPrintConfig,
  PRINT_PAPER_OPTIONS,
} from "./builder/_usePrint";
import PrintConfigTab from "./builder/PrintConfigTab.vue";

// Resolve dot-path keys like 'm_item.kode_item' → obj.m_item.kode_item
function $resolveDotPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

// Theme for AG Grid
const themeCookie = useCookie("theme");
const isDark = computed(() => themeCookie.value === "dark");

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
    fields.value.forEach((f) => {
      if (f.dependsOn === parentField && f.field) {
        previewValues[f.field] = "";
        clearDescendants(f.field);
      }
    });
  }
  clearDescendants(fieldName);
  // Recompute all formula fields that depend on this changed field
  computeAllFormulas();
}

// Auto-fill: when a select/popup emits full object, fill target fields
function onPreviewValueFull(fieldName, obj) {
  // Header → Header auto-fill
  fields.value.forEach((f) => {
    if (
      f.defaultValueFrom?.field === fieldName &&
      f.defaultValueFrom?.property &&
      f.field
    ) {
      const val = obj?.[f.defaultValueFrom.property] || "";
      previewValues[f.field] = val;
    }
  });
  // Header → Detail auto-fill
  details.value.forEach((d, dIdx) => {
    (d.detailFields || []).forEach((df) => {
      if (
        df.defaultValueFrom?.field === fieldName &&
        df.defaultValueFrom?.property
      ) {
        const val = obj?.[df.defaultValueFrom.property] || "";
        const arr = getPreviewArr(dIdx);
        arr.forEach((row, rIdx) => {
          updatePreviewCell(dIdx, rIdx, df.key, val);
        });
        // Recompute formulas for all rows after fill
        getPreviewArr(dIdx).forEach((_, rIdx) => {
          computeDetailRowFormulas(dIdx, rIdx);
        });
      }
    });
  });
}

// Detail → Detail auto-fill: when a detail select/popup emits full object
function onDetailPreviewValueFull(dIdx, rIdx, sourceKey, obj) {
  const detail = details.value[dIdx];
  (detail.detailFields || []).forEach((df) => {
    if (
      df.defaultValueFrom?.field === sourceKey &&
      df.defaultValueFrom?.property
    ) {
      const val = obj?.[df.defaultValueFrom.property] || "";
      updatePreviewCell(dIdx, rIdx, df.key, val);
    }
  });
  computeDetailRowFormulas(dIdx, rIdx);
}

// ── Detail row formula computation ────────────────────────────────────────
function computeDetailRowFormulas(dIdx, rIdx) {
  const detail = details.value[dIdx];
  if (!detail) return;
  const formulaFields = (detail.detailFields || []).filter(
    (df) => Array.isArray(df.computedFormula) && df.computedFormula.length && df.key
  );
  if (!formulaFields.length) return;
  // Multi-pass to handle chained formulas
  for (let pass = 0; pass < formulaFields.length; pass++) {
    let changed = false;
    const row = getPreviewArr(dIdx)[rIdx];
    if (!row) break;
    formulaFields.forEach((df) => {
      const tokens = df.computedFormula;
      try {
        const expr = tokens
          .map((t) => {
            if (t.type === "field")
              return `(Number(${JSON.stringify(row[t.value] ?? "")}) || 0)`;
            if (t.type === "op") return t.value;
            if (t.type === "number") return t.value;
            if (t.type === "paren") return t.value;
            return "";
          })
          .join(" ");
        const result = new Function(`"use strict"; return (${expr})`)();
        const val = isFinite(result) ? result : 0;
        if (String(row[df.key]) !== String(val)) {
          updatePreviewCell(dIdx, rIdx, df.key, val);
          changed = true;
        }
      } catch {
        // invalid formula — skip
      }
    });
    if (!changed) break;
  }
}

// Wrapper: update cell then recompute all formula fields in that row
function updateCellAndCompute(dIdx, rIdx, key, val) {
  updatePreviewCell(dIdx, rIdx, key, val);
  computeDetailRowFormulas(dIdx, rIdx);
}

function isDetailFieldReadonly(df) {
  return Boolean(df?.readonly) ||
    (Array.isArray(df?.computedFormula) && df.computedFormula.length > 0);
}

function getDetailFieldWidth(df) {
  return df?.width || getDetailFieldDefaultWidth(df?.type);
}

function getDetailFieldCellStyle(df) {
  const width = getDetailFieldWidth(df);
  return width ? { width, minWidth: width } : {};
}

function getDetailFieldHeaderClass(df) {
  return [
    "px-2 py-2 font-medium text-xs",
    isDetailNumericFieldType(df?.type) ? "text-right" : "text-center",
  ].join(" ");
}

function getDetailFieldCellClass(df) {
  return [
    "px-2 py-1.5 align-top",
    isDetailNumericFieldType(df?.type) ? "text-right" : "",
  ].join(" ");
}

function formatDetailPreviewNumber(value, df) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: getDetailFieldDecimalPlaces(df),
  });
}

// ── Live formula computation for builder preview ───────────────────────────
function computeAllFormulas() {
  // Multi-pass to handle chained formulas (field A → field B → field C)
  const formulaFields = fields.value.filter((f) => {
    const tokens = Array.isArray(f.computedFormula) ? f.computedFormula : [];
    return tokens.length && f.field;
  });
  if (!formulaFields.length) return;
  // Up to N passes (N = number of formula fields) to resolve chains
  for (let pass = 0; pass < formulaFields.length; pass++) {
    let changed = false;
    formulaFields.forEach((f) => {
      const tokens = f.computedFormula;
      try {
        const expr = tokens
          .map((t) => {
            if (t.type === "field")
              return `(Number(${JSON.stringify(previewValues[t.value] ?? "")}) || 0)`;
            if (t.type === "op") return t.value;
            if (t.type === "number") return t.value;
            if (t.type === "paren") return t.value;
            return "";
          })
          .join(" ");
        const result = new Function(`"use strict"; return (${expr})`)();
        const val = isFinite(result) ? result : 0;
        const strVal = String(val);
        if (previewValues[f.field] !== strVal) {
          previewValues[f.field] = strVal;
          changed = true;
        }
      } catch {
        // formula invalid — skip
      }
    });
    if (!changed) break; // converged
  }
}

// Detail tabs state
const detailPanelOpen = ref(false);

function isPrintableField(field) {
  return _isPrintableField(field, getRegistryEntry);
}

function clonePlain(value, fallback = null) {
  if (value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
}

function clonePrintConfigState() {
  return normalizePrintConfig(
    clonePlain(
      printConfig.value,
      createDefaultPrintConfig(
        fields.value,
        details.value,
        config.value?.readableName || "Dokumen",
      ),
    ),
    fields.value,
    details.value,
    config.value?.readableName || "Dokumen",
  );
}

const printableFields = computed(() => fields.value.filter(isPrintableField));
const printableDetails = computed(() =>
  details.value.filter((detail) => detail?.responseKey),
);
const printTokenExamples = computed(() => {
  const fieldNames = printableFields.value.map((field) => field.field);
  const createdField =
    fieldNames.find((name) =>
      ["created_at", "createdAt", "tgl_buat", "tanggal_buat"].includes(name),
    ) ||
    fieldNames.find((name) => name.toLowerCase().includes("created")) ||
    "created_at";
  const userField =
    fieldNames.find((name) =>
      ["created_by", "createdBy", "nama_kary", "nama_user"].includes(name),
    ) ||
    fieldNames.find((name) => name.toLowerCase().includes("nama")) ||
    "nama_kary";
  return {
    createdField,
    userField,
    signatureExample: `{{${userField}}} / {{current_date}}`,
    createdExample: `Dibuat pada {{${createdField}}}`,
  };
});

// ── Drag & Drop state ──────────────────────────────────────────────────────
const dragIndex = ref(-1);
const dragOverIndex = ref(-1);

function onDragStart(idx, event) {
  dragIndex.value = idx;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(idx));
}
function onDragOver(idx, event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  dragOverIndex.value = idx;
}
function onDragLeave() {
  dragOverIndex.value = -1;
}
function onDrop(idx, event) {
  event.preventDefault();
  const from = dragIndex.value;
  if (from < 0 || from === idx) {
    dragIndex.value = -1;
    dragOverIndex.value = -1;
    return;
  }
  pushUndo();
  const [item] = fields.value.splice(from, 1);
  fields.value.splice(idx, 0, item);
  // Adjust panel index
  if (panelIndex.value === from) panelIndex.value = idx;
  else if (from < panelIndex.value && idx >= panelIndex.value)
    panelIndex.value--;
  else if (from > panelIndex.value && idx <= panelIndex.value)
    panelIndex.value++;
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}
function onDragEnd() {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
}

// ── Undo / Redo ────────────────────────────────────────────────────────────
const undoStack = ref([]);
const redoStack = ref([]);
const MAX_HISTORY = 50;

function getBuilderSnapshot() {
  return JSON.stringify({
    fields: clonePlain(fields.value, []),
    details: clonePlain(details.value, []),
    landingConfig: clonePlain(landingConfig.value, []),
    printConfig: clonePlain(
      printConfig.value,
      createDefaultPrintConfig(
        fields.value,
        details.value,
        config.value?.readableName || "Dokumen",
      ),
    ),
    columnLayout: columnLayout.value,
    wizardSteps: clonePlain(wizardSteps.value, []),
  });
}

function restoreBuilderSnapshot(snapshotText) {
  const snapshot = JSON.parse(snapshotText);
  fields.value = Array.isArray(snapshot.fields) ? snapshot.fields : [];
  details.value = Array.isArray(snapshot.details) ? snapshot.details : [];
  landingConfig.value = Array.isArray(snapshot.landingConfig)
    ? snapshot.landingConfig
    : [];
  printConfig.value = normalizePrintConfig(
    snapshot.printConfig,
    fields.value,
    details.value,
    config.value?.readableName || "Dokumen",
  );
  columnLayout.value = Number(snapshot.columnLayout || 2);
  wizardSteps.value = Array.isArray(snapshot.wizardSteps)
    ? snapshot.wizardSteps
    : [];
}

function pushUndo() {
  undoStack.value.push(getBuilderSnapshot());
  if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift();
  redoStack.value = []; // new action clears redo
}

function undo() {
  if (!undoStack.value.length) return;
  redoStack.value.push(getBuilderSnapshot());
  const prev = undoStack.value.pop();
  restoreBuilderSnapshot(prev);
  closePanel();
  closeDetailPanel();
  toast.info("Undo");
}

function redo() {
  if (!redoStack.value.length) return;
  undoStack.value.push(getBuilderSnapshot());
  const next = redoStack.value.pop();
  restoreBuilderSnapshot(next);
  closePanel();
  closeDetailPanel();
  toast.info("Redo");
}

// Ctrl+Z / Ctrl+Y keyboard shortcut
onMounted(() => {
  const handler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.key === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      redo();
    }
  };
  window.addEventListener("keydown", handler);
  onUnmounted(() => window.removeEventListener("keydown", handler));
});

// ── Search / Filter Fields ─────────────────────────────────────────────────
const searchQuery = ref("");
const filteredFieldIndices = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return fields.value.map((_, i) => i);
  return fields.value.reduce((acc, f, i) => {
    const match =
      (f.label || "").toLowerCase().includes(q) ||
      (f.field || "").toLowerCase().includes(q) ||
      (f.type || "").toLowerCase().includes(q);
    if (match) acc.push(i);
    return acc;
  }, []);
});

// ── Duplicate Field Detection ──────────────────────────────────────────────
const duplicateFieldNames = computed(() => {
  const counts = {};
  const dupes = new Set();
  fields.value.forEach((f) => {
    const entry = getRegistryEntry(f.type);
    if (
      entry?.isSpace ||
      entry?.isSection ||
      entry?.isFieldGroup ||
      entry?.isFieldGroupEnd
    )
      return;
    const name = (f.field || "").trim();
    if (!name) return;
    if (counts[name]) dupes.add(name);
    else counts[name] = true;
  });
  return dupes;
});

// ── Bulk Select ────────────────────────────────────────────────────────────
const bulkMode = ref(false);
const selectedFields = ref(new Set());

function toggleBulkMode() {
  bulkMode.value = !bulkMode.value;
  if (!bulkMode.value) selectedFields.value = new Set();
}

function toggleFieldSelect(idx) {
  const s = new Set(selectedFields.value);
  if (s.has(idx)) s.delete(idx);
  else s.add(idx);
  selectedFields.value = s;
}

function selectAllFields() {
  selectedFields.value = new Set(fields.value.map((_, i) => i));
}

function deselectAllFields() {
  selectedFields.value = new Set();
}

function bulkDelete() {
  if (!selectedFields.value.size) return;
  pushUndo();
  const indices = [...selectedFields.value].sort((a, b) => b - a);
  indices.forEach((i) => fields.value.splice(i, 1));
  selectedFields.value = new Set();
  closePanel();
  toast.success(`${indices.length} field dihapus`);
}

function bulkSetReadonly(val) {
  if (!selectedFields.value.size) return;
  pushUndo();
  selectedFields.value.forEach((i) => {
    if (fields.value[i]) fields.value[i].readonly = val;
  });
  toast.success(
    `${selectedFields.value.size} field di-set ${val ? "readonly" : "editable"}`,
  );
}

function bulkSetRequired(val) {
  if (!selectedFields.value.size) return;
  pushUndo();
  selectedFields.value.forEach((i) => {
    if (fields.value[i]) fields.value[i].required = val;
  });
  toast.success(
    `${selectedFields.value.size} field di-set ${val ? "required" : "optional"}`,
  );
}

// ── Wizard Steps ───────────────────────────────────────────────────────────
const savedWizardSteps = useCookie("builder_wizard_steps", {
  default: () => null,
  maxAge: 60 * 60 * 24,
});
const wizardSteps = ref(savedWizardSteps.value || []);
watch(
  wizardSteps,
  (v) => {
    savedWizardSteps.value = v;
  },
  { deep: true },
);

function addWizardStep() {
  wizardSteps.value.push({ label: `Step ${wizardSteps.value.length + 1}` });
}

function removeWizardStep(idx) {
  wizardSteps.value.splice(idx, 1);
  fields.value.forEach((f) => {
    if (f.step === idx) f.step = 0;
    else if (f.step > idx) f.step--;
  });
}

// ── Field Group Helpers ────────────────────────────────────────────────────
function isInsideGroup(idx) {
  let depth = 0;
  for (let i = 0; i < idx; i++) {
    const entry = getRegistryEntry(fields.value[i].type);
    if (entry?.isFieldGroup) depth++;
    if (entry?.isFieldGroupEnd) depth--;
  }
  return depth > 0;
}

// ── Preset Templates ───────────────────────────────────────────────────────
const showPresetMenu = ref(false);
// PRESET_TEMPLATES imported from ./_presets.js
function addPreset(preset) {
  pushUndo();
  const blankBase = createBlankField();
  preset.fields.forEach((pf) => {
    fields.value.push({ ...blankBase, ...pf });
  });
  showPresetMenu.value = false;
  toast.success(`${preset.name}: ${preset.fields.length} field ditambahkan`);
}

// ── Auto-Detect Fields from API ────────────────────────────────────────────
const autoDetecting = ref(false);

async function autoDetectFields() {
  if (!config.value?.apiEndpoint) {
    toast.error("API Endpoint belum tersedia");
    return;
  }
  autoDetecting.value = true;
  try {
    const result = await $fetch("/api/builder/detect-fields", {
      method: "POST",
      body: {
        apiEndpoint: config.value.apiEndpoint,
        token: builderToken,
      },
    });
    if (!result?.success || !result.fields?.length) {
      toast.warning(
        result?.message || "Tidak ada field yang terdeteksi dari API",
      );
      return;
    }
    pushUndo();
    const blankBase = createBlankField();
    const existingNames = new Set(fields.value.map((f) => f.field));
    let addedCount = 0;
    result.fields.forEach((df) => {
      if (existingNames.has(df.field)) return; // skip duplicate
      fields.value.push({ ...blankBase, ...df });
      addedCount++;
    });
    if (addedCount > 0) {
      toast.success(`${addedCount} field terdeteksi dan ditambahkan dari API`);
    } else {
      toast.info("Semua field dari API sudah ada di builder");
    }
  } catch (err) {
    toast.error(
      "Gagal auto-detect: " +
        (err?.data?.statusMessage || err?.message || "Error"),
    );
  } finally {
    autoDetecting.value = false;
  }
}

const detailPanelIndex = ref(-1);

// ── Cookie-backed state (survives refresh) ─────────────────────────────────
const DEFAULT_FIELDS = [];

const savedFields = useCookie("builder_fields", {
  default: () => null,
  maxAge: 60 * 60 * 24,
});
const savedDetails = useCookie("builder_details", {
  default: () => null,
  maxAge: 60 * 60 * 24,
});
const savedLandingConfig = useCookie("builder_landing", {
  default: () => null,
  maxAge: 60 * 60 * 24,
});
const savedPrintConfig = useCookie("builder_print", {
  default: () => null,
  maxAge: 60 * 60 * 24,
});
const savedColumnLayout = useCookie("builder_col_layout", {
  default: () => 2,
  maxAge: 60 * 60 * 24,
});

const fields = ref(
  savedFields.value && savedFields.value.length
    ? savedFields.value
    : structuredClone(DEFAULT_FIELDS),
);
const details = ref(
  savedDetails.value && savedDetails.value.length ? savedDetails.value : [],
);
const landingConfig = ref(savedLandingConfig.value || []);
const printConfig = ref(
  normalizePrintConfig(
    savedPrintConfig.value,
    fields.value,
    details.value,
    config.value?.readableName || "Dokumen",
  ),
);
const columnLayout = ref(savedColumnLayout.value || 2);

// Auto-save to cookies on change
watch(
  fields,
  (v) => {
    savedFields.value = v;
  },
  { deep: true },
);
watch(
  details,
  (v) => {
    savedDetails.value = v;
  },
  { deep: true },
);
watch(
  landingConfig,
  (v) => {
    savedLandingConfig.value = v;
  },
  { deep: true },
);
watch(
  printConfig,
  (v) => {
    savedPrintConfig.value = v;
  },
  { deep: true },
);
watch(columnLayout, (v) => {
  savedColumnLayout.value = v;
});

// Auto-sync landing config ketika fields berubah
watch(
  fields,
  (newFields) => {
    const current = landingConfig.value;
    const validFields = newFields.filter((f) => {
      const entry = getRegistryEntry(f.type);
      return !entry?.isSpace && !entry?.isSwitch && f.field?.trim();
    });
    const existingSet = new Set(current.map((c) => c.field));
    const newFieldSet = new Set(validFields.map((f) => f.field));
    // Pertahankan urutan existing yg masih ada, update label
    const result = current
      .filter((c) => newFieldSet.has(c.field))
      .map((c) => {
        const f = validFields.find((vf) => vf.field === c.field);
        return { ...c, label: f?.label || c.label };
      });
    // Tambahkan field baru yang belum ada di config
    validFields.forEach((f) => {
      if (!existingSet.has(f.field)) {
        const entry = getRegistryEntry(f.type);
        result.push({
          field: f.field,
          label: f.label || f.field,
          displayField: "",
          visible: true,
          minWidth: 140,
        });
      }
    });
    landingConfig.value = result;
  },
  { deep: true, immediate: true },
);

watch(
  [fields, details, () => config.value?.readableName],
  () => {
    printConfig.value = normalizePrintConfig(
      printConfig.value,
      fields.value,
      details.value,
      config.value?.readableName || "Dokumen",
    );
  },
  { deep: true, immediate: true },
);

function clearBuilderCookies() {
  savedFields.value = null;
  savedDetails.value = null;
  savedLandingConfig.value = null;
  savedPrintConfig.value = null;
  savedColumnLayout.value = null;
  savedWizardSteps.value = null;
}

// Dynamic grid class for column layout
const gridClass = computed(() => {
  const cols = {
    1: "grid grid-cols-1 gap-6",
    2: "grid grid-cols-1 md:grid-cols-2 gap-6",
    3: "grid grid-cols-1 md:grid-cols-3 gap-6",
  };
  return cols[columnLayout.value] || cols[2];
});
const colSpanFull = computed(() => {
  const spans = { 1: "", 2: "md:col-span-2", 3: "md:col-span-3" };
  return spans[columnLayout.value] || spans[2];
});

async function cancelBuilder() {
  clearBuilderCookies();
  fields.value = structuredClone(DEFAULT_FIELDS);
  details.value = [];
  landingConfig.value = [];
  printConfig.value = createDefaultPrintConfig(
    [],
    [],
    config.value?.readableName || "Dokumen",
  );
  closePanel();
  closeDetailPanel();
  // Delete config on server so token is invalidated
  try {
    await $fetch("/api/builder/cancel", {
      method: "POST",
      body: { token: builderToken },
    });
  } catch {}
  toast.info("Builder di-reset");
  // Redirect to home — this route is no longer accessible
  await navigateTo("/", { replace: true });
}

const confirmResetForm = ref(false)
function resetFormBuilder() {
  if (!confirmResetForm.value) {
    confirmResetForm.value = true
    setTimeout(() => { confirmResetForm.value = false }, 3000)
    return
  }
  pushUndo()
  fields.value = []
  details.value = []
  confirmResetForm.value = false
  toast.info('Form builder di-reset — Undo tersedia')
}

// ============================================================================
// LOAD CONFIG (with token validation)
// ============================================================================
onMounted(async () => {
  try {
    const data = await $fetch("/api/builder/config", {
      params: { token: builderToken },
    });
    config.value = data;

    // Auto-detect fields from endpoint if no fields exist yet
    if (!fields.value.length && data.apiEndpoint) {
      await autoDetectFields();
    }
  } catch (e) {
    configError.value =
      "Builder tidak aktif atau token tidak valid. Jalankan: node add_route.cjs <module_path>";
  }
});

// ============================================================================
// FIELD ACTIONS
// ============================================================================
function addField() {
  pushUndo();
  fields.value.push(createBlankField());
  openPanel(fields.value.length - 1);
}

function removeField(idx) {
  pushUndo();
  const entry = getRegistryEntry(fields.value[idx]?.type);
  // If removing a fieldgroup start, also remove its matching end
  if (entry?.isFieldGroup) {
    let depth = 1;
    for (let i = idx + 1; i < fields.value.length; i++) {
      const e = getRegistryEntry(fields.value[i].type);
      if (e?.isFieldGroup) depth++;
      if (e?.isFieldGroupEnd) {
        depth--;
        if (depth === 0) {
          fields.value.splice(i, 1);
          break;
        }
      }
    }
  }
  // If removing a fieldgroup end, also remove its matching start
  if (entry?.isFieldGroupEnd) {
    let depth = 1;
    for (let i = idx - 1; i >= 0; i--) {
      const e = getRegistryEntry(fields.value[i].type);
      if (e?.isFieldGroupEnd) depth++;
      if (e?.isFieldGroup) {
        depth--;
        if (depth === 0) {
          fields.value.splice(i, 1);
          idx--;
          break;
        }
      }
    }
  }
  fields.value.splice(idx, 1);
  if (panelIndex.value === idx) closePanel();
}

function moveField(idx, dir) {
  const to = idx + dir;
  if (to < 0 || to >= fields.value.length) return;
  pushUndo();
  const tmp = fields.value[idx];
  fields.value[idx] = fields.value[to];
  fields.value[to] = tmp;
  if (panelIndex.value === idx) panelIndex.value = to;
  else if (panelIndex.value === to) panelIndex.value = idx;
}

function addFieldInsideGroup(groupIdx) {
  pushUndo();
  const blank = createBlankField();
  fields.value.splice(groupIdx + 1, 0, blank);
  openPanel(groupIdx + 1);
}

function cloneField(idx) {
  pushUndo();
  const src = fields.value[idx];
  const copy = JSON.parse(JSON.stringify(src));
  copy.field = src.field ? src.field + "_copy" : "";
  copy.label = src.label ? src.label + " (Copy)" : "";
  fields.value.splice(idx + 1, 0, copy);
  openPanel(idx + 1);
  toast.success("Field diduplikasi");
}

function exportConfig() {
  const data = {
    fields: fields.value,
    details: details.value,
    landingConfig: landingConfig.value,
    printConfig: printConfig.value,
    columnLayout: columnLayout.value,
    wizardSteps: wizardSteps.value,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `builder_config_${config.value?.moduleName || "export"}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Config exported");
}

function importConfig() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      pushUndo();
      if (Array.isArray(data.fields)) fields.value = data.fields;
      if (Array.isArray(data.details)) details.value = data.details;
      if (Array.isArray(data.landingConfig))
        landingConfig.value = data.landingConfig;
      if (data.printConfig)
        printConfig.value = normalizePrintConfig(
          data.printConfig,
          data.fields || fields.value,
          data.details || details.value,
          config.value?.readableName || "Dokumen",
        );
      if (data.columnLayout) columnLayout.value = data.columnLayout;
      if (Array.isArray(data.wizardSteps)) wizardSteps.value = data.wizardSteps;
      toast.success(`Config imported: ${data.fields?.length || 0} fields`);
    } catch (err) {
      toast.error("Gagal import: file JSON tidak valid");
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
  // Recompute header formulas in case formula config changed
  computeAllFormulas();
  panelOpen.value = false;
  panelIndex.value = -1;
}

// ============================================================================
// LANDING CONFIG (composable)
// ============================================================================
const {
  moveLandingCol,
  updateLandingCol,
  landingPreviewCols,
  useRealApi,
  realApiLoading,
  realApiRows,
  apiParams,
  addApiParam,
  removeApiParam,
  fetchRealApiData,
  sampleRows,
  landingPreviewRows,
} = useLanding(landingConfig, config);

// ── API Response Viewer ────────────────────────────────────────────────────
const showApiResponse = ref(false);

// Auto-open response viewer when API data arrives
watch(
  () => realApiRows.value?.length,
  (len) => {
    if (len > 0) showApiResponse.value = true;
  },
);

// Merge all rows to build a complete object (first non-null wins per key)
function mergeRows(rows) {
  if (!rows?.length) return null;
  const merged = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const key of Object.keys(row)) {
      if (merged[key] === undefined || merged[key] === null) {
        merged[key] = row[key];
      } else if (
        merged[key] &&
        typeof merged[key] === "object" &&
        !Array.isArray(merged[key]) &&
        row[key] &&
        typeof row[key] === "object" &&
        !Array.isArray(row[key])
      ) {
        // Deep merge nested objects
        merged[key] = mergeRows([merged[key], row[key]]);
      }
    }
  }
  return merged;
}

function extractFieldPaths(obj, prefix = "") {
  const paths = [];
  if (!obj || typeof obj !== "object") return paths;
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    paths.push({
      path: fullPath,
      type: val === null ? "null" : Array.isArray(val) ? "array" : typeof val,
      sample: val,
    });
    if (val && typeof val === "object" && !Array.isArray(val)) {
      paths.push(...extractFieldPaths(val, fullPath));
    }
  }
  return paths;
}

const apiResponsePaths = computed(() => {
  if (!realApiRows.value?.length) return [];
  const merged = mergeRows(realApiRows.value);
  return extractFieldPaths(merged);
});

function copyPath(path) {
  navigator.clipboard.writeText(path);
  toast.success(`Copied: ${path}`);
}

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
  // Recompute formulas for all existing rows after formula config may have changed
  const dIdx = detailPanelIndex.value;
  if (dIdx >= 0) {
    const arr = getPreviewArr(dIdx);
    arr.forEach((_, rIdx) => computeDetailRowFormulas(dIdx, rIdx));
  }
  detailPanelOpen.value = false;
  detailPanelIndex.value = -1;
}

function updateDetailAtIndex(updated) {
  details.value[detailPanelIndex.value] = updated;
}

function updateFieldAtIndex(updated) {
  const idx = panelIndex.value;
  const oldType = fields.value[idx]?.type;
  fields.value[idx] = updated;

  // Auto-insert fieldgroup_end when changing type TO fieldgroup
  if (updated.type === "fieldgroup" && oldType !== "fieldgroup") {
    const endMarker = {
      ...createBlankField(),
      type: "fieldgroup_end",
      label: "",
      field: "",
    };
    fields.value.splice(idx + 1, 0, endMarker);
  }
  // Auto-remove orphan fieldgroup_end when changing type FROM fieldgroup
  if (oldType === "fieldgroup" && updated.type !== "fieldgroup") {
    // Find matching end marker
    let depth = 1;
    for (let i = idx + 1; i < fields.value.length; i++) {
      const e = getRegistryEntry(fields.value[i].type);
      if (e?.isFieldGroup) depth++;
      if (e?.isFieldGroupEnd) {
        depth--;
        if (depth === 0) {
          fields.value.splice(i, 1);
          break;
        }
      }
    }
  }
}

// ============================================================================
// DETAIL PREVIEW (composable)
// ============================================================================
const {
  detailPreviewData,
  getPreviewArr,
  getPreviewExcludeKeys,
  handlePreviewMultiSelectAdd,
  handlePreviewAddRow,
  removePreviewRow,
  updatePreviewCell,
  clearPreviewData,
} = useDetailPreview(details);

// Watch detail field config changes → clear stale preview rows
watch(
  () =>
    details.value
      .map((d) =>
        (d.detailFields || []).map((f) => f.type + ":" + f.key).join(","),
      )
      .join("|"),
  () => {
    details.value.forEach((_, i) => clearPreviewData(i));
  },
);

// ============================================================================
// GENERATE
// ============================================================================
async function generate() {
  const empty = fields.value.filter((f) => {
    const entry = getRegistryEntry(f.type);
    if (
      entry?.isSpace ||
      entry?.isSection ||
      entry?.isFieldGroup ||
      entry?.isFieldGroupEnd
    )
      return false;
    return !f.field?.trim();
  });
  if (empty.length) {
    toast.error("Ada field yang belum memiliki Field Name!");
    return;
  }
  // Check duplicate field names
  if (duplicateFieldNames.value.size) {
    toast.error(
      `Field name duplikat: ${[...duplicateFieldNames.value].join(", ")}`,
    );
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
        printConfig: printConfig.value,
        columnLayout: columnLayout.value,
        wizardSteps: wizardSteps.value.length ? wizardSteps.value : null,
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
          <pre class="text-sm bg-muted p-3 rounded-md overflow-x-auto">
node add_route.cjs setup/m_supplier</pre
          >
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
          <NuxtLink
            :to="config?.routePath || '/'"
            class="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink class="h-4 w-4" />
            Lihat Halaman
          </NuxtLink>
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
    <div
      v-else
      class="min-h-screen bg-background transition-[padding-right] duration-[250ms]"
      :style="
        panelOpen
          ? 'padding-right:480px'
          : detailPanelOpen
            ? 'padding-right:520px'
            : ''
      "
    >
      <!-- Config bar -->
      <div
        class="border-b border-border bg-card sticky top-0 z-50 px-6 py-3 flex flex-wrap items-center gap-4 text-sm"
      >
        <span
          class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium"
          >{{ config?.modulePath }}</span
        >
        <span
          class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium"
          >{{ config?.routePath }}</span
        >
        <span
          class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium"
          >Endpoint: {{ config?.apiEndpoint }}</span
        >
        <span
          class="bg-primary text-primary-foreground px-2.5 py-1 rounded-md text-xs font-semibold"
          >{{ config?.readableName }}</span
        >

        <!-- Theme toggles + docs (matches default layout) -->
        <div class="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 gap-1 text-xs"
            :disabled="!undoStack.length"
            title="Undo (Ctrl+Z)"
            @click="undo"
          >
            <Undo2 class="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-8 gap-1 text-xs"
            :disabled="!redoStack.length"
            title="Redo (Ctrl+Y)"
            @click="redo"
          >
            <Redo2 class="h-3.5 w-3.5" />
          </Button>
          <div class="w-px h-5 bg-border" />
          <Button
            variant="ghost"
            size="sm"
            class="h-8 gap-1 text-xs"
            title="Import Config"
            @click="importConfig"
          >
            <Download class="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-8 gap-1 text-xs"
            title="Export Config"
            @click="exportConfig"
          >
            <Upload class="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Dokumentasi Builder"
            @click="docsOpen = true"
          >
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
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="form">
              <Settings2 class="h-4 w-4 mr-1.5" /> Form Builder
            </TabsTrigger>
            <TabsTrigger value="landing">
              <Table2 class="h-4 w-4 mr-1.5" /> Konfigurasi Landing
            </TabsTrigger>
            <TabsTrigger value="print">
              <Printer class="h-4 w-4 mr-1.5" /> Konfigurasi Print
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
                  Tambah {{ config?.readableName || "" }} Baru
                </h1>
                <p class="text-sm text-muted-foreground">
                  Buat data
                  {{ (config?.readableName || "").toLowerCase() }} baru
                </p>
              </div>
              <!-- Column layout selector -->
              <div
                class="ml-auto flex items-center gap-3"
              >
                <Button
                  :variant="confirmResetForm ? 'destructive' : 'outline'"
                  size="sm"
                  class="h-7 text-xs gap-1.5"
                  :title="confirmResetForm ? 'Klik sekali lagi untuk konfirmasi' : 'Reset semua field form (Undo tersedia)'"
                  @click="resetFormBuilder"
                >
                  <RefreshCw class="h-3.5 w-3.5" />
                  {{ confirmResetForm ? 'Yakin Reset Form?' : 'Reset Form' }}
                </Button>
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="font-medium">Kolom:</span>
                  <button
                    v-for="n in [1, 2, 3]"
                    :key="n"
                    class="h-7 w-7 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors"
                    :class="
                      columnLayout === n
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary hover:text-primary'
                    "
                    @click="columnLayout = n"
                  >
                    {{ n }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Duplicate Warning Banner -->
            <div
              v-if="duplicateFieldNames.size"
              class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
            >
              <AlertTriangle class="h-4 w-4 shrink-0" />
              <span
                ><strong>Field name duplikat:</strong>
                {{ [...duplicateFieldNames].join(", ") }} — perbaiki sebelum
                generate!</span
              >
            </div>

            <!-- Wizard Steps Editor -->
            <Card v-if="wizardSteps.length > 0 || true" class="border-dashed">
              <CardHeader class="py-3 px-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Footprints class="h-4 w-4 text-primary" />
                    <span class="text-sm font-semibold"
                      >Form Wizard / Multi-Step</span
                    >
                    <span class="text-xs text-muted-foreground"
                      >({{ wizardSteps.length }} step)</span
                    >
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs gap-1"
                    @click="addWizardStep"
                  >
                    <Plus class="h-3 w-3" /> Tambah Step
                  </Button>
                </div>
              </CardHeader>
              <CardContent v-if="wizardSteps.length > 0" class="pt-0 pb-3 px-4">
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="(step, si) in wizardSteps"
                    :key="si"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-muted text-sm"
                  >
                    <span
                      class="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
                      >{{ si + 1 }}</span
                    >
                    <input
                      type="text"
                      :value="step.label"
                      class="bg-transparent border-none outline-none text-xs w-24 focus:ring-0"
                      @input="wizardSteps[si].label = $event.target.value"
                    />
                    <button
                      class="text-muted-foreground hover:text-destructive"
                      @click="removeWizardStep(si)"
                    >
                      <X class="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p class="text-[10px] text-muted-foreground mt-2">
                  Assign step ke tiap field via dropdown pada card field.
                </p>
              </CardContent>
            </Card>

            <!-- Form Card (preview with real components) -->
            <Card>
              <CardHeader>
                <div class="flex items-center justify-between">
                  <div>
                    <CardTitle
                      >Informasi {{ config?.readableName || "" }}</CardTitle
                    >
                    <CardDescription>
                      Isi data
                      {{ (config?.readableName || "").toLowerCase() }} dengan
                      lengkap dan benar
                    </CardDescription>
                  </div>
                </div>
                <!-- Search + Preset + Bulk toolbar -->
                <div class="flex items-center gap-2 mt-3 flex-wrap">
                  <!-- Search bar -->
                  <div class="relative flex-1 min-w-[200px] max-w-sm">
                    <Search
                      class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                    />
                    <input
                      type="text"
                      v-model="searchQuery"
                      placeholder="Cari field... (label, nama, tipe)"
                      class="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      v-if="searchQuery"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      @click="searchQuery = ''"
                    >
                      <X class="h-3 w-3" />
                    </button>
                  </div>
                  <!-- Preset button -->
                  <div class="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 gap-1 text-xs"
                      @click="showPresetMenu = !showPresetMenu"
                    >
                      <Package class="h-3.5 w-3.5" /> Preset
                    </Button>
                    <div
                      v-if="showPresetMenu"
                      class="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-1 min-w-[260px] max-h-[420px] overflow-y-auto"
                    >
                      <div
                        v-for="(group, gIdx) in [
                          {
                            title: 'Data',
                            items: PRESET_TEMPLATES.filter((p) => !p.desc),
                          },
                          {
                            title: 'Perhitungan',
                            items: PRESET_TEMPLATES.filter((p) => p.desc),
                          },
                        ].filter((g) => g.items.length)"
                        :key="gIdx"
                      >
                        <div
                          class="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                          :class="
                            gIdx > 0 ? 'border-t border-border mt-1 pt-2' : ''
                          "
                        >
                          {{ group.title }}
                        </div>
                        <button
                          v-for="preset in group.items"
                          :key="preset.name"
                          class="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent flex items-center gap-2"
                          @click="addPreset(preset)"
                        >
                          <span class="text-base">{{ preset.icon }}</span>
                          <div class="min-w-0">
                            <div class="font-medium text-xs">
                              {{ preset.name }}
                            </div>
                            <div
                              class="text-[10px] text-muted-foreground truncate"
                            >
                              {{
                                preset.desc || preset.fields.length + " field"
                              }}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                  <!-- Auto-detect from API -->
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-8 gap-1 text-xs"
                    :disabled="autoDetecting"
                    @click="autoDetectFields"
                    title="Deteksi field otomatis dari response API"
                  >
                    <Loader2
                      v-if="autoDetecting"
                      class="h-3.5 w-3.5 animate-spin"
                    />
                    <Zap v-else class="h-3.5 w-3.5" />
                    Auto-Detect
                  </Button>
                  <!-- Bulk toggle -->
                  <Button
                    :variant="bulkMode ? 'default' : 'outline'"
                    size="sm"
                    class="h-8 gap-1 text-xs"
                    @click="toggleBulkMode"
                  >
                    <ListChecks class="h-3.5 w-3.5" /> Bulk
                  </Button>
                </div>
                <!-- Bulk action bar -->
                <div
                  v-if="bulkMode"
                  class="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs"
                >
                  <span class="text-muted-foreground font-medium"
                    >{{ selectedFields.size }} dipilih</span
                  >
                  <button
                    class="text-primary hover:underline"
                    @click="selectAllFields"
                  >
                    Pilih Semua
                  </button>
                  <button
                    class="text-primary hover:underline"
                    @click="deselectAllFields"
                  >
                    Batal Pilih
                  </button>
                  <div class="w-px h-4 bg-border" />
                  <button
                    class="text-destructive hover:underline"
                    @click="bulkDelete"
                    :disabled="!selectedFields.size"
                  >
                    Hapus
                  </button>
                  <button
                    class="hover:underline"
                    @click="bulkSetReadonly(true)"
                    :disabled="!selectedFields.size"
                  >
                    Set Readonly
                  </button>
                  <button
                    class="hover:underline"
                    @click="bulkSetReadonly(false)"
                    :disabled="!selectedFields.size"
                  >
                    Set Editable
                  </button>
                  <button
                    class="hover:underline"
                    @click="bulkSetRequired(true)"
                    :disabled="!selectedFields.size"
                  >
                    Set Required
                  </button>
                  <button
                    class="hover:underline"
                    @click="bulkSetRequired(false)"
                    :disabled="!selectedFields.size"
                  >
                    Set Optional
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div :class="gridClass">
                  <!-- Render each field with real components -->
                  <template v-for="idx in filteredFieldIndices" :key="idx">
                    <div
                      :draggable="!bulkMode"
                      @dragstart="onDragStart(idx, $event)"
                      @dragover="onDragOver(idx, $event)"
                      @dragleave="onDragLeave"
                      @drop="onDrop(idx, $event)"
                      @dragend="onDragEnd"
                      class="relative group rounded-lg pt-4 pb-3 px-3 transition-all"
                      :class="[
                        fields[idx].fullWidth ||
                        getRegistryEntry(fields[idx].type)?.isSection ||
                        getRegistryEntry(fields[idx].type)?.isFieldGroup ||
                        getRegistryEntry(fields[idx].type)?.isFieldGroupEnd
                          ? colSpanFull
                          : '',
                        panelIndex === idx
                          ? 'ring-2 ring-ring ring-offset-2 ring-offset-background bg-accent/50'
                          : 'hover:ring-2 hover:ring-ring/40 hover:ring-offset-2 hover:ring-offset-background hover:bg-accent/30',
                        fields[idx].visibleWhenField &&
                        String(
                          previewValues[fields[idx].visibleWhenField] ?? '',
                        ) !== String(fields[idx].visibleWhenValue ?? '')
                          ? 'opacity-30'
                          : '',
                        fields[idx].readonlyWhenField &&
                        !fields[idx].readonly &&
                        String(
                          previewValues[fields[idx].readonlyWhenField] ?? '',
                        ) === String(fields[idx].readonlyWhenValue ?? '')
                          ? 'opacity-60'
                          : '',
                        dragIndex === idx ? 'opacity-40 scale-95' : '',
                        dragOverIndex === idx && dragIndex !== idx
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : '',
                        isInsideGroup(idx)
                          ? 'border-l-2 border-l-primary/40 ml-2'
                          : '',
                        !bulkMode
                          ? 'cursor-grab active:cursor-grabbing'
                          : 'cursor-pointer',
                        selectedFields.has(idx)
                          ? 'ring-2 ring-primary bg-primary/5'
                          : '',
                      ]"
                      @click="bulkMode ? toggleFieldSelect(idx) : null"
                    >
                      <!-- Bulk checkbox -->
                      <div v-if="bulkMode" class="absolute top-1 left-1 z-10">
                        <component
                          :is="selectedFields.has(idx) ? CheckSquare : Square"
                          class="h-4 w-4 text-primary"
                        />
                      </div>

                      <!-- Action buttons (show on hover, hidden in bulk mode) -->
                      <div
                        v-if="!bulkMode"
                        class="absolute -top-2.5 -right-1.5 hidden group-hover:flex gap-1 z-10"
                      >
                        <button
                          class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-primary hover:border-primary flex items-center justify-center shadow-sm"
                          @click.stop="openPanel(idx)"
                          title="Edit field"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-3 w-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path
                              d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
                            />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button
                          class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-blue-500 hover:border-blue-500 flex items-center justify-center shadow-sm"
                          @click.stop="cloneField(idx)"
                          title="Duplikasi field"
                        >
                          <Copy class="h-3 w-3" />
                        </button>
                        <button
                          v-if="
                            getRegistryEntry(fields[idx].type)?.isFieldGroup
                          "
                          class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-green-500 hover:border-green-500 flex items-center justify-center shadow-sm"
                          @click.stop="addFieldInsideGroup(idx)"
                          title="Tambah field di dalam group"
                        >
                          <Plus class="h-3 w-3" />
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
                        {{ getComponentBadge(fields[idx].type) }}
                      </span>

                      <!-- Duplicate warning badge -->
                      <span
                        v-if="
                          fields[idx].field &&
                          duplicateFieldNames.has(fields[idx].field)
                        "
                        class="absolute top-0 right-2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive flex items-center gap-0.5"
                      >
                        <AlertTriangle class="w-3 h-3" /> Duplikat
                      </span>

                      <!-- VisibleWhen indicator badge -->
                      <span
                        v-if="fields[idx].visibleWhenField"
                        class="absolute top-0 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5"
                        :style="{
                          left: `${(getComponentBadge(fields[idx].type)?.length || 5) * 7 + 24}px`,
                        }"
                        :title="`Tampil jika ${fields[idx].visibleWhenField} = ${fields[idx].visibleWhenValue}`"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path
                            d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
                          />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Kondisional
                      </span>

                      <!-- RequiredWhen badge -->
                      <!-- (moved to footer row below preview) -->

                      <!-- Computed formula badge -->
                      <!-- (moved to footer row below preview) -->

                      <!-- Wizard step selector -->
                      <!-- (moved to footer row below preview) -->

                      <!-- Dynamic preview from registry -->
                      <BuilderFieldPreview
                        :field="fields[idx]"
                        :previewValues="previewValues"
                        @previewChange="
                          (fieldName, val) => onPreviewChange(fieldName, val)
                        "
                        @previewValueFull="
                          (fieldName, obj) => onPreviewValueFull(fieldName, obj)
                        "
                      />

                      <!-- Footer row: badges + wizard step (below preview, normal flow) -->
                      <div
                        v-if="
                          fields[idx].requiredWhenField ||
                          fields[idx].readonlyWhenField ||
                          (Array.isArray(fields[idx].computedFormula)
                            ? fields[idx].computedFormula.length
                            : fields[idx].computedFormula) ||
                          fields[idx].apiUrl ||
                          (Array.isArray(fields[idx].apiParams) && fields[idx].apiParams.some(p => p.key)) ||
                          fields[idx].dependsOn ||
                          fields[idx].defaultValueFrom?.field ||
                          (wizardSteps.length > 0 &&
                            !getRegistryEntry(fields[idx].type)?.isSpace &&
                            !getRegistryEntry(fields[idx].type)
                              ?.isFieldGroupEnd)
                        "
                        class="flex items-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-border/50"
                      >
                        <span
                          v-if="fields[idx].requiredWhenField"
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                          :title="`Required jika ${fields[idx].requiredWhenField} = ${fields[idx].requiredWhenValue}`"
                        >
                          Req. Kondisional
                        </span>
                        <span
                          v-if="fields[idx].readonlyWhenField"
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300 flex items-center gap-0.5"
                          :title="`Readonly jika ${fields[idx].readonlyWhenField} = ${fields[idx].readonlyWhenValue}`"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-2.5 h-2.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <rect
                              width="18"
                              height="11"
                              x="3"
                              y="11"
                              rx="2"
                              ry="2"
                            />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          Readonly Kondisional
                        </span>
                        <span
                          v-if="
                            Array.isArray(fields[idx].computedFormula)
                              ? fields[idx].computedFormula.length
                              : fields[idx].computedFormula
                          "
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 font-mono truncate max-w-[60%]"
                          :title="`Formula: ${Array.isArray(fields[idx].computedFormula) ? fields[idx].computedFormula.map((t) => t.value).join(' ') : fields[idx].computedFormula}`"
                        >
                          ƒ
                          {{
                            Array.isArray(fields[idx].computedFormula)
                              ? fields[idx].computedFormula
                                  .map((t) =>
                                    t.type === "field"
                                      ? t.value
                                      : t.value === "*"
                                        ? "×"
                                        : t.value === "/"
                                          ? "÷"
                                          : t.value,
                                  )
                                  .join(" ")
                              : fields[idx].computedFormula
                          }}
                        </span>
                        <!-- API Endpoint badge -->
                        <span
                          v-if="fields[idx].apiUrl"
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 truncate max-w-[50%]"
                          :title="`API: ${fields[idx].apiUrl}`"
                        >
                          🔗 {{ fields[idx].apiUrl }}
                        </span>
                        <!-- API Params badge -->
                        <span
                          v-if="Array.isArray(fields[idx].apiParams) && fields[idx].apiParams.some(p => p.key)"
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                          :title="`Params: ${fields[idx].apiParams.filter(p => p.key).map(p => p.key + '=' + p.value).join(', ')}`"
                        >
                          ⚙ {{ fields[idx].apiParams.filter(p => p.key).map(p => p.key + '=' + p.value).join(', ') }}
                        </span>
                        <!-- DependsOn badge -->
                        <span
                          v-if="fields[idx].dependsOn"
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                          :title="`Tergantung: ${fields[idx].dependsOn}${fields[idx].dependsOnParam ? ' → param: ' + fields[idx].dependsOnParam : ''}`"
                        >
                          🔗 → {{ fields[idx].dependsOn }}
                        </span>
                        <!-- DefaultValueFrom badge -->
                        <span
                          v-if="fields[idx].defaultValueFrom?.field"
                          class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                          :title="`Auto-fill: ${fields[idx].defaultValueFrom.field} → ${fields[idx].defaultValueFrom.property}`"
                        >
                          ⚡ {{ fields[idx].defaultValueFrom.field }}.{{ fields[idx].defaultValueFrom.property }}
                        </span>
                        <div
                          class="ml-auto"
                          v-if="
                            wizardSteps.length > 0 &&
                            !getRegistryEntry(fields[idx].type)?.isSpace &&
                            !getRegistryEntry(fields[idx].type)?.isFieldGroupEnd
                          "
                        >
                          <select
                            :value="fields[idx].step || 0"
                            class="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 focus:ring-0 focus:border-primary cursor-pointer"
                            @click.stop
                            @change.stop="
                              fields[idx].step = Number($event.target.value)
                            "
                          >
                            <option
                              v-for="(step, si) in wizardSteps"
                              :key="si"
                              :value="si"
                            >
                              S{{ si + 1 }}: {{ step.label }}
                            </option>
                          </select>
                        </div>
                      </div>

                      <!-- Add field inside group button -->
                      <div
                        v-if="
                          getRegistryEntry(fields[idx].type)?.isFieldGroup &&
                          !bulkMode
                        "
                        class="mt-2 border border-dashed border-primary/40 rounded-md p-1.5 flex items-center justify-center cursor-pointer text-primary/70 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                        @click.stop="addFieldInsideGroup(idx)"
                      >
                        <Plus class="h-3.5 w-3.5 mr-1" />
                        <span class="text-xs font-medium"
                          >Tambah Field di Group ini</span
                        >
                      </div>
                    </div>
                  </template>

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
                        <CardTitle class="text-base">{{
                          detail.tabLabel || "Detail Tab"
                        }}</CardTitle>
                        <span class="text-xs text-muted-foreground"
                          >{{ detail.responseKey || "?" }} →
                          {{ detail.payloadKey || "?" }}</span
                        >
                        <span
                          class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          :class="
                            detail.mode === 'add_to_list'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                          "
                        >
                          {{
                            detail.mode === "add_to_list"
                              ? "Add To List"
                              : "ButtonMultiSelect"
                          }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          @click="openDetailPanel(dIdx)"
                        >
                          <Settings2 class="h-3.5 w-3.5 mr-1" />
                          Konfigurasi
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 text-destructive"
                          @click="removeDetail(dIdx)"
                        >
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      <template v-if="detail.mode !== 'add_to_list'">
                        API: {{ detail.apiUrl || "-" }} · FK:
                        {{ detail.foreignKey || "-" }} ·
                        {{ (detail.detailFields || []).length }} field per baris
                      </template>
                      <template v-else>
                        {{ (detail.detailFields || []).length }} field per baris
                        (manual add)
                      </template>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <!-- Action button: ButtonMultiSelect or Tambah -->
                    <div class="flex justify-end mb-3">
                      <ButtonMultiSelect
                        v-if="detail.mode !== 'add_to_list' && detail.apiUrl"
                        :title="detail.buttonLabel || 'Pilih Item'"
                        :api="{ url: (detail.apiUrl || '').split('?')[0], params: (detail.apiParams || []).filter(p => p.key).reduce((o, p) => { o[p.key] = p.value || ''; return o }, {}) }"
                        :columns="
                          (detail.columns || [])
                            .filter((c) => c.key)
                            .map((c) => ({
                              key: c.key,
                              label: c.label,
                              sortable: true,
                              ...(c.width ? { width: c.width } : {}),
                            }))
                        "
                        :searchKey="detail.searchKey || 'name'"
                        :antiDuplicate="!!detail.antiDuplicate"
                        :excludeKeys="getPreviewExcludeKeys(dIdx)"
                        @add="
                          (items) => { handlePreviewMultiSelectAdd(dIdx, items); nextTick(() => getPreviewArr(dIdx).forEach((_, rIdx) => computeDetailRowFormulas(dIdx, rIdx))) }
                        "
                      />
                      <Button
                        v-else-if="detail.mode === 'add_to_list'"
                        variant="outline"
                        size="sm"
                        class="gap-1.5"
                        @click="handlePreviewAddRow(dIdx)"
                      >
                        <Plus class="h-4 w-4" />
                        {{ detail.buttonLabel || "Tambah" }}
                      </Button>
                      <span v-else class="text-xs text-muted-foreground italic"
                        >Isi API Endpoint dulu untuk test
                        ButtonMultiSelect</span
                      >
                    </div>

                    <!-- Detail Table with real field components -->
                    <div
                      class="w-full border border-border rounded-lg overflow-x-auto"
                    >
                      <table class="w-full text-sm">
                        <thead class="bg-muted/60">
                          <tr>
                            <th
                              class="px-2 py-2 text-center font-medium text-xs w-12"
                            >
                              No
                            </th>
                            <th
                              v-if="detail.mode !== 'add_to_list'"
                              v-for="dc in detail.displayColumns || []"
                              :key="'dch-' + dc.key"
                              class="px-2 py-2 text-left font-medium text-xs"
                            >
                              {{ dc.label || dc.key }}
                            </th>
                            <th
                              v-for="df in detail.detailFields || []"
                              :key="'dfh-' + df.key"
                              :class="getDetailFieldHeaderClass(df)"
                              :style="getDetailFieldCellStyle(df)"
                            >
                              {{ df.label || df.key }}
                            </th>
                            <th
                              class="px-2 py-2 text-center font-medium text-xs w-16"
                            >
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="!getPreviewArr(dIdx).length">
                            <td
                              :colspan="
                                1 +
                                (detail.mode !== 'add_to_list'
                                  ? (detail.displayColumns || []).length
                                  : 0) +
                                (detail.detailFields || []).length +
                                1
                              "
                              class="px-4 py-6 text-center text-muted-foreground text-sm"
                            >
                              Belum ada item ditambahkan
                            </td>
                          </tr>
                          <tr
                            v-for="(row, rIdx) in getPreviewArr(dIdx)"
                            :key="rIdx"
                            class="border-t border-border hover:bg-muted/30"
                          >
                            <td
                              class="px-2 py-2 text-center text-muted-foreground text-xs"
                            >
                              {{ rIdx + 1 }}
                            </td>
                            <td
                              v-if="detail.mode !== 'add_to_list'"
                              v-for="dc in detail.displayColumns || []"
                              :key="'dcv-' + dc.key"
                              class="px-2 py-2 text-sm text-muted-foreground"
                            >
                              {{
                                detail.foreignDisplay
                                  ? $resolveDotPath(row[detail.foreignDisplay], dc.key) || "-"
                                  : $resolveDotPath(row, dc.key) || "-"
                              }}
                            </td>
                            <td
                              v-for="df in detail.detailFields || []"
                              :key="'dfv-' + df.key"
                              :class="getDetailFieldCellClass(df)"
                              :style="getDetailFieldCellStyle(df)"
                            >
                              <FieldBox
                                v-if="df.type === 'checkbox'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :readonly="isDetailFieldReadonly(df)"
                                :labelTrue="df.labelTrue || 'Ya'"
                                :labelFalse="df.labelFalse || 'Tidak'"
                              />
                              <FieldStatus
                                v-else-if="df.type === 'status'"
                                :modelValue="row[df.key]"
                                @update:modelValue="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :readonly="isDetailFieldReadonly(df)"
                                :activeText="df.labelTrue || 'Aktif'"
                                :inactiveText="df.labelFalse || 'Tidak Aktif'"
                              />
                              <FieldSelect
                                v-else-if="df.type === 'select'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                @update:valueFull="
                                  (obj) =>
                                    onDetailPreviewValueFull(dIdx, rIdx, df.key, obj)
                                "
                                :sourceType="df.sourceType || 'api'"
                                :apiUrl="df.apiUrl || ''"
                                :displayField="df.displayField || 'name'"
                                :valueField="df.valueField || 'id'"
                                :staticOptions="df.staticOptions || []"
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldPopUp
                                v-else-if="df.type === 'popup'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                @update:valueFull="
                                  (obj) =>
                                    onDetailPreviewValueFull(dIdx, rIdx, df.key, obj)
                                "
                                :apiUrl="df.apiUrl || ''"
                                :displayField="df.displayField || 'name'"
                                :valueField="df.valueField || 'id'"
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldNumber
                                v-else-if="
                                  df.type === 'fieldnumber' ||
                                  df.type === 'fieldnumber_decimal'
                                "
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :type="
                                  df.type === 'fieldnumber_decimal'
                                    ? 'decimal'
                                    : 'integer'
                                "
                                :decimalPlaces="df.decimalPlaces ?? 2"
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldX
                                v-else-if="df.type === 'number'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                type="number"
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldDate
                                v-else-if="df.type === 'date'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldDateTime
                                v-else-if="df.type === 'datetime'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldRadio
                                v-else-if="df.type === 'radio'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :options="
                                  (df.radioOptions || []).map((o) => ({
                                    value: o.value,
                                    label: o.label || o.value,
                                  }))
                                "
                                :readonly="isDetailFieldReadonly(df)"
                              />
                              <FieldCurrency
                                v-else-if="df.type === 'currency'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :readonly="isDetailFieldReadonly(df)"
                                :decimalPlaces="df.decimalPlaces ?? 2"
                                class="w-full"
                              />
                              <FieldSlider
                                v-else-if="df.type === 'slider'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldTextarea
                                v-else-if="df.type === 'textarea'"
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                              <FieldX
                                v-else
                                :value="row[df.key]"
                                @input="
                                  (v) =>
                                    updateCellAndCompute(dIdx, rIdx, df.key, v)
                                "
                                :placeholder="df.label || df.key"
                                :readonly="isDetailFieldReadonly(df)"
                                class="w-full"
                              />
                            </td>
                            <td class="px-2 py-2 text-center">
                              <button
                                class="text-destructive hover:text-destructive/80 text-xs font-medium"
                                @click="removePreviewRow(dIdx, rIdx)"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        </tbody>
                        <!-- Footer SUM/AVG/COUNT row -->
                        <tfoot
                          v-if="(detail.detailFields || []).some(df => df.summaryType)"
                          class="border-t-2 border-border"
                        >
                          <tr class="bg-muted/40 font-semibold text-xs">
                            <td class="px-2 py-2 text-center text-muted-foreground">Σ</td>
                            <td
                              v-if="detail.mode !== 'add_to_list'"
                              v-for="dc in detail.displayColumns || []"
                              :key="'dcf-' + dc.key"
                              class="px-2 py-2"
                            ></td>
                            <td
                              v-for="df in detail.detailFields || []"
                              :key="'dft-' + df.key"
                              class="px-2 py-2 text-right"
                            >
                              <template v-if="df.summaryType === 'SUM'">
                                {{ formatDetailPreviewNumber(getPreviewArr(dIdx).reduce((acc, row) => acc + (Number(row[df.key]) || 0), 0), df) }}
                              </template>
                              <template v-else-if="df.summaryType === 'AVG'">
                                {{ getPreviewArr(dIdx).length
                                  ? formatDetailPreviewNumber(getPreviewArr(dIdx).reduce((acc, row) => acc + (Number(row[df.key]) || 0), 0) / getPreviewArr(dIdx).length, df)
                                  : 0 }}
                              </template>
                              <template v-else-if="df.summaryType === 'COUNT'">
                                {{ getPreviewArr(dIdx).filter(row => row[df.key] !== undefined && row[df.key] !== null && row[df.key] !== '').length }}
                              </template>
                            </td>
                            <td class="px-2 py-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
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
                    <CardDescription
                      >Atur kolom tabel & tampilan di halaman
                      daftar</CardDescription
                    >
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <!-- Quick hint for Display Field -->
                <div
                  class="flex items-center gap-2 mb-3 text-xs text-muted-foreground"
                >
                  <BookOpen class="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span
                    >Untuk data nested/relasi, isi
                    <strong>Display Field</strong> dengan dot-notation (misal:
                    <code
                      class="bg-muted px-1 py-0.5 rounded font-mono text-[11px]"
                      >unit_bisnis.nama_comp</code
                    >).
                    <button
                      class="text-primary hover:underline font-medium"
                      @click="docsOpen = true"
                    >
                      Lihat dokumentasi lengkap →
                    </button></span
                  >
                </div>

                <div
                  class="border border-border rounded-lg overflow-hidden text-xs"
                >
                  <!-- Table Header -->
                  <div
                    class="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_52px_52px_28px] gap-1.5 px-2.5 py-2 bg-muted font-semibold text-muted-foreground items-center"
                  >
                    <span class="text-center">#</span>
                    <span>Field</span>
                    <span>Label Kolom</span>
                    <span
                      title="Field yang ditampilkan (kosong = field asli, misal: unit_bisnis.nama_comp)"
                      >Display Field</span
                    >
                    <span class="text-center" title="Tampil di tabel desktop"
                      >Tampil</span
                    >
                    <span class="text-center" title="Min Width (px)"
                      >Width</span
                    >
                    <span></span>
                  </div>
                  <!-- Rows -->
                  <div
                    v-for="(col, i) in landingConfig"
                    :key="col.field"
                    class="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_52px_52px_28px] gap-1.5 px-2.5 py-1.5 border-t border-border items-center transition-opacity"
                    :class="!col.visible ? 'opacity-40' : ''"
                  >
                    <span class="text-center text-muted-foreground">{{
                      i + 1
                    }}</span>
                    <span
                      class="font-mono text-[11px] truncate"
                      :title="col.field"
                      >{{ col.field }}</span
                    >
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
                      @input="
                        updateLandingCol(i, 'displayField', $event.target.value)
                      "
                    />
                    <div class="flex justify-center">
                      <input
                        type="checkbox"
                        :checked="col.visible"
                        class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                        @change="
                          updateLandingCol(i, 'visible', $event.target.checked)
                        "
                      />
                    </div>
                    <input
                      type="number"
                      :value="col.minWidth"
                      min="50"
                      max="500"
                      class="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-center px-0 py-0.5 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      @input="
                        updateLandingCol(
                          i,
                          'minWidth',
                          parseInt($event.target.value) || 140,
                        )
                      "
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
                  <p
                    class="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide"
                  >
                    Preview Tabel Landing
                  </p>

                  <!-- Toolbar: Refresh + Try API -->
                  <div class="flex items-center gap-2 mb-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="
                        useRealApi = false;
                        realApiRows = [];
                      "
                    >
                      <RefreshCw class="h-3.5 w-3.5 mr-1" /> Sample Data
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      :class="useRealApi ? 'border-primary text-primary' : ''"
                      @click="useRealApi = !useRealApi"
                    >
                      <Database class="h-3.5 w-3.5 mr-1" />
                      {{
                        useRealApi ? "Mode: Real API" : "Coba dengan Real API"
                      }}
                    </Button>
                    <span
                      v-if="useRealApi && config"
                      class="text-[10px] text-muted-foreground font-mono"
                    >
                      /api/dynamic/{{ config.apiEndpoint }}
                    </span>
                  </div>

                  <!-- API Params (shown when real API mode) -->
                  <div
                    v-if="useRealApi"
                    class="rounded-lg border border-border bg-muted/50 p-3 mb-2 space-y-2"
                  >
                    <p class="text-[11px] font-medium text-muted-foreground">
                      Parameter API
                    </p>
                    <div
                      v-for="(p, pi) in apiParams"
                      :key="pi"
                      class="flex items-center gap-2"
                    >
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
                      <button
                        class="text-muted-foreground hover:text-destructive p-0.5"
                        @click="removeApiParam(pi)"
                      >
                        <X class="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div class="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-7 text-xs"
                        @click="addApiParam"
                      >
                        <Plus class="h-3 w-3 mr-1" /> Tambah Param
                      </Button>
                      <Button
                        size="sm"
                        class="h-7 text-xs"
                        :disabled="realApiLoading"
                        @click="fetchRealApiData"
                      >
                        <Loader2
                          v-if="realApiLoading"
                          class="h-3 w-3 mr-1 animate-spin"
                        />
                        <Search v-else class="h-3 w-3 mr-1" />
                        Fetch Data
                      </Button>
                      <span
                        v-if="realApiRows.length"
                        class="text-[10px] text-muted-foreground"
                      >
                        {{ realApiRows.length }} baris
                      </span>
                    </div>
                  </div>

                  <!-- API Response Structure Viewer -->
                  <div
                    v-if="realApiRows.length"
                    class="rounded-lg border border-border bg-muted/30 mb-2 overflow-hidden"
                  >
                    <button
                      class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      @click="showApiResponse = !showApiResponse"
                    >
                      <span class="flex items-center gap-1.5">
                        <Database class="h-3.5 w-3.5 text-primary" />
                        Struktur Respon API
                        <span
                          class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold"
                          >{{ apiResponsePaths.length }} fields</span
                        >
                      </span>
                      <ChevronDown
                        class="h-3.5 w-3.5 transition-transform"
                        :class="showApiResponse ? 'rotate-180' : ''"
                      />
                    </button>
                    <div v-if="showApiResponse" class="border-t border-border">
                      <!-- Field paths table -->
                      <div class="max-h-[280px] overflow-y-auto">
                        <table class="w-full text-xs">
                          <thead class="sticky top-0 bg-muted">
                            <tr class="text-muted-foreground">
                              <th class="text-left px-3 py-1.5 font-semibold">
                                Path (klik untuk copy)
                              </th>
                              <th
                                class="text-left px-3 py-1.5 font-semibold w-[70px]"
                              >
                                Type
                              </th>
                              <th class="text-left px-3 py-1.5 font-semibold">
                                Sample Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="item in apiResponsePaths"
                              :key="item.path"
                              class="border-t border-border/50 hover:bg-muted/50 cursor-pointer group"
                              @click="copyPath(item.path)"
                            >
                              <td class="px-3 py-1 font-mono text-[11px]">
                                <span
                                  class="group-hover:text-primary transition-colors"
                                  :class="
                                    item.type === 'object'
                                      ? 'text-muted-foreground/60 italic'
                                      : 'text-foreground'
                                  "
                                >
                                  {{ item.path }}
                                </span>
                                <Copy
                                  class="h-3 w-3 inline ml-1 opacity-0 group-hover:opacity-60 text-primary transition-opacity"
                                />
                              </td>
                              <td class="px-3 py-1">
                                <span
                                  class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  :class="{
                                    'bg-blue-500/10 text-blue-600':
                                      item.type === 'string',
                                    'bg-green-500/10 text-green-600':
                                      item.type === 'number',
                                    'bg-yellow-500/10 text-yellow-600':
                                      item.type === 'object',
                                    'bg-purple-500/10 text-purple-600':
                                      item.type === 'array',
                                    'bg-orange-500/10 text-orange-600':
                                      item.type === 'boolean',
                                    'bg-red-500/10 text-red-500':
                                      item.type === 'null',
                                    'bg-muted text-muted-foreground': ![
                                      'string',
                                      'number',
                                      'object',
                                      'array',
                                      'boolean',
                                      'null',
                                    ].includes(item.type),
                                  }"
                                  >{{ item.type }}</span
                                >
                              </td>
                              <td
                                class="px-3 py-1 text-muted-foreground font-mono text-[10px] truncate max-w-[300px]"
                              >
                                <template v-if="item.type === 'object'"
                                  >{ ... }</template
                                >
                                <template v-else-if="item.type === 'array'"
                                  >[{{
                                    item.sample?.length || 0
                                  }}
                                  items]</template
                                >
                                <template v-else>{{
                                  item.sample === null
                                    ? "null"
                                    : String(item.sample).substring(0, 80)
                                }}</template>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <!-- Raw JSON (first row) -->
                      <details class="border-t border-border">
                        <summary
                          class="px-3 py-1.5 text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        >
                          Raw JSON (row pertama)
                        </summary>
                        <pre
                          class="px-3 py-2 text-[10px] font-mono text-muted-foreground bg-muted/50 max-h-[200px] overflow-auto whitespace-pre-wrap break-all"
                          >{{ JSON.stringify(realApiRows[0], null, 2) }}</pre
                        >
                      </details>
                    </div>
                  </div>

                  <!-- AG Grid preview -->
                  <div
                    class="rounded-lg border border-border bg-card overflow-hidden"
                  >
                    <ClientOnly>
                      <div
                        :class="
                          isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'
                        "
                        class="w-full"
                        style="height: 220px"
                      >
                        <AgGridVue
                          class="w-full h-full"
                          :columnDefs="landingPreviewCols"
                          :rowData="landingPreviewRows"
                          :defaultColDef="{
                            sortable: true,
                            resizable: true,
                            flex: 1,
                          }"
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

          <!-- ============================================================ -->
          <!-- TAB: KONFIGURASI PRINT -->
          <!-- ============================================================ -->
          <TabsContent value="print" class="space-y-6 mt-4">
            <PrintConfigTab
              :printConfig="printConfig"
              :fields="fields"
              :details="details"
              :printableFields="printableFields"
              :printableDetails="printableDetails"
              :configTitle="config?.readableName || 'Dokumen'"
              :printTokenExamples="printTokenExamples"
              @update:printConfig="
                (v) => {
                  printConfig = v;
                }
              "
              @pushUndo="pushUndo"
            />
          </TabsContent>
        </Tabs>

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
            v-if="
              detailPanelOpen &&
              detailPanelIndex >= 0 &&
              detailPanelIndex < details.length
            "
            class="fixed top-0 right-0 z-[101] h-full w-[520px] bg-card border-l border-border shadow-xl overflow-y-auto"
          >
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-border"
            >
              <h3 class="text-base font-semibold flex items-center gap-2">
                <Layers class="h-4 w-4" />
                Konfigurasi Detail Tab
              </h3>
              <button
                class="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                @click="closeDetailPanel"
              >
                &times;
              </button>
            </div>

            <div class="p-5">
              <BuilderDetailPanel
                :detail="details[detailPanelIndex]"
                :detailIndex="detailPanelIndex"
                :allHeaderFields="fields"
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
