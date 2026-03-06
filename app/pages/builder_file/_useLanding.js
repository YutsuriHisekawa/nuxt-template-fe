// Composable untuk landing config: kolom, preview, API fetch
import { toast } from 'vue-sonner'

export function useLanding(landingConfig, config) {
  // ── Landing Actions ──
  function moveLandingCol(idx, dir) {
    const to = idx + dir
    if (to < 0 || to >= landingConfig.value.length) return
    const arr = [...landingConfig.value]
    const tmp = arr[idx]
    arr[idx] = arr[to]
    arr[to] = tmp
    landingConfig.value = arr
  }

  function updateLandingCol(idx, key, val) {
    const arr = [...landingConfig.value]
    arr[idx] = { ...arr[idx], [key]: val }
    landingConfig.value = arr
  }

  // ── AG Grid Column Defs ──
  const landingPreviewCols = computed(() => {
    const cols = [
      {
        headerName: 'No',
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        width: 60, minWidth: 60, maxWidth: 80,
        pinned: 'left', sortable: false, filter: false, suppressMovable: true,
      },
    ]
    landingConfig.value
      .filter(c => c.visible)
      .forEach(c => {
        const df = c.displayField?.trim()
        const colDef = {
          headerName: c.label || c.field,
          minWidth: c.minWidth || 140,
          filter: true,
          floatingFilter: true,
          floatingFilterComponentParams: { suppressFilterButton: true },
          suppressMenu: true,
        }
        if (df && df.includes('.')) {
          colDef.valueGetter = (params) => df.split('.').reduce((obj, k) => obj?.[k], params.data)
        } else {
          colDef.field = df || c.field
        }
        cols.push(colDef)
      })
    return cols
  })

  // ── API Preview ──
  const useRealApi = ref(false)
  const realApiLoading = ref(false)
  const realApiRows = ref([])
  const apiParams = ref([{ key: '', value: '' }])

  function addApiParam() {
    apiParams.value.push({ key: '', value: '' })
  }

  function removeApiParam(idx) {
    apiParams.value.splice(idx, 1)
    if (!apiParams.value.length) apiParams.value.push({ key: '', value: '' })
  }

  async function fetchRealApiData() {
    if (!config.value?.apiEndpoint) {
      toast.error('API endpoint belum tersedia')
      return
    }
    realApiLoading.value = true
    try {
      const qp = new URLSearchParams()
      qp.set('join', 'true')
      apiParams.value.forEach(p => {
        if (p.key?.trim() && p.value?.trim()) qp.set(p.key.trim(), p.value.trim())
      })
      const api = useApi()
      const res = await api.get(`/api/dynamic/${config.value.apiEndpoint}?${qp.toString()}`)
      const list = Array.isArray(res) ? res : (res?.data || res?.rows || [])
      realApiRows.value = list
      toast.success(`${list.length} baris data diterima`)
    } catch (e) {
      toast.error('Gagal fetch: ' + (e?.data?.message || e?.message || 'Error'))
      realApiRows.value = []
    } finally {
      realApiLoading.value = false
    }
  }

  // ── Sample & Preview Rows ──
  const sampleRows = computed(() => {
    const visible = landingConfig.value.filter(c => c.visible)
    if (!visible.length) return []
    const rows = []
    for (let r = 1; r <= 3; r++) {
      const row = { id: r }
      visible.forEach(c => { row[c.field] = `Sample ${c.label || c.field} ${r}` })
      rows.push(row)
    }
    return rows
  })

  const landingPreviewRows = computed(() => {
    if (useRealApi.value && realApiRows.value.length) return realApiRows.value
    return sampleRows.value
  })

  return {
    moveLandingCol, updateLandingCol,
    landingPreviewCols,
    useRealApi, realApiLoading, realApiRows, apiParams,
    addApiParam, removeApiParam, fetchRealApiData,
    sampleRows, landingPreviewRows,
  }
}
