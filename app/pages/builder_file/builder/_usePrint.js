// ============================================================================
// Print Builder Composable
// All print-related state, constants, and helper functions
// ============================================================================

export const PRINT_BLOCK_TYPES = [
  { value: 'company_header', label: 'Company Header' },
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'field', label: 'Field' },
  { value: 'field_table', label: 'Field Table' },
  { value: 'detail_table', label: 'Detail Table' },
  { value: 'image', label: 'Image / Logo' },
  { value: 'columns', label: 'Multi Column' },
  { value: 'list', label: 'List (Bullet/Number)' },
  { value: 'table', label: 'Table (Free-form)' },
  { value: 'divider', label: 'Separator / Divider' },
  { value: 'spacer', label: 'Spacer' },
  { value: 'page_break', label: 'Page Break' },
  { value: 'page_number', label: 'Page Number' },
  { value: 'watermark', label: 'Watermark' },
  { value: 'signature', label: 'Signature' },
  { value: 'html', label: 'HTML / Custom' },
]

export const PRINT_PAPER_OPTIONS = ['A4', 'A5', 'Letter', 'Legal']

export const FONT_FAMILY_OPTIONS = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Helvetica',
  'Calibri',
  'Tahoma',
]

export function printUid() {
  return `pb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function isPrintableField(field, getRegistryEntry) {
  const entry = getRegistryEntry(field?.type)
  return !entry?.isSpace && !entry?.isSection && !entry?.isFieldGroup && !entry?.isFieldGroupEnd && !!field?.field?.trim()
}

export function buildFieldTableText(items, allFields) {
  const rows = (items || [])
    .filter((item) => item?.visible !== false)
    .map((item) => {
      const source = allFields.find((field) => field.field === item.field)
      return `${item.field}|${item.label || source?.label || item.field}`
    })
  return rows.join('\n')
}

export function createDefaultPrintBlocks(allFields, allDetails, title) {
  const printable = (allFields || []).filter(f => {
    const t = f?.type
    return !!f?.field?.trim() && t !== 'space' && t !== 'section' && t !== 'fieldgroup' && t !== 'fieldgroup_end'
  })
  const firstDetail = (allDetails || []).find((detail) => detail?.responseKey)
  const fieldTableText = buildFieldTableText(
    printable.slice(0, 10).map((field) => ({ field: field.field, label: field.label || field.field, visible: true })),
    printable,
  )

  const blocks = [
    {
      id: printUid(),
      type: 'company_header',
      logoUrl: '',
      companyName: 'Nama Perusahaan',
      companySubtitle: 'Alamat / Divisi / Cabang',
      address: 'Jl. Contoh Alamat No. 123, Kota, Indonesia',
      meta: 'Telp: 021-000000 | Email: info@company.com',
      align: 'left',
    },
    { id: printUid(), type: 'divider', thickness: 2, style: 'solid' },
    { id: printUid(), type: 'heading', text: title || 'Dokumen', level: 1, align: 'center', fontSize: 0, fontFamily: '', bold: true, italic: false, underline: false, color: '' },
    { id: printUid(), type: 'paragraph', text: 'Dicetak pada {{current_date}}', align: 'center', fontSize: 0, fontFamily: '', bold: false, italic: false, underline: false, color: '' },
    { id: printUid(), type: 'field_table', title: '', itemsText: fieldTableText, variant: 'plain' },
  ]

  if (firstDetail) {
    blocks.push({
      id: printUid(),
      type: 'detail_table',
      title: firstDetail.tabLabel || 'Detail',
      responseKey: firstDetail.responseKey,
    })
  }

  blocks.push({
    id: printUid(),
    type: 'signature',
    titlesText: 'Dibuat Oleh\nDiperiksa Oleh\nDisetujui Oleh',
    caption: 'Nama / Tanggal',
  })

  return blocks
}

export function createDefaultPrintConfig(allFields, allDetails, title) {
  return {
    enabled: false,
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 15,
    exportPdf: true,
    exportDocx: true,
    headerText: '',
    footerText: '',
    showPageNumber: false,
    pageNumberPosition: 'bottom-center',
    blocks: createDefaultPrintBlocks(allFields, allDetails, title),
  }
}

/** Normalize a single print block — ensures all properties exist with defaults */
export function normalizePrintBlock(block, allFields, allDetails, title) {
  const printable = (allFields || []).filter(f => {
    const t = f?.type
    return !!f?.field?.trim() && t !== 'space' && t !== 'section' && t !== 'fieldgroup' && t !== 'fieldgroup_end'
  })
  const firstField = printable[0]?.field || ''
  const firstDetail = (allDetails || []).find((detail) => detail?.responseKey)
  const base = {
    id: block?.id || printUid(),
    type: block?.type || 'paragraph',
    marginTop: Number(block?.marginTop || 0),
    marginBottom: Number(block?.marginBottom || 0),
    borderWidth: Number(block?.borderWidth || 0),
    borderColor: block?.borderColor || '#000000',
    backgroundColor: block?.backgroundColor || '',
    blockPadding: Number(block?.blockPadding || 0),
  }

  switch (base.type) {
    case 'company_header':
      return {
        ...base,
        logoUrl: block?.logoUrl || '',
        companyName: block?.companyName || 'Nama Perusahaan',
        companySubtitle: block?.companySubtitle || '',
        address: block?.address || '',
        meta: block?.meta || '',
        align: block?.align || 'left',
      }
    case 'heading':
      return {
        ...base,
        text: block?.text || title || 'Dokumen',
        level: Number(block?.level || 1),
        align: block?.align || 'center',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: block?.bold !== false,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
      }
    case 'paragraph':
      return {
        ...base,
        text: block?.text || '',
        align: block?.align || 'left',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: !!block?.bold,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
      }
    case 'field':
      return { ...base, field: block?.field || firstField, label: block?.label || '', layout: block?.layout || 'row' }
    case 'field_table':
      return {
        ...base,
        title: block?.title || '',
        itemsText: block?.itemsText || buildFieldTableText(
          printable.slice(0, 10).map((field) => ({ field: field.field, label: field.label || field.field, visible: true })),
          printable,
        ),
        variant: block?.variant || 'plain',
      }
    case 'detail_table':
      return { ...base, title: block?.title || firstDetail?.tabLabel || 'Detail', responseKey: block?.responseKey || firstDetail?.responseKey || '' }
    case 'image':
      return {
        ...base,
        src: block?.src || '',
        alt: block?.alt || 'image',
        width: Number(block?.width || 120),
        height: Number(block?.height || 120),
        fit: block?.fit || 'contain',
        align: block?.align || 'left',
      }
    case 'columns':
      return {
        ...base,
        colCount: Number(block?.colCount || 2),
        gap: Number(block?.gap || 16),
        columnsHtml: Array.isArray(block?.columnsHtml)
          ? block.columnsHtml.map(h => h || '')
          : Array(Number(block?.colCount || 2)).fill(''),
      }
    case 'list':
      return {
        ...base,
        listType: block?.listType || 'bullet',
        itemsText: block?.itemsText || 'Item 1\nItem 2\nItem 3',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        color: block?.color || '',
      }
    case 'table':
      return {
        ...base,
        rows: Number(block?.rows || 3),
        cols: Number(block?.cols || 3),
        cellsText: block?.cellsText || '',
        showBorder: block?.showBorder !== false,
        headerRow: block?.headerRow !== false,
      }
    case 'divider':
      return { ...base, thickness: Number(block?.thickness || 1), style: block?.style || 'solid' }
    case 'spacer':
      return { ...base, height: Number(block?.height || 20) }
    case 'page_break':
      return { ...base }
    case 'page_number':
      return {
        ...base,
        format: block?.format || 'Halaman {page}',
        align: block?.align || 'center',
        fontSize: Number(block?.fontSize || 0),
      }
    case 'watermark':
      return {
        ...base,
        text: block?.text || 'DRAFT',
        opacity: Number(block?.opacity || 0.08),
        fontSize: Number(block?.fontSize || 80),
        color: block?.color || '#000000',
        rotate: Number(block?.rotate ?? -35),
      }
    case 'signature':
      return { ...base, titlesText: block?.titlesText || 'Dibuat Oleh\nDiperiksa Oleh\nDisetujui Oleh', caption: block?.caption || 'Nama / Tanggal' }
    case 'html':
      return { ...base, html: block?.html || '<p>{{page_title}}</p>' }
    default:
      return { ...base, type: 'paragraph', text: block?.text || '', align: block?.align || 'left' }
  }
}

export function normalizePrintConfig(rawConfig, allFields, allDetails, title) {
  const fallback = createDefaultPrintConfig(allFields, allDetails, title)

  if (Array.isArray(rawConfig)) {
    return {
      ...fallback,
      enabled: rawConfig.length > 0,
      blocks: [
        normalizePrintBlock({ type: 'heading', text: title || 'Dokumen', level: 1, align: 'center' }, allFields, allDetails, title),
        normalizePrintBlock({ type: 'paragraph', text: 'Dicetak pada {{current_date}}', align: 'center' }, allFields, allDetails, title),
        normalizePrintBlock({ type: 'field_table', itemsText: buildFieldTableText(rawConfig, allFields) }, allFields, allDetails, title),
        normalizePrintBlock({ type: 'signature' }, allFields, allDetails, title),
      ],
    }
  }

  if (!rawConfig || typeof rawConfig !== 'object') return fallback

  const blocks = Array.isArray(rawConfig.blocks) && rawConfig.blocks.length
    ? rawConfig.blocks.map((block) => normalizePrintBlock(block, allFields, allDetails, title))
    : fallback.blocks

  return {
    ...fallback,
    ...rawConfig,
    enabled: rawConfig.enabled === true,
    paperSize: PRINT_PAPER_OPTIONS.includes(rawConfig.paperSize) ? rawConfig.paperSize : fallback.paperSize,
    orientation: rawConfig.orientation === 'landscape' ? 'landscape' : 'portrait',
    marginMm: Number(rawConfig.marginMm || fallback.marginMm),
    exportPdf: rawConfig.exportPdf !== false,
    exportDocx: rawConfig.exportDocx !== false,
    headerText: rawConfig.headerText || '',
    footerText: rawConfig.footerText || '',
    showPageNumber: !!rawConfig.showPageNumber,
    pageNumberPosition: rawConfig.pageNumberPosition || 'bottom-center',
    blocks,
  }
}

export function parsePrintFieldTable(itemsText) {
  return String(itemsText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [field, label] = line.split('|').map((part) => part.trim())
      return { field, label: label || field }
    })
    .filter((item) => item.field)
}

export function parseSignatureTitles(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function parseListItems(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function parseTableCells(cellsText, rows, cols) {
  const lines = String(cellsText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
  const result = []
  for (let r = 0; r < rows; r++) {
    const row = []
    const parts = (lines[r] || '').split('|')
    for (let c = 0; c < cols; c++) {
      row.push((parts[c] || '').trim())
    }
    result.push(row)
  }
  return result
}

export function getPaperPreviewStyle(printCfg) {
  const sizeMap = {
    A4: { portrait: { width: 210, height: 297 }, landscape: { width: 297, height: 210 } },
    A5: { portrait: { width: 148, height: 210 }, landscape: { width: 210, height: 148 } },
    Letter: { portrait: { width: 216, height: 279 }, landscape: { width: 279, height: 216 } },
    Legal: { portrait: { width: 216, height: 356 }, landscape: { width: 356, height: 216 } },
  }
  const paper = sizeMap[printCfg?.paperSize || 'A4'] || sizeMap.A4
  const dims = paper[printCfg?.orientation === 'landscape' ? 'landscape' : 'portrait']
  return {
    width: '100%',
    maxWidth: `${dims.width}mm`,
    minHeight: `${dims.height}mm`,
    aspectRatio: `${dims.width} / ${dims.height}`,
    padding: `${Number(printCfg?.marginMm || 15)}mm`,
  }
}

/** Build inline style object for per-block styling (margin, border, bg) */
export function getBlockWrapperStyle(block) {
  const s = {}
  if (block.marginTop) s.marginTop = `${block.marginTop}px`
  if (block.marginBottom) s.marginBottom = `${block.marginBottom}px`
  if (block.borderWidth) {
    s.border = `${block.borderWidth}px solid ${block.borderColor || '#000'}`
  }
  if (block.backgroundColor) s.backgroundColor = block.backgroundColor
  if (block.blockPadding) s.padding = `${block.blockPadding}px`
  return s
}

/** Build inline style for font-styled blocks (heading, paragraph, list) */
export function getFontStyle(block) {
  const s = {}
  if (block.fontSize) s.fontSize = `${block.fontSize}px`
  if (block.fontFamily) s.fontFamily = block.fontFamily
  if (block.bold) s.fontWeight = 'bold'
  if (block.italic) s.fontStyle = 'italic'
  if (block.underline) s.textDecoration = 'underline'
  if (block.color) s.color = block.color
  return s
}

export function resolveLogoUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const cfg = useRuntimeConfig()
  const base = (cfg.public.baseUrl || '').replace(/\/api\/?$/, '')
  if (path.startsWith('uploads/')) return `${base}/${path}`
  return `${base}/uploads/${path}`
}
