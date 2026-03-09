<script setup>
import { AgGridVue } from "ag-grid-vue3"
import { X, Search, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, default: 'Pilih Item' },
  api: { type: Object, default: null },
  columns: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  excludeIds: { type: Array, default: () => [] },
  searchKey: { type: String, default: 'name' },
  displayKey: { type: String, default: 'name' },
  uniqueKey: { type: String, default: 'id' },
})

const emit = defineEmits(['add', 'cellClick'])

const apiClient = useApi()

const loading = ref(false)
const loadingMore = ref(false)
const tableData = ref([])
const searchQuery = ref('')
const open = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const selectedRows = ref([])
const gridApi = ref(null)

// Theme
const themeCookie = useCookie('theme')
const isDark = computed(() => themeCookie.value === 'dark')

// Filter out already-added items
const filteredTableData = computed(() => {
  if (!props.excludeIds?.length) return tableData.value
  return tableData.value.filter((item) => !props.excludeIds.includes(item[props.uniqueKey]))
})

// Auto-load more if too few visible items
watch(filteredTableData, async (data) => {
  if (data.length < 10 && hasMore.value && !loading.value && !loadingMore.value && open.value) {
    await handleLoadMore()
  }
})

// Transform columns to AG Grid columnDefs
const columnDefs = computed(() => {
  const defs = []
  const colCount = props.columns?.length || 1

  // Combined checkbox + row number column
  defs.push({
    headerName: '',
    headerCheckboxSelection: true,
    checkboxSelection: true,
    valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
    width: 80,
    maxWidth: 80,
    sortable: false,
    filter: false,
    floatingFilter: false,
    resizable: false,
    pinned: 'left',
    suppressMenu: true,
    cellStyle: { display: 'flex', alignItems: 'center', gap: '4px' },
  })

  // User-defined columns — use flex for proportional sizing
  if (props.columns?.length) {
    props.columns.forEach((col) => {
      const def = {
        headerName: col.headerName || col.label || col.field || col.key || '',
        field: col.field || col.key || '',
        sortable: col.sortable !== false,
        filter: true,
        floatingFilter: true,
        floatingFilterComponentParams: { suppressFilterButton: true },
        suppressMenu: true,
        resizable: true,
        flex: 1,
        minWidth: 100,
      }
      // Support percentage (e.g. '25%') or pixel width (e.g. '200px' / '200')
      if (col.width) {
        const widthStr = String(col.width).trim()
        if (widthStr.endsWith('%')) {
          // Convert percentage to flex weight (e.g. 25% → flex 25)
          const pct = parseInt(widthStr)
          if (pct > 0) def.flex = pct
        } else {
          const px = parseInt(widthStr)
          if (px > 0) { def.width = px; def.flex = undefined }
        }
      }
      defs.push(def)
    })
  } else {
    defs.push({
      headerName: 'ID',
      field: 'id',
      sortable: true,
      filter: true,
      floatingFilter: true,
      floatingFilterComponentParams: { suppressFilterButton: true },
      suppressMenu: true,
      flex: 1,
      minWidth: 100,
    })
  }

  return defs
})

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
  minWidth: 80,
}

const openDialog = () => {
  if (props.disabled) return
  open.value = true
  currentPage.value = 1
  searchQuery.value = ''
  selectedRows.value = []
  fetchData(true)
}

const closeDialog = () => {
  open.value = false
  selectedRows.value = []
}

const handleSearch = () => {
  currentPage.value = 1
  tableData.value = []
  fetchData(true)
}

const handleLoadMore = () => {
  if (!loadingMore.value && hasMore.value) {
    currentPage.value++
    fetchData(false)
  }
}

const onGridReady = (params) => {
  gridApi.value = params.api
  // Attach infinite scroll listener on AG Grid body viewport
  nextTick(() => {
    const viewport = params.api?.gridBodyCtrl?.eBodyViewport
      || document.querySelector('.ag-body-viewport')
    if (viewport) {
      viewport.addEventListener('scroll', () => {
        if (loadingMore.value || !hasMore.value) return
        if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100) {
          handleLoadMore()
        }
      })
    }
  })
}

const onSelectionChanged = () => {
  if (!gridApi.value) return
  selectedRows.value = gridApi.value.getSelectedRows() || []
}

const handleAdd = () => {
  if (selectedRows.value.length === 0) return
  const items = [...selectedRows.value]
  closeDialog()
  nextTick(() => emit('add', items))
}

// Fetch data from API using useApi composable (prepends baseUrl + auth headers)
const fetchData = async (reset = false) => {
  if (!props.api) return

  if (reset) { loading.value = true; tableData.value = [] }
  else loadingMore.value = true

  try {
    // Build query params
    const params = new URLSearchParams()
    if (props.api.params) {
      Object.entries(props.api.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) params.append(key, String(value))
      })
    }
    params.append('page', String(currentPage.value))
    params.append('paginate', '20')

    const searchField = props.api.params?.searchfield || props.searchKey
    if (searchField) {
      params.delete('searchfield')
      params.append('searchfield', searchField)
    }
    if (searchQuery.value.trim()) params.append('search', searchQuery.value.trim())

    // Ensure endpoint starts with /api
    let apiUrl = props.api.url || ''
    const endpoint = apiUrl.startsWith('/api') ? apiUrl : `/api${apiUrl}`
    const fullEndpoint = `${endpoint}?${params.toString()}`

    // Use useApi composable — automatically prepends baseUrl and adds auth token
    let result = await apiClient.get(fullEndpoint)

    if (props.api.onsuccess) {
      result = props.api.onsuccess(result)
    }

    if (result.status === 'success' && result.data) {
      const newData = Array.isArray(result.data) ? result.data : []
      if (reset) tableData.value = newData
      else tableData.value = [...tableData.value, ...newData]

      if (result.hasNext !== undefined) hasMore.value = result.hasNext
      else if (result.pagination?.next_page) hasMore.value = true
      else hasMore.value = newData.length >= 20
    } else {
      if (reset) tableData.value = []
      hasMore.value = false
    }
  } catch (error) {
    console.error('ButtonMultiSelect fetch error:', error)
    if (reset) tableData.value = []
    hasMore.value = false
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}
</script>

<template>
  <div>
    <!-- Trigger Button -->
    <div @click="openDialog">
      <slot>
        <Button type="button" :disabled="disabled">{{ title }}</Button>
      </slot>
    </div>

    <!-- Modal Dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="open" class="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4" @click.self="closeDialog">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDialog" />

          <!-- Modal Content -->
          <div class="relative w-full max-w-7xl h-[95vh] sm:h-[90vh] bg-background rounded-lg sm:rounded-xl shadow-2xl flex flex-col overflow-hidden z-10">
            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b bg-background shrink-0">
              <div class="flex-1 min-w-0">
                <h2 class="text-lg sm:text-xl font-bold text-foreground truncate">{{ title }}</h2>
                <p class="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  Pilih item yang ingin ditambahkan (bisa lebih dari satu)
                </p>
              </div>
              <Button variant="ghost" size="icon" class="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-destructive/10 shrink-0 ml-2" @click="closeDialog">
                <X class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <!-- Search Bar -->
            <div class="px-4 py-3 sm:px-6 sm:py-4 border-b shrink-0">
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <FieldX
                  :value="searchQuery"
                  @input="(v) => (searchQuery = v)"
                  placeholder="Ketik untuk mencari data..."
                  class="flex-1"
                  @keydown.enter="handleSearch"
                />
                <Button :disabled="loading" class="w-full sm:w-auto px-4 sm:px-6 text-sm sm:text-base" @click="handleSearch">
                  <Search class="h-4 w-4 mr-2" />
                  Cari
                </Button>
              </div>
            </div>

            <!-- AG Grid Table -->
            <div class="flex-1 min-h-0 px-2 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 overflow-hidden">
              <ClientOnly>
                <!-- Loading skeleton -->
                <div v-if="loading" class="flex flex-col gap-2 py-4 h-full">
                  <Skeleton v-for="i in 8" :key="i" class="h-8 w-full" />
                </div>

                <!-- AG Grid -->
                <AgGridVue
                  v-else
                  :class="isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'"
                  class="w-full h-full"
                  :columnDefs="columnDefs"
                  :rowData="filteredTableData"
                  :defaultColDef="defaultColDef"
                  :animateRows="true"
                  rowSelection="multiple"
                  :rowMultiSelectWithClick="true"
                  :suppressRowClickSelection="false"
                  @grid-ready="onGridReady"
                  @selection-changed="onSelectionChanged"
                />
              </ClientOnly>
            </div>

            <!-- Loading more indicator -->
            <div v-if="loadingMore" class="flex items-center justify-center gap-2 py-2 text-muted-foreground text-sm border-t shrink-0">
              <Loader2 class="h-4 w-4 animate-spin" />
              <span>Memuat lebih banyak...</span>
            </div>

            <!-- Footer Actions -->
            <div class="px-4 py-3 sm:px-6 sm:py-4 border-t bg-background shrink-0">
              <div class="flex items-center justify-between">
                <span v-if="selectedRows.length > 0" class="text-sm text-muted-foreground">
                  {{ selectedRows.length }} item dipilih
                </span>
                <span v-else />
                <div class="flex items-center gap-3">
                  <Button variant="outline" class="px-6" @click="closeDialog">Batal</Button>
                  <Button :disabled="selectedRows.length === 0" class="px-6" @click="handleAdd">
                    Tambahkan ({{ selectedRows.length }})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
