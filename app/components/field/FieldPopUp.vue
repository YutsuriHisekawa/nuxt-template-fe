<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AgGridVue } from 'ag-grid-vue3'
import {
  X, Loader2, Search as SearchIcon, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, RefreshCw,
} from 'lucide-vue-next'

const props = defineProps({
  label: String,
  value: [String, Number],
  modelValue: [String, Number],
  placeholder: { type: String, default: 'Pilih data...' },
  hints: String,
  errorname: { type: String, default: '', validator: (val) => ['failed', ''].includes(val) },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  class: String,
  id: String,
  /** Field dari API yang dipakai sebagai value (ID) */
  valueField: { type: String, default: 'id' },
  /** Field dari API yang ditampilkan sebagai label */
  displayField: { type: String, default: 'name' },
  /** API endpoint (relative, e.g. "/api/dynamic/money") */
  apiUrl: { type: String, default: '' },
  /** Additional query params for API */
  apiParams: { type: Object, default: () => ({}) },
  /** Column definitions for AG Grid popup table */
  columns: { type: Array, default: () => [] },
  /** Allow clearable */
  clearable: { type: Boolean, default: true },
  /** Pre-populated display text (skips API fetch for detail) */
  displayValue: { type: String, default: '' },
  /** Search fields for API (comma-separated) */
  searchFields: { type: String, default: '' },
  /** Page size for popup table */
  pageSize: { type: Number, default: 25 },
  /** Dialog title */
  dialogTitle: { type: String, default: '' },
})

const emit = defineEmits(['input', 'update:modelValue', 'update:valueFull'])

const api = useApi()
const hasError = computed(() => props.errorname === 'failed')

// ── State ──────────────────────────────────────────────────────────
const dialogOpen = ref(false)
const loading = ref(false)
const detailLoading = ref(false)
const rowData = ref([])
const pagination = ref(null)
const searchInput = ref('')
const selectedItem = ref(null)
const gridApi = ref(null)

// Internal pagination
const internalPage = ref(1)
const internalPageSize = ref(props.pageSize)

// Theme
const themeCookie = useCookie('theme')
const isDark = computed(() => themeCookie.value === 'dark')

// ── Current value ──────────────────────────────────────────────────
const currentValue = computed(() => {
  const val = props.modelValue ?? props.value ?? ''
  return String(val)
})

// ── Display text ───────────────────────────────────────────────────
const displayText = computed(() => {
  if (selectedItem.value && selectedItem.value[props.displayField]) {
    return selectedItem.value[props.displayField]
  }
  if (props.displayValue) return props.displayValue
  if (!currentValue.value) return ''
  return ''
})

const showPlaceholder = computed(() => !currentValue.value && !displayText.value)

// ── Resolved search fields ─────────────────────────────────────────
const resolvedSearchFields = computed(() => {
  if (props.searchFields) return props.searchFields
  // Auto from columns
  return props.columns
    .filter(c => c.field && c.filter !== false)
    .map(c => c.searchField || c.field)
    .join(',')
})

// ── AG Grid column defs ────────────────────────────────────────────
const agColumnDefs = computed(() => {
  return props.columns.map(col => {
    const hasWidth = col.width && parseInt(col.width) > 0
    return {
      headerName: col.headerName || col.label || col.field,
      field: col.field,
      flex: hasWidth ? parseInt(col.width) : 1,
      filter: col.filter !== false,
      floatingFilter: col.filter !== false,
      floatingFilterComponentParams: { suppressFilterButton: true },
      sortable: col.sortable !== false,
      suppressMenu: true,
      resizable: true,
    }
  })
})

const defaultColDef = {
  sortable: true,
  filter: true,
  floatingFilter: true,
  floatingFilterComponentParams: { suppressFilterButton: true },
  suppressMenu: true,
  resizable: true,
}

// Column filter state
const columnFilterSearch = ref('')
const columnFilterField = ref('')
let filterDebounceTimer = null

// ── Pagination computed ─────────────────────────────────────────────
const totalPages = computed(() => pagination.value?.total_pages ?? pagination.value?.totalPages ?? 1)
const totalItems = computed(() => pagination.value?.total ?? 0)
const startItem = computed(() => {
  if (!pagination.value || totalItems.value === 0) return 0
  return (internalPage.value - 1) * internalPageSize.value + 1
})
const endItem = computed(() => {
  if (!pagination.value) return 0
  return Math.min(internalPage.value * internalPageSize.value, totalItems.value)
})

// ── Fetch data for popup table ──────────────────────────────────────
const fetchPopupData = async () => {
  if (!props.apiUrl) return
  loading.value = true
  try {
    const params = new URLSearchParams()
    // API params from prop
    if (props.apiParams) {
      Object.entries(props.apiParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value))
      })
    }
    // Pagination
    params.append('page', String(internalPage.value))
    params.append('paginate', String(internalPageSize.value))

    // Search
    const hasColumnFilter = columnFilterSearch.value && columnFilterField.value
    const searchValue = hasColumnFilter ? columnFilterSearch.value : searchInput.value.trim()
    const searchField = hasColumnFilter ? columnFilterField.value : resolvedSearchFields.value
    if (searchValue) {
      params.append('search', searchValue)
      if (searchField) params.append('searchfield', searchField)
    }

    const sep = props.apiUrl.includes('?') ? '&' : '?'
    const url = `${props.apiUrl}${sep}${params.toString()}`

    const isFullUrl = /^https?:\/\//i.test(props.apiUrl)
    let response
    if (isFullUrl) {
      const res = await fetch(url)
      response = await res.json()
    } else {
      response = await api.get(url)
    }

    if (response?.status === 'success' && Array.isArray(response.data)) {
      rowData.value = response.data
      pagination.value = response.pagination || null
    } else if (Array.isArray(response?.data)) {
      rowData.value = response.data
      pagination.value = response.pagination || null
    } else if (Array.isArray(response)) {
      rowData.value = response
      pagination.value = null
    } else {
      rowData.value = []
      pagination.value = null
    }
  } catch (error) {
    console.error('FieldPopUp: fetch error', error)
    rowData.value = []
    pagination.value = null
  } finally {
    loading.value = false
  }
}

// ── Fetch detail by ID (for edit/view mode) ─────────────────────────
const fetchDetailById = async (id) => {
  if (!props.apiUrl || !id || props.displayValue) return
  detailLoading.value = true
  try {
    const params = new URLSearchParams()
    // Include apiParams (e.g. join=true)
    if (props.apiParams) {
      Object.entries(props.apiParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, String(value))
      })
    }
    params.append(`filter_column_${props.valueField}`, String(id))
    params.append('paginate', '1')

    const sep = props.apiUrl.includes('?') ? '&' : '?'
    const url = `${props.apiUrl}${sep}${params.toString()}`

    const isFullUrl = /^https?:\/\//i.test(props.apiUrl)
    let response
    if (isFullUrl) {
      const res = await fetch(url)
      response = await res.json()
    } else {
      response = await api.get(url)
    }

    if (response?.status === 'success' && Array.isArray(response.data) && response.data.length > 0) {
      selectedItem.value = response.data[0]
    } else if (Array.isArray(response?.data) && response.data.length > 0) {
      selectedItem.value = response.data[0]
    }
  } catch (error) {
    console.error('FieldPopUp: fetchDetailById error', error)
  } finally {
    detailLoading.value = false
  }
}

// ── Open dialog ─────────────────────────────────────────────────────
const openDialog = () => {
  if (props.disabled || props.readonly) return
  searchInput.value = ''
  columnFilterSearch.value = ''
  columnFilterField.value = ''
  internalPage.value = 1
  dialogOpen.value = true
  fetchPopupData()
}

// ── Row selection ───────────────────────────────────────────────────
const onRowClicked = (params) => {
  const item = params.data
  if (!item) return
  selectedItem.value = item
  const val = String(item[props.valueField] ?? '')
  emit('input', val)
  emit('update:modelValue', val)
  emit('update:valueFull', item)
  dialogOpen.value = false
}

// ── Clear value ─────────────────────────────────────────────────────
const handleClear = (e) => {
  e.stopPropagation()
  selectedItem.value = null
  emit('input', '')
  emit('update:modelValue', '')
  emit('update:valueFull', null)
}

// ── Pagination handlers ─────────────────────────────────────────────
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value && page !== internalPage.value) {
    internalPage.value = page
    fetchPopupData()
  }
}

const changePageSize = (size) => {
  internalPageSize.value = Number(size)
  internalPage.value = 1
  fetchPopupData()
}

// ── Search submit ───────────────────────────────────────────────────
const onSearchSubmit = () => {
  internalPage.value = 1
  columnFilterSearch.value = ''
  columnFilterField.value = ''
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
  fetchPopupData()
}

// ── Grid events ─────────────────────────────────────────────────────
const onGridReady = (params) => {
  gridApi.value = params.api
}

const onFilterChanged = () => {
  if (!gridApi.value) return
  if (filterDebounceTimer) clearTimeout(filterDebounceTimer)
  filterDebounceTimer = setTimeout(() => {
    const filterModel = gridApi.value.getFilterModel()
    let filterValue = ''
    let filterField = ''
    for (const [colField, model] of Object.entries(filterModel)) {
      if (model && model.filter && typeof model.filter === 'string' && model.filter.trim()) {
        filterValue = model.filter.trim()
        // Find searchField mapping from columns
        const col = props.columns.find(c => c.field === colField)
        filterField = col?.searchField || colField
        break
      }
    }
    columnFilterSearch.value = filterValue
    columnFilterField.value = filterField
    internalPage.value = 1
    fetchPopupData()
  }, 300)
}

// ── Refresh handler ─────────────────────────────────────────────────
const handleRefresh = () => {
  searchInput.value = ''
  columnFilterSearch.value = ''
  columnFilterField.value = ''
  internalPage.value = 1
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
  fetchPopupData()
}

// ── Lifecycle: fetch detail if value is pre-set ─────────────────────
onMounted(() => {
  if (currentValue.value && currentValue.value.trim()) {
    fetchDetailById(currentValue.value)
  }
})

// Watch external value change
watch(currentValue, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal && newVal.trim()) {
    fetchDetailById(newVal)
  }
  if (!newVal) {
    selectedItem.value = null
  }
})

// Dialog title
const resolvedDialogTitle = computed(() =>
  props.dialogTitle || `Pilih ${props.label || 'Data'}`
)
</script>

<template>
  <div :class="props.class">
    <Label
      v-if="label"
      :for="id"
      :class="{ required }"
      class="mb-2 block"
    >{{ label }}</Label>

    <!-- Trigger: readonly input that opens the dialog -->
    <div class="relative">
      <div
        :class="[
          'flex items-center w-full h-10 px-3 py-1.5 text-sm rounded-md border bg-background cursor-pointer transition-colors select-none',
          hasError ? 'border-destructive' : 'border-input',
          disabled || readonly ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50',
        ]"
        @click="openDialog"
      >
        <span
          :class="[
            'flex-1 truncate',
            showPlaceholder ? 'text-muted-foreground' : 'text-foreground'
          ]"
        >{{ showPlaceholder ? placeholder : displayText }}</span>

        <div class="flex items-center gap-1 ml-1 shrink-0">
          <Loader2 v-if="detailLoading" class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <button
            v-if="clearable && currentValue && !disabled && !readonly"
            type="button"
            class="p-0.5 rounded hover:bg-muted"
            @click="handleClear"
            tabindex="-1"
          >
            <X class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <SearchIcon class="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </div>

    <!-- Hint / Error text -->
    <p v-if="hints" :class="hasError ? 'text-destructive' : 'text-muted-foreground'" class="text-sm mt-1">
      {{ hints }}
    </p>

    <!-- Popup Dialog with AG Grid -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader class="px-6 pt-6 pb-3">
          <DialogTitle>{{ resolvedDialogTitle }}</DialogTitle>
          <DialogDescription class="sr-only">Pilih data dari tabel</DialogDescription>
        </DialogHeader>

        <div class="px-6 pb-3">
          <!-- Search bar -->
          <form class="flex items-center gap-2" @submit.prevent="onSearchSubmit">
            <input
              v-model="searchInput"
              type="text"
              placeholder="Cari..."
              class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Search"
            >
              <SearchIcon class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Refresh"
              :disabled="loading"
              @click="handleRefresh"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            </button>
          </form>
        </div>

        <!-- AG Grid Table -->
        <ClientOnly>
          <div class="flex-1 px-6 min-h-0">
            <AgGridVue
              :class="isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'"
              style="height: 50vh"
              class="w-full"
              :columnDefs="agColumnDefs"
              :rowData="rowData"
              :defaultColDef="defaultColDef"
              :animateRows="true"
              rowSelection="single"
              :loading="loading"
              @grid-ready="onGridReady"
              @filter-changed="onFilterChanged"
              @row-clicked="onRowClicked"
            />
          </div>

          <!-- Pagination -->
          <div
            v-if="pagination"
            class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-2 text-sm text-muted-foreground"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs">Rows:</span>
              <select
                :value="internalPageSize"
                class="h-7 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                @change="changePageSize($event.target.value)"
              >
                <option v-for="size in [25, 50, 100]" :key="size" :value="size">{{ size }}</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="totalItems > 0">{{ startItem }}-{{ endItem }} of {{ totalItems }}</span>
              <span v-else>No data</span>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="internalPage <= 1" title="First page" @click="goToPage(1)"
              ><ChevronsLeft class="h-4 w-4" /></button>
              <button
                class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="internalPage <= 1" title="Previous page" @click="goToPage(internalPage - 1)"
              ><ChevronLeft class="h-4 w-4" /></button>
              <span class="px-2 text-xs font-medium">{{ internalPage }} / {{ totalPages }}</span>
              <button
                class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="internalPage >= totalPages" title="Next page" @click="goToPage(internalPage + 1)"
              ><ChevronRight class="h-4 w-4" /></button>
              <button
                class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="internalPage >= totalPages" title="Last page" @click="goToPage(totalPages)"
              ><ChevronsRight class="h-4 w-4" /></button>
            </div>
          </div>
        </ClientOnly>

        <!-- Footer padding -->
        <div class="h-3"></div>
      </DialogContent>
    </Dialog>
  </div>
</template>
