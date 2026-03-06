// Composable untuk detail tab preview: data interaktif + AG Grid column defs
import { toast } from 'vue-sonner'

export function useDetailPreview(details) {
  const detailPreviewData = reactive({})

  function getPreviewArr(dIdx) {
    if (!detailPreviewData[dIdx]) detailPreviewData[dIdx] = []
    return detailPreviewData[dIdx]
  }

  function getPreviewExcludeIds(dIdx) {
    const detail = details.value[dIdx]
    const fk = detail?.foreignKey || 'id'
    return getPreviewArr(dIdx).map(d => d[fk])
  }

  function handlePreviewMultiSelectAdd(dIdx, selectedItems) {
    const detail = details.value[dIdx]
    const fk = detail?.foreignKey || 'id'
    const fkDisplay = detail?.foreignDisplay || ''
    const uk = detail?.uniqueKey || 'id'
    const arr = getPreviewArr(dIdx)
    let added = 0
    selectedItems.forEach(item => {
      if (arr.some(d => d[fk] === item[uk])) return
      const row = { [fk]: item[uk] }
      if (fkDisplay) row[fkDisplay] = item
      ;(detail.detailFields || []).forEach(df => {
        if (df.type === 'checkbox' || df.type === 'status') row[df.key] = df.default !== false
        else if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) row[df.key] = df.default || 0
        else row[df.key] = df.default || ''
      })
      arr.push(row)
      added++
    })
    if (added) {
      detailPreviewData[dIdx] = [...arr]
      toast.success(`${added} item ditambahkan (preview)`)
    }
  }

  function handlePreviewAddRow(dIdx) {
    const detail = details.value[dIdx]
    const arr = getPreviewArr(dIdx)
    const row = {}
    ;(detail.detailFields || []).forEach(df => {
      if (df.type === 'checkbox' || df.type === 'status') row[df.key] = df.default !== false
      else if (['number', 'fieldnumber', 'fieldnumber_decimal', 'currency', 'slider'].includes(df.type)) row[df.key] = df.default || 0
      else row[df.key] = df.default || ''
    })
    arr.push(row)
    detailPreviewData[dIdx] = [...arr]
  }

  function removePreviewRow(dIdx, rowIdx) {
    const arr = getPreviewArr(dIdx)
    arr.splice(rowIdx, 1)
    detailPreviewData[dIdx] = [...arr]
  }

  function updatePreviewCell(dIdx, rowIdx, key, val) {
    const arr = getPreviewArr(dIdx)
    if (arr[rowIdx]) {
      arr[rowIdx] = { ...arr[rowIdx], [key]: val }
      detailPreviewData[dIdx] = [...arr]
    }
  }

  // ── AG Grid Column Defs ──
  function getDetailColumnDefs(dIdx) {
    const detail = details.value[dIdx]
    const cols = []

    // No column
    cols.push({
      headerName: 'No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 60, pinned: 'left', sortable: false, filter: false, suppressMovable: true,
    })

    // Display columns (ButtonMultiSelect mode only)
    if (detail.mode !== 'add_to_list') {
      ;(detail.displayColumns || []).forEach(dc => {
        cols.push({
          headerName: dc.label || dc.key,
          field: dc.key,
          flex: 1, minWidth: 100,
          valueGetter: (params) => {
            if (detail.foreignDisplay) return params.data?.[detail.foreignDisplay]?.[dc.key] || '-'
            return params.data?.[dc.key] || '-'
          },
        })
      })
    }

    // Detail fields (editable)
    ;(detail.detailFields || []).forEach(df => {
      if (df.type === 'checkbox') {
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          width: 100, minWidth: 80,
          cellRenderer: (params) => {
            const val = params.value
            const label = val ? (df.labelTrue || 'Ya') : (df.labelFalse || 'Tidak')
            const cls = val ? 'text-green-600 font-semibold' : 'text-red-500'
            return `<span class="cursor-pointer select-none ${cls}">${label}</span>`
          },
          onCellClicked: (params) => {
            params.data[df.key] = !params.data[df.key]
            params.api.refreshCells({ rowNodes: [params.node], columns: [df.key], force: true })
          },
        })
      } else if (df.type === 'status') {
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          width: 100, minWidth: 80,
          cellRenderer: (params) => {
            const val = params.value
            const label = val ? (df.labelTrue || 'Aktif') : (df.labelFalse || 'Tidak Aktif')
            const cls = val ? 'text-green-600 font-semibold' : 'text-red-500'
            return `<span class="cursor-pointer select-none ${cls}">${label}</span>`
          },
          onCellClicked: (params) => {
            params.data[df.key] = !params.data[df.key]
            params.api.refreshCells({ rowNodes: [params.node], columns: [df.key], force: true })
          },
        })
      } else if (['fieldnumber', 'fieldnumber_decimal', 'number', 'currency', 'slider'].includes(df.type)) {
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          flex: 1, minWidth: 100,
          editable: true,
          cellEditor: 'agNumberCellEditor',
          valueSetter: (params) => { params.data[df.key] = Number(params.newValue) || 0; return true },
          ...(df.type === 'currency' ? {
            valueFormatter: (params) => params.value != null ? Number(params.value).toLocaleString('id-ID') : '0',
          } : {}),
        })
      } else if (df.type === 'select') {
        const opts = df.sourceType === 'static'
          ? (df.staticOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
          : []
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          flex: 1, minWidth: 120,
          editable: true,
          cellRenderer: (params) => {
            if (params.value == null || params.value === '') return '<span class="text-muted-foreground/50 italic">- Pilih -</span>'
            if (opts.length) {
              const found = opts.find(o => o.value === params.value)
              return found ? found.label : params.value
            }
            return params.value || '-'
          },
          ...(df.sourceType === 'static' && opts.length ? {
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: { values: opts.map(o => o.value) },
          } : {
            valueSetter: (params) => { params.data[df.key] = params.newValue; return true },
          }),
        })
      } else if (df.type === 'popup') {
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          flex: 1, minWidth: 120,
          editable: true,
          cellRenderer: (params) => {
            if (params.value == null || params.value === '') return '<span class="text-muted-foreground/50 italic">- Pilih -</span>'
            return params.value || '-'
          },
          valueSetter: (params) => { params.data[df.key] = params.newValue; return true },
        })
      } else if (df.type === 'date' || df.type === 'datetime') {
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          flex: 1, minWidth: 120,
          editable: true,
          cellRenderer: (params) => {
            if (params.value == null || params.value === '') return '<span class="text-muted-foreground/50 italic">- Pilih tanggal -</span>'
            return params.value
          },
          valueSetter: (params) => { params.data[df.key] = params.newValue; return true },
        })
      } else if (df.type === 'radio') {
        const opts = (df.radioOptions || []).map(o => ({ value: o.value, label: o.label || o.value }))
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          flex: 1, minWidth: 120,
          editable: true,
          cellRenderer: (params) => {
            if (params.value == null || params.value === '') return '<span class="text-muted-foreground/50 italic">- Pilih -</span>'
            if (opts.length) {
              const found = opts.find(o => o.value === params.value)
              return found ? found.label : params.value
            }
            return params.value || '-'
          },
          ...(opts.length ? {
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: { values: opts.map(o => o.value) },
          } : {
            valueSetter: (params) => { params.data[df.key] = params.newValue; return true },
          }),
        })
      } else {
        cols.push({
          headerName: df.label || df.key,
          field: df.key,
          flex: 1, minWidth: 120,
          editable: true,
          valueSetter: (params) => { params.data[df.key] = params.newValue; return true },
        })
      }
    })

    // Aksi column
    cols.push({
      headerName: 'Aksi',
      width: 70, pinned: 'right', sortable: false, filter: false, suppressMovable: true,
      cellRenderer: () => `<button class="text-destructive hover:text-destructive/80 text-xs font-medium">Hapus</button>`,
      onCellClicked: (params) => removePreviewRow(dIdx, params.node.rowIndex),
    })

    return cols
  }

  const detailDefaultColDef = { sortable: true, resizable: true }

  // Key that changes when field config changes — forces AG Grid re-mount
  function detailFieldsKey(dIdx) {
    const detail = details.value[dIdx]
    if (!detail) return `d-${dIdx}`
    return `d-${dIdx}-` + (detail.detailFields || []).map(f => f.key + ':' + f.type + ':' + (f.sourceType || '') + ':' + (f.staticOptions?.length || 0) + ':' + (f.radioOptions?.length || 0)).join(',')
  }

  // Clear preview data for a specific detail tab
  function clearPreviewData(dIdx) {
    detailPreviewData[dIdx] = []
  }

  return {
    detailPreviewData,
    getPreviewArr, getPreviewExcludeIds,
    handlePreviewMultiSelectAdd, handlePreviewAddRow, removePreviewRow,
    updatePreviewCell, clearPreviewData,
  }
}
