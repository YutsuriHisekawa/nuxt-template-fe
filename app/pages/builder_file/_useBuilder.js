import { toast } from "vue-sonner";
import {
  createBlankField,
  createBlankDetail,
  createBlankDetailTab,
  getComponentBadge,
  getRegistryEntry,
  getDetailFieldDefaultWidth,
  getDetailFieldDecimalPlaces,
  isDetailNumericFieldType,
} from "~/utils/builder/fieldRegistry";
import {
  isPrintableField as _isPrintableField,
  normalizePrintConfig,
  createDefaultPrintConfig,
} from "./builder/_usePrint";
import { useLanding } from "./_useLanding";
import { useDetailPreview } from "./_useDetailPreview";

// Resolve dot-path keys like 'm_item.kode_item' → obj.m_item.kode_item
export function $resolveDotPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

export function useBuilder() {
  const route = useRoute();
  const builderToken = route.params.token;

  // Theme for AG Grid
  const themeCookie = useCookie("theme");
  const isDark = computed(() => themeCookie.value === "dark");

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
    function clearDescendants(parentField) {
      fields.value.forEach((f) => {
        if (f.dependsOn === parentField && f.field) {
          previewValues[f.field] = "";
          clearDescendants(f.field);
        }
      });
    }
    clearDescendants(fieldName);
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
          // invalid formula
        }
      });
      if (!changed) break;
    }
  }

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
    const formulaFields = fields.value.filter((f) => {
      const tokens = Array.isArray(f.computedFormula) ? f.computedFormula : [];
      return tokens.length && f.field;
    });
    if (!formulaFields.length) return;
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
          // formula invalid
        }
      });
      if (!changed) break;
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
      detailTabs: clonePlain(detailTabs.value, []),
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
    const normalizedDetails = normalizeDetailTabs(
      snapshot.detailTabs,
      snapshot.details,
    );
    detailTabs.value = normalizedDetails.tabs;
    details.value = normalizedDetails.details;
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
    redoStack.value = [];
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
        if (existingNames.has(df.field)) return;
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

  function normalizeDetailTabs(rawTabs, rawDetails) {
    const sourceTabs = Array.isArray(rawTabs)
      ? JSON.parse(JSON.stringify(rawTabs))
      : [];
    const sourceDetails = Array.isArray(rawDetails)
      ? JSON.parse(JSON.stringify(rawDetails))
      : [];

    if (sourceTabs.length > 0) {
      const tabs = sourceTabs.map((tab, index) => ({
        id: tab?.id || createBlankDetailTab(index + 1).id,
        label: tab?.label || `Tab ${index + 1}`,
        layout: tab?.layout === "horizontal" ? "horizontal" : "vertical",
      }));
      const validIds = new Set(tabs.map((tab) => tab.id));
      const fallbackTabId = tabs[0]?.id || "";
      const dets = sourceDetails.map((detail) => ({
        ...detail,
        tabId: validIds.has(detail?.tabId) ? detail.tabId : fallbackTabId,
      }));
      return { tabs, details: dets };
    }

    if (!sourceDetails.length) {
      return { tabs: [], details: [] };
    }

    const tabs = [];
    const dets = [];
    const stackedLegacyDetails = [];

    sourceDetails.forEach((detail) => {
      if (detail?.displayMode === "stacked") {
        stackedLegacyDetails.push(detail);
        return;
      }
      const tab = createBlankDetailTab(tabs.length + 1);
      tab.label = detail?.tabLabel || `Tab ${tabs.length + 1}`;
      tabs.push(tab);
      dets.push({ ...detail, tabId: tab.id });
    });

    if (stackedLegacyDetails.length > 0) {
      const stackedTab = createBlankDetailTab(tabs.length + 1);
      if (!tabs.length) stackedTab.label = "Tab 1";
      tabs.push(stackedTab);
      stackedLegacyDetails.forEach((detail) => {
        dets.push({ ...detail, tabId: stackedTab.id });
      });
    }

    if (!tabs.length) {
      const fallbackTab = createBlankDetailTab(1);
      tabs.push(fallbackTab);
      sourceDetails.forEach((detail) => {
        dets.push({ ...detail, tabId: fallbackTab.id });
      });
    }

    return { tabs, details: dets };
  }

  function orderDetailsByTabs(sourceDetails, sourceTabs) {
    const tabs = Array.isArray(sourceTabs) ? sourceTabs : [];
    const dets = Array.isArray(sourceDetails) ? sourceDetails : [];
    const ordered = [];
    tabs.forEach((tab) => {
      dets.forEach((detail) => {
        if (detail?.tabId === tab.id) ordered.push(detail);
      });
    });
    dets.forEach((detail) => {
      if (!ordered.includes(detail)) ordered.push(detail);
    });
    return ordered;
  }

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
  const savedDetailTabs = useCookie("builder_detail_tabs", {
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
  const initialDetailState = normalizeDetailTabs(
    savedDetailTabs.value,
    savedDetails.value,
  );
  const detailTabs = ref(initialDetailState.tabs);
  const details = ref(initialDetailState.details);
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
  const orderedDetails = computed(() =>
    orderDetailsByTabs(details.value, detailTabs.value),
  );

  // Auto-save to cookies on change
  watch(fields, (v) => { savedFields.value = v; }, { deep: true });
  watch(details, (v) => { savedDetails.value = v; }, { deep: true });
  watch(detailTabs, (v) => { savedDetailTabs.value = v; }, { deep: true });
  watch(landingConfig, (v) => { savedLandingConfig.value = v; }, { deep: true });
  watch(printConfig, (v) => { savedPrintConfig.value = v; }, { deep: true });
  watch(columnLayout, (v) => { savedColumnLayout.value = v; });

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
      const result = current
        .filter((c) => newFieldSet.has(c.field))
        .map((c) => {
          const f = validFields.find((vf) => vf.field === c.field);
          return { ...c, label: f?.label || c.label };
        });
      validFields.forEach((f) => {
        if (!existingSet.has(f.field)) {
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
    savedDetailTabs.value = null;
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
    detailTabs.value = [];
    details.value = [];
    landingConfig.value = [];
    printConfig.value = createDefaultPrintConfig(
      [],
      [],
      config.value?.readableName || "Dokumen",
    );
    closePanel();
    closeDetailPanel();
    try {
      await $fetch("/api/builder/cancel", {
        method: "POST",
        body: { token: builderToken },
      });
    } catch {}
    toast.info("Builder di-reset");
    await navigateTo("/", { replace: true });
  }

  const confirmResetForm = ref(false);
  function resetFormBuilder() {
    if (!confirmResetForm.value) {
      confirmResetForm.value = true;
      setTimeout(() => { confirmResetForm.value = false; }, 3000);
      return;
    }
    pushUndo();
    fields.value = [];
    detailTabs.value = [];
    details.value = [];
    confirmResetForm.value = false;
    toast.info("Form builder di-reset — Undo tersedia");
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
      detailTabs: detailTabs.value,
      details: orderedDetails.value,
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
        const normalizedDetails = normalizeDetailTabs(
          data.detailTabs,
          data.details,
        );
        detailTabs.value = normalizedDetails.tabs;
        details.value = normalizedDetails.details;
        if (Array.isArray(data.landingConfig))
          landingConfig.value = data.landingConfig;
        if (data.printConfig)
          printConfig.value = normalizePrintConfig(
            data.printConfig,
            data.fields || fields.value,
            normalizedDetails.details,
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
    computeAllFormulas();
    panelOpen.value = false;
    panelIndex.value = -1;
  }

  // ============================================================================
  // LANDING CONFIG (composable)
  // ============================================================================
  const landing = useLanding(landingConfig, config);

  // ── API Response Viewer ────────────────────────────────────────────────────
  const showApiResponse = ref(false);

  watch(
    () => landing.realApiRows.value?.length,
    (len) => {
      if (len > 0) showApiResponse.value = true;
    },
  );

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
    if (!landing.realApiRows.value?.length) return [];
    const merged = mergeRows(landing.realApiRows.value);
    return extractFieldPaths(merged);
  });

  function copyPath(path) {
    navigator.clipboard.writeText(path);
    toast.success(`Copied: ${path}`);
  }

  // ============================================================================
  // DETAIL TAB ACTIONS
  // ============================================================================
  const activeDetailTab = ref("");
  const activeDetailTabConfig = computed(
    () =>
      detailTabs.value.find((tab) => tab.id === activeDetailTab.value) ||
      detailTabs.value[0] ||
      null,
  );
  const activeTabDetails = computed(() =>
    details.value
      .map((detail, index) => ({ ...detail, _origIdx: index }))
      .filter((detail) => detail.tabId === activeDetailTab.value),
  );
  const activeDetailLayoutClass = computed(() =>
    activeDetailTabConfig.value?.layout === "horizontal"
      ? "grid grid-cols-1 xl:grid-cols-2 gap-4"
      : "flex flex-col gap-4",
  );

  watch(
    detailTabs,
    (tabs) => {
      if (!tabs.length) {
        activeDetailTab.value = "";
        if (detailPanelOpen.value) closeDetailPanel();
        return;
      }
      if (!tabs.some((tab) => tab.id === activeDetailTab.value)) {
        activeDetailTab.value = tabs[0].id;
      }
    },
    { deep: true, immediate: true },
  );

  function addDetailTab() {
    pushUndo();
    const tab = createBlankDetailTab(detailTabs.value.length + 1);
    detailTabs.value.push(tab);
    activeDetailTab.value = tab.id;
  }

  function updateActiveDetailTab(key, value) {
    const idx = detailTabs.value.findIndex((tab) => tab.id === activeDetailTab.value);
    if (idx < 0) return;
    detailTabs.value[idx] = {
      ...detailTabs.value[idx],
      [key]: value,
    };
  }

  function removeActiveDetailTab() {
    if (!activeDetailTab.value) return;
    const removedTabId = activeDetailTab.value;
    const currentTabIndex = detailTabs.value.findIndex(
      (tab) => tab.id === removedTabId,
    );
    const removedDetailIndexes = details.value
      .map((detail, index) => (detail.tabId === removedTabId ? index : -1))
      .filter((index) => index >= 0);

    pushUndo();
    details.value = details.value.filter((detail) => detail.tabId !== removedTabId);
    detailTabs.value = detailTabs.value.filter((tab) => tab.id !== removedTabId);

    if (detailPanelIndex.value >= 0) {
      if (removedDetailIndexes.includes(detailPanelIndex.value)) {
        closeDetailPanel();
      } else {
        const shift = removedDetailIndexes.filter(
          (index) => index < detailPanelIndex.value,
        ).length;
        detailPanelIndex.value -= shift;
      }
    }

    if (detailTabs.value.length > 0) {
      const nextTabIndex = Math.min(currentTabIndex, detailTabs.value.length - 1);
      activeDetailTab.value = detailTabs.value[nextTabIndex].id;
    } else {
      activeDetailTab.value = "";
    }
  }

  function addDetailToActiveTab() {
    if (!activeDetailTab.value) {
      toast.info("Tambah tab dulu sebelum menambah detail");
      return;
    }
    pushUndo();
    details.value.push({
      ...createBlankDetail(),
      tabId: activeDetailTab.value,
    });
    openDetailPanel(details.value.length - 1);
  }

  function removeDetail(idx) {
    pushUndo();
    details.value.splice(idx, 1);
    if (detailPanelIndex.value === idx) closeDetailPanel();
    else if (detailPanelIndex.value > idx) detailPanelIndex.value -= 1;
  }

  function openDetailPanel(idx) {
    closePanel();
    detailPanelIndex.value = idx;
    detailPanelOpen.value = true;
  }
  function closeDetailPanel() {
    const dIdx = detailPanelIndex.value;
    if (dIdx >= 0) {
      const arr = getPreviewArr(dIdx);
      arr.forEach((_, rIdx) => computeDetailRowFormulas(dIdx, rIdx));
    }
    detailPanelOpen.value = false;
    detailPanelIndex.value = -1;
  }

  function updateDetailAtIndex(updated) {
    const idx = detailPanelIndex.value;
    if (idx < 0) return;
    details.value[idx] = {
      ...updated,
      tabId: details.value[idx]?.tabId || activeDetailTab.value || "",
    };
  }

  function updateFieldAtIndex(updated) {
    const idx = panelIndex.value;
    const oldType = fields.value[idx]?.type;
    fields.value[idx] = updated;

    if (updated.type === "fieldgroup" && oldType !== "fieldgroup") {
      const endMarker = {
        ...createBlankField(),
        type: "fieldgroup_end",
        label: "",
        field: "",
      };
      fields.value.splice(idx + 1, 0, endMarker);
    }
    if (oldType === "fieldgroup" && updated.type !== "fieldgroup") {
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
          detailTabs: detailTabs.value,
          details: orderedDetails.value,
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

  return {
    builderToken,
    isDark,
    // State
    config, configError, generating, generated, generatedMessage,
    panelOpen, panelIndex, docsOpen,
    previewValues,
    detailPanelOpen, detailPanelIndex,
    dragIndex, dragOverIndex,
    undoStack, redoStack,
    searchQuery, filteredFieldIndices,
    duplicateFieldNames,
    bulkMode, selectedFields,
    wizardSteps, showPresetMenu, autoDetecting,
    fields, details, detailTabs, landingConfig, printConfig, columnLayout,
    orderedDetails, activeDetailTab,
    showApiResponse, confirmResetForm,
    // Computed
    printableFields, printableDetails, printTokenExamples,
    gridClass, colSpanFull,
    activeDetailTabConfig, activeTabDetails, activeDetailLayoutClass,
    apiResponsePaths,
    // Landing
    ...landing,
    // Detail Preview
    detailPreviewData, getPreviewArr, getPreviewExcludeKeys,
    handlePreviewMultiSelectAdd, handlePreviewAddRow, removePreviewRow,
    updatePreviewCell, clearPreviewData,
    // Methods
    onPreviewChange, onPreviewValueFull, onDetailPreviewValueFull,
    computeDetailRowFormulas, updateCellAndCompute,
    isDetailFieldReadonly, getDetailFieldWidth, getDetailFieldCellStyle,
    getDetailFieldHeaderClass, getDetailFieldCellClass, formatDetailPreviewNumber,
    computeAllFormulas,
    onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
    pushUndo, undo, redo,
    toggleBulkMode, toggleFieldSelect, selectAllFields, deselectAllFields,
    bulkDelete, bulkSetReadonly, bulkSetRequired,
    addWizardStep, removeWizardStep,
    isInsideGroup, addPreset, autoDetectFields,
    addField, removeField, moveField, addFieldInsideGroup, cloneField,
    exportConfig, importConfig,
    openPanel, closePanel,
    cancelBuilder, resetFormBuilder, generate,
    addDetailTab, updateActiveDetailTab, removeActiveDetailTab,
    addDetailToActiveTab, removeDetail,
    openDetailPanel, closeDetailPanel,
    updateDetailAtIndex, updateFieldAtIndex,
    mergeRows, extractFieldPaths, copyPath,
    // Re-export utilities for sub-components
    getRegistryEntry, getComponentBadge,
  };
}
