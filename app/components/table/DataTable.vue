<script setup lang="js">
import { AgGridVue } from "ag-grid-vue3"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Edit,
  Copy,
  Printer,
  Send,
  FileDown,
  DollarSign,
} from "lucide-vue-next"

// Icon mapping
const iconMap = {
  trash: Trash2,
  eye: Eye,
  edit: Edit,
  copy: Copy,
  print: Printer,
  printer: Printer,
  post: Send,
  send: Send,
  "location-arrow": Send,
  locationarrow: Send,
  export: FileDown,
  download: FileDown,
  rate: DollarSign,
  dollar: DollarSign,
}

const props = defineProps({
  columnDefs: { type: Array, required: true },
  rowData: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  quickFilterText: { type: String, default: "" },
  searchFields: { type: [Array, String], default: null },
  height: { type: String, default: "70vh" },
  rowSelection: { type: String, default: "single" },
  defaultColDef: {
    type: Object,
    default: () => ({
      sortable: true,
      filter: true,
      floatingFilter: true,
      floatingFilterComponentParams: { suppressFilterButton: true },
      suppressMenu: true,
      resizable: true,
      flex: 1,
    }),
  },
  // Pagination props
  pagination: { type: Object, default: null },
  pageSize: { type: Number, default: 25 },
  pageSizeOptions: { type: Array, default: () => [25, 50, 100, 500] },
  // Actions props
  actions: { type: Array, default: () => [] },
  actionsWidth: { type: Number, default: 150 },
  actionsPlacement: { type: String, default: "column" },
  // Search props
  showSearch: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: "Search..." },
  // Create button props
  showRowNumber: { type: Boolean, default: false },
  showCreateButton: { type: Boolean, default: false },
  createButtonText: { type: String, default: "Create New" },
})

const emit = defineEmits([
  "row-clicked",
  "row-double-clicked",
  "selection-changed",
  "grid-ready",
  "page-change",
  "page-size-change",
  "search-change",
  "create",
  "action",
  "request",
])

// Search input state
const searchInput = ref("")
const gridApi = ref(null)
const selectedRow = ref(null)

// Internal pagination/search state management
const internalPage = ref(1)
const internalPageSize = ref(props.pageSize)
const internalSearch = ref("")

// Column floating filter state (per-column search from ag-grid header filters)
const columnFilterSearch = ref("") // current search value from column filter
const columnFilterField = ref("")  // current searchfield from column filter
let filterDebounceTimer = null

const themeCookie = useCookie("theme")
const isDark = computed(() => themeCookie.value === "dark")

const hasPagination = computed(() => props.pagination !== null)
const currentPage = computed(() => internalPage.value)
const totalPages = computed(() =>
  props.pagination?.total_pages ?? props.pagination?.totalPages ?? 1
)
const totalItems = computed(() => props.pagination?.total ?? 0)
const perPage = computed(() => internalPageSize.value)
const showToolbarActions = computed(
  () => props.actionsPlacement === "toolbar" && props.actions.length > 0
)
const resolvedSearchFields = computed(() => {
  // Priority 1: explicit searchFields prop (override)
  if (Array.isArray(props.searchFields) && props.searchFields.length > 0) {
    return props.searchFields.filter(Boolean).join(",")
  }
  if (typeof props.searchFields === "string" && props.searchFields.trim()) {
    return props.searchFields.trim()
  }
  // Priority 2: auto-extract from columnDefs (smart mode)
  const skipFields = new Set(["__actions"])
  const skipPatterns = /^is_|^has_|^flag_/
  const fields = (props.columnDefs || [])
    .filter((col) => {
      if (!col?.field) return false
      if (skipFields.has(col.field)) return false
      // Skip boolean/status fields by field name pattern
      if (skipPatterns.test(col.field)) return false
      // Skip columns explicitly marked as non-filterable
      if (col.filter === false) return false
      // Skip columns with cellRenderer that renders boolean/status (Aktif/Nonaktif, Ya/Tidak)
      if (col.cellRenderer && typeof col.cellRenderer === "function") {
        try {
          const fnStr = col.cellRenderer.toString()
          if (/is_active|isActive/.test(fnStr) && /Aktif|Nonaktif|Ya|Tidak/i.test(fnStr)) return false
        } catch (_) { /* ignore */ }
      }
      return true
    })
    .map((col) => {
      // Support explicit searchField per colDef (e.g. for joined table dot-path)
      if (col.searchField) return col.searchField
      return col.field
    })
    .filter((field) => typeof field === "string" && field.length > 0)
  return Array.from(new Set(fields)).join(",")
})

const startItem = computed(() => {
  if (!hasPagination.value || totalItems.value === 0) return 0
  return (currentPage.value - 1) * perPage.value + 1
})
const endItem = computed(() => {
  if (!hasPagination.value) return 0
  return Math.min(currentPage.value * perPage.value, totalItems.value)
})

// Build a map from colDef field → searchField (for joined table dot-path support)
const buildSearchFieldMap = () => {
  const map = {}
  ;(props.columnDefs || []).forEach((col) => {
    if (!col?.field) return
    if (col.searchField) {
      map[col.field] = col.searchField
    }
  })
  return map
}

const emitRequest = () => {
  // Column filter takes priority over toolbar search
  const hasColumnFilter = columnFilterSearch.value && columnFilterField.value
  emit("request", {
    page: internalPage.value,
    pageSize: internalPageSize.value,
    search: hasColumnFilter ? columnFilterSearch.value : internalSearch.value,
    searchfield: hasColumnFilter ? columnFilterField.value : resolvedSearchFields.value,
  })
}

const refresh = (resetPage = true) => {
  if (resetPage) internalPage.value = 1
  emitRequest()
}

// Refresh button handler — clears all search/filter state and reloads
const handleRefresh = () => {
  searchInput.value = ""
  internalSearch.value = ""
  columnFilterSearch.value = ""
  columnFilterField.value = ""
  internalPage.value = 1
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
  emitRequest()
}

defineExpose({ refresh })

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value && page !== internalPage.value) {
    internalPage.value = page
    emit("page-change", page)
    emitRequest()
  }
}
const changePageSize = (size) => {
  internalPageSize.value = Number(size)
  internalPage.value = 1
  emit("page-size-change", Number(size))
  emitRequest()
}

const onGridReady = (params) => {
  gridApi.value = params.api
  emit("grid-ready", params)
}

// Handle ag-grid floating filter (column header filter) changes
const onFilterChanged = () => {
  if (!gridApi.value) return

  if (filterDebounceTimer) clearTimeout(filterDebounceTimer)

  filterDebounceTimer = setTimeout(() => {
    const filterModel = gridApi.value.getFilterModel()
    const searchFieldMap = buildSearchFieldMap()

    // Find the first column with an active filter value
    let filterValue = ""
    let filterField = ""

    for (const [colField, model] of Object.entries(filterModel)) {
      if (model && model.filter && typeof model.filter === "string" && model.filter.trim()) {
        filterValue = model.filter.trim()
        // Map to searchField if defined, otherwise use colField
        filterField = searchFieldMap[colField] || colField
        break
      }
    }

    columnFilterSearch.value = filterValue
    columnFilterField.value = filterField

    // Reset to page 1 and hit API
    internalPage.value = 1
    emitRequest()
  }, 300)
}
const onRowClicked = (params) => emit("row-clicked", params)
const onRowDoubleClicked = (params) => emit("row-double-clicked", params)
const onSelectionChanged = (params) => {
  emit("selection-changed", params)
  const rows = params.api?.getSelectedRows?.() || []
  selectedRow.value = rows[0] || null
}

watch(
  () => props.quickFilterText,
  (value) => {
    if (typeof value === "string") {
      searchInput.value = value
    }
  },
  { immediate: true }
)

// Get icon component from icon name
const getIconComponent = (iconName) => {
  if (!iconName) return null
  const name = iconName.toLowerCase()
  return iconMap[name] || iconMap[name.replace(/-/g, "")] || null
}

const defaultVariantByIcon = (iconName) => {
  const name = (iconName || "").toLowerCase()
  if (name === "trash") return "destructive"
  if (name === "edit") return "primary"
  if (name === "eye") return "secondary"
  if (name === "copy") return "outline"
  if (name === "print" || name === "printer") return "secondary"
  if (name === "post" || name === "send" || name === "location-arrow") return "primary"
  if (name === "export" || name === "download") return "outline"
  if (name === "rate" || name === "dollar") return "secondary"
  return "outline"
}

const getActionVariant = (action) => {
  return action?.variant || defaultVariantByIcon(action?.icon)
}

const getActionClasses = (action, disabled = false) => {
  if (action?.class) {
    return action.class
  }

  const sizeClass =
    action?.size === "sm"
      ? "h-7 w-7"
      : action?.size === "lg"
        ? "h-10 w-10"
        : "h-8 w-8"

  const base = `inline-flex ${sizeClass} items-center justify-center rounded-md text-sm border transition-colors shadow-sm`
  const variant = getActionVariant(action)

  const variants = {
    primary: "bg-primary text-primary-foreground border-transparent hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80",
    destructive:
      "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90",
    outline: "bg-background text-foreground border-border hover:bg-accent",
    ghost: "bg-transparent text-foreground border-transparent hover:bg-accent",
  }

  const state = disabled ? " opacity-50 cursor-not-allowed" : ""
  return `${base} ${variants[variant] || variants.outline}${state}`
}

// Check if action should be shown for row
const shouldShowAction = (action, row) => {
  if (typeof action.show === "function") {
    return action.show(row)
  }
  return action.show !== false
}

// Handle action click
const handleActionClick = (action, row, event) => {
  event.stopPropagation()
  if (typeof action.click === "function") {
    action.click(row)
  }
  emit("action", { action, row })
}

const handleToolbarActionClick = (action) => {
  if (!selectedRow.value) return
  if (typeof action.click === "function") {
    action.click(selectedRow.value)
  }
  emit("action", { action, row: selectedRow.value })
}

const isToolbarActionDisabled = (action) => {
  if (!selectedRow.value) return true
  if (typeof action.disabled === "function") {
    return action.disabled(selectedRow.value)
  }
  return action.disabled === true
}

const isToolbarActionVisible = (action) => {
  if (!selectedRow.value) return true
  return shouldShowAction(action, selectedRow.value)
}

// Computed columns with actions
const computedColumnDefs = computed(() => {
  let cols = [...props.columnDefs]

  // Auto-prepend row number column
  if (props.showRowNumber) {
    cols.unshift({
      headerName: "No",
      valueGetter: (params) => {
        const base = (internalPage.value - 1) * internalPageSize.value
        return base + (params.node?.rowIndex ?? 0) + 1
      },
      width: 70,
      sortable: false,
      filter: false,
      floatingFilter: false,
      resizable: false,
      pinned: "left",
    })
  }

  if (
    !props.actions ||
    props.actions.length === 0 ||
    props.actionsPlacement === "toolbar"
  ) {
    return cols
  }

  const actionColumn = {
    headerName: "Actions",
    field: "__actions",
    width: props.actionsWidth,
    sortable: false,
    filter: false,
    floatingFilter: false,
    resizable: false,
    pinned: "right",
    cellRenderer: (params) => {
      const row = params.data
      if (!row) return null

      const container = document.createElement("div")
      container.className = "flex items-center justify-center gap-1 h-full"

      props.actions.forEach((action) => {
        if (!shouldShowAction(action, row)) return

        const btn = document.createElement("button")
        btn.className = getActionClasses(action, false)
        btn.title = action.title || ""
        btn.onclick = (e) => handleActionClick(action, row, e)

        const IconComp = getIconComponent(action.icon)
        if (IconComp) {
          const iconEl = document.createElement("span")
          iconEl.className = "h-4 w-4 flex items-center justify-center"
          iconEl.innerHTML = getIconSvg(action.icon)
          btn.appendChild(iconEl)
        } else {
          btn.textContent = action.title?.charAt(0) || "?"
        }

        container.appendChild(btn)
      })

      return container
    },
  }

  return [...cols, actionColumn]
})

// Get SVG for icon
const getIconSvg = (iconName) => {
  const svgMap = {
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    eye: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    copy: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    print: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>',
    printer: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>',
    post: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    send: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    "location-arrow": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    export: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    download: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    rate: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    dollar: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    add: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  }
  return svgMap[iconName] || svgMap[iconName?.toLowerCase()] || ""
}

// Search submit handler
const onSearchSubmit = () => {
  internalSearch.value = searchInput.value.trim()
  internalPage.value = 1
  // Clear column filter state so toolbar search takes priority
  columnFilterSearch.value = ""
  columnFilterField.value = ""
  // Also clear ag-grid filter model to avoid conflict
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
  emit("search-change", {
    search: internalSearch.value,
    searchfield: resolvedSearchFields.value,
  })
  emitRequest()
}

onMounted(emitRequest)

let searchTimer = null
watch(
  () => [props.quickFilterText, resolvedSearchFields.value],
  ([search]) => {
    if (searchTimer) {
      clearTimeout(searchTimer)
    }
    searchTimer = setTimeout(() => {
      emit("search-change", {
        search: typeof search === "string" ? search.trim() : "",
        searchfield: resolvedSearchFields.value,
      })
    }, 300)
  }
)
</script>

<template>
  <ClientOnly>
    <!-- Toolbar: Search & Create Button -->
    <div
      v-if="showSearch || showCreateButton || showToolbarActions"
      class="flex flex-wrap items-center gap-3 mb-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <form
          v-if="showSearch"
          class="flex w-full items-center gap-2 sm:w-72"
          @submit.prevent="onSearchSubmit"
        >
          <input
            v-model="searchInput"
            type="text"
            :placeholder="searchPlaceholder"
            class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Search"
          >
            <Search class="h-4 w-4" />
          </button>
        </form>

        <div v-if="showToolbarActions" class="flex items-center gap-2">
          <button
            v-for="(action, index) in actions"
            :key="index"
            type="button"
            :disabled="isToolbarActionDisabled(action)"
            :title="selectedRow ? action.title || '' : 'Pilih baris dulu'"
            :class="getActionClasses(action, isToolbarActionDisabled(action))"
            v-show="isToolbarActionVisible(action)"
            @click="handleToolbarActionClick(action)"
          >
            <component
              v-if="getIconComponent(action.icon)"
              :is="getIconComponent(action.icon)"
              class="h-4 w-4"
            />
            <span v-else class="text-xs font-medium">
              {{ action.title?.charAt(0) || '?' }}
            </span>
          </button>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Refresh data"
          :disabled="loading"
          @click="handleRefresh"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button
          v-if="showCreateButton"
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          @click="emit('create')"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1z"
            />
          </svg>
          {{ createButtonText }}
        </button>
      </div>
    </div>

    <AgGridVue
      :class="isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'"
      :style="{ height }"
      class="w-full"
      :columnDefs="computedColumnDefs"
      :rowData="rowData"
      :defaultColDef="defaultColDef"
      :animateRows="true"
      :rowSelection="rowSelection"
      :quickFilterText="quickFilterText"
      :loading="loading"
      @grid-ready="onGridReady"
      @filter-changed="onFilterChanged"
      @row-clicked="onRowClicked"
      @row-double-clicked="onRowDoubleClicked"
      @selection-changed="onSelectionChanged"
    />

    <!-- Pagination Bar -->
    <div
      v-if="hasPagination"
      class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-sm text-muted-foreground"
    >
      <!-- Left: Page size selector -->
      <div class="flex items-center gap-2">
        <span class="text-xs">Rows:</span>
        <select
          :value="perPage"
          class="h-7 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
          @change="changePageSize($event.target.value)"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </div>

      <!-- Center: Info -->
      <div class="flex items-center gap-2">
        <span v-if="totalItems > 0">
          {{ startItem }}-{{ endItem }} of {{ totalItems }}
        </span>
        <span v-else>No data</span>
      </div>

      <!-- Right: Page navigation -->
      <div class="flex items-center gap-1">
        <button
          class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="currentPage <= 1"
          title="First page"
          @click="goToPage(1)"
        >
          <ChevronsLeft class="h-4 w-4" />
        </button>
        <button
          class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="currentPage <= 1"
          title="Previous page"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>

        <span class="px-2 text-xs font-medium">
          {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="currentPage >= totalPages"
          title="Next page"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
        <button
          class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
          :disabled="currentPage >= totalPages"
          title="Last page"
          @click="goToPage(totalPages)"
        >
          <ChevronsRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </ClientOnly>
</template>
