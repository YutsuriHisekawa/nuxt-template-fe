<script setup>
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-vue-next'

const props = defineProps({
  data: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },
  showIndex: { type: Boolean, default: true },
  hasMore: { type: Boolean, default: true },
})

const emit = defineEmits(['loadMore', 'selectionChange', 'cellClick'])

const tableContainer = ref(null)

// Multi-selection state
const selectedRows = ref(new Set())

// Column filters
const columnFilters = ref({})

// Init filters
props.columns.forEach((col) => {
  const key = col.key || col.field
  if (col.filterable && key) columnFilters.value[key] = ''
})

// Sorting
const sortColumn = ref(null)
const sortOrder = ref(null)

const toggleSort = (columnKey) => {
  if (sortColumn.value === columnKey) {
    if (sortOrder.value === 'asc') sortOrder.value = 'desc'
    else if (sortOrder.value === 'desc') { sortColumn.value = null; sortOrder.value = null }
    else sortOrder.value = 'asc'
  } else {
    sortColumn.value = columnKey
    sortOrder.value = 'asc'
  }
}

const getSortIcon = (columnKey) => {
  if (sortColumn.value !== columnKey) return ArrowUpDown
  return sortOrder.value === 'asc' ? ArrowUp : ArrowDown
}

const getColumnKey = (col) => col.key || col.field || ''
const getColumnHeader = (col) => col.label || col.headerName || ''

// Processed data
const processedData = computed(() => {
  let result = props.data.map((item, index) => ({ ...item, _originalIndex: index }))

  // Column filters
  result = result.filter((item) =>
    props.columns.every((col) => {
      const key = getColumnKey(col)
      if (!col.filterable || !key) return true
      const filterValue = columnFilters.value[key]
      if (!filterValue) return true
      return String(item[key] || '').toLowerCase().includes(filterValue.toLowerCase())
    }),
  )

  // Sorting
  if (sortColumn.value && sortOrder.value) {
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortColumn.value === 'index') {
        cmp = a._originalIndex - b._originalIndex
      } else {
        const aVal = a[sortColumn.value]
        const bVal = b[sortColumn.value]
        if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal
        else cmp = String(aVal || '').toLowerCase().localeCompare(String(bVal || '').toLowerCase())
      }
      return sortOrder.value === 'asc' ? cmp : -cmp
    })
  }

  return result
})

// Selection
const toggleRowSelection = (item) => {
  const rowId = item.id || JSON.stringify(item)
  if (selectedRows.value.has(rowId)) selectedRows.value.delete(rowId)
  else selectedRows.value.add(rowId)
  emitSelection()
}

const handleCellClick = (col, item, event) => {
  if (col.renderHtml) {
    emit('cellClick', { column: col, item, event })
    return
  }
  toggleRowSelection(item)
}

const isRowSelected = (item) => {
  const rowId = item.id || JSON.stringify(item)
  return selectedRows.value.has(rowId)
}

const toggleAllSelection = () => {
  const allSelected = processedData.value.every((item) => isRowSelected(item))
  if (allSelected) {
    processedData.value.forEach((item) => {
      selectedRows.value.delete(item.id || JSON.stringify(item))
    })
  } else {
    processedData.value.forEach((item) => {
      selectedRows.value.add(item.id || JSON.stringify(item))
    })
  }
  emitSelection()
}

const allVisibleSelected = computed(() => {
  if (processedData.value.length === 0) return false
  return processedData.value.every((item) => isRowSelected(item))
})

const someVisibleSelected = computed(() => {
  if (processedData.value.length === 0) return false
  const count = processedData.value.filter((item) => isRowSelected(item)).length
  return count > 0 && count < processedData.value.length
})

function emitSelection() {
  const selected = props.data.filter((d) => selectedRows.value.has(d.id || JSON.stringify(d)))
  emit('selectionChange', selected)
}

// Infinite scroll
const handleScroll = () => {
  if (!tableContainer.value || props.loadingMore || !props.hasMore) return
  const el = tableContainer.value
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) emit('loadMore')
}

// Header checkbox indeterminate
const headerCheckboxRef = ref(null)
const updateHeaderCheckbox = () => {
  if (headerCheckboxRef.value) headerCheckboxRef.value.indeterminate = someVisibleSelected.value
}
watch([selectedRows, () => processedData.value.length], updateHeaderCheckbox, { deep: true })

onMounted(() => {
  tableContainer.value?.addEventListener('scroll', handleScroll)
  updateHeaderCheckbox()
})
onUnmounted(() => {
  tableContainer.value?.removeEventListener('scroll', handleScroll)
})

defineExpose({
  clearSelection: () => { selectedRows.value.clear(); emit('selectionChange', []) },
  getSelectedItems: () => props.data.filter((d) => selectedRows.value.has(d.id || JSON.stringify(d))),
})
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <!-- Column Filters -->
    <div v-if="columns.some((c) => c.filterable)" class="mb-4 grid gap-2 shrink-0" :class="`grid-cols-${columns.filter((c) => c.filterable).length}`">
      <template v-for="col in columns" :key="getColumnKey(col)">
        <div v-if="col.filterable">
          <UiInput v-model="columnFilters[getColumnKey(col)]" :placeholder="`Filter ${getColumnHeader(col)}...`" class="h-8" />
        </div>
      </template>
    </div>

    <!-- Table Container -->
    <div ref="tableContainer" class="border rounded-lg overflow-auto h-full">
      <UiTable>
        <UiTableHeader class="sticky top-0 bg-background z-10">
          <UiTableRow>
            <UiTableHead class="w-12">
              <input ref="headerCheckboxRef" type="checkbox" :checked="allVisibleSelected" class="rounded cursor-pointer" @change="toggleAllSelection" />
            </UiTableHead>
            <UiTableHead v-if="showIndex" class="w-16">
              <div class="flex items-center gap-1">
                <span>No</span>
                <button class="p-1 hover:bg-muted rounded" @click="toggleSort('index')">
                  <component :is="getSortIcon('index')" class="h-4 w-4" />
                </button>
              </div>
            </UiTableHead>
            <UiTableHead v-for="col in columns" :key="getColumnKey(col)" :style="{ width: col.width, minWidth: col.width }">
              <div class="flex items-center gap-1">
                <span>{{ getColumnHeader(col) }}</span>
                <button v-if="col.sortable" class="p-1 hover:bg-muted rounded" @click="toggleSort(getColumnKey(col))">
                  <component :is="getSortIcon(getColumnKey(col))" class="h-4 w-4" />
                </button>
              </div>
            </UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <!-- Loading -->
          <UiTableRow v-if="loading">
            <UiTableCell :colspan="columns.length + (showIndex ? 2 : 1)">
              <div class="flex flex-col gap-2 py-4">
                <UiSkeleton v-for="i in 5" :key="i" class="h-8 w-full" />
              </div>
            </UiTableCell>
          </UiTableRow>

          <!-- Empty -->
          <UiTableRow v-else-if="processedData.length === 0">
            <UiTableCell :colspan="columns.length + (showIndex ? 2 : 1)" class="text-center py-16 text-muted-foreground">
              Tidak ada data
            </UiTableCell>
          </UiTableRow>

          <!-- Data Rows -->
          <UiTableRow v-for="(item, index) in processedData" v-else :key="item.id || index" class="cursor-pointer hover:bg-muted/50" :class="{ 'bg-muted/30': isRowSelected(item) }">
            <UiTableCell class="w-12">
              <input type="checkbox" :checked="isRowSelected(item)" class="rounded cursor-pointer" @change="toggleRowSelection(item)" @click.stop />
            </UiTableCell>
            <UiTableCell v-if="showIndex" class="w-16">{{ item._originalIndex + 1 }}</UiTableCell>
            <UiTableCell v-for="col in columns" :key="getColumnKey(col)" :style="{ width: col.width, minWidth: col.width }" @click="handleCellClick(col, item, $event)">
              <span v-if="col.render">{{ col.render(item, index) }}</span>
              <span v-else-if="col.renderHtml" v-html="col.renderHtml(item, index)" />
              <span v-else>{{ item[getColumnKey(col)] }}</span>
            </UiTableCell>
          </UiTableRow>

          <!-- Loading More -->
          <UiTableRow v-if="loadingMore">
            <UiTableCell :colspan="columns.length + (showIndex ? 2 : 1)" class="text-center py-4">
              <div class="flex items-center justify-center gap-2 text-muted-foreground">
                <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span>Memuat lebih banyak...</span>
              </div>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>

    <!-- Selection Info -->
    <div v-if="selectedRows.size > 0" class="mt-2 text-sm text-muted-foreground">
      {{ selectedRows.size }} item dipilih
    </div>
  </div>
</template>
