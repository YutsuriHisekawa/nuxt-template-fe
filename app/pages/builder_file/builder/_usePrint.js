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
  { value: 'header', label: 'Header (Kop Halaman)' },
  { value: 'footer', label: 'Footer (Kaki Halaman)' },
]

export const PRINT_PAPER_OPTIONS = ['A4', 'A5', 'Letter', 'Legal']

// ============================================================================
// Layout Templates — 10 siap pakai
// ============================================================================
export const PRINT_LAYOUT_TEMPLATES = [
  {
    id: 'surat_jalan',
    name: 'Surat Jalan (SJ)',
    icon: '🚚',
    desc: 'Dokumen pengiriman barang dengan tanda terima pengirim, supir, dan penerima.',
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 15,
    blocks: [
      { type: 'footer', text: 'Dicetak: {{current_datetime}} | Halaman {page}/{pages}', align: 'center', showLine: true, showOnFirstPage: true },
      { type: 'company_header', companyName: 'Nama Perusahaan', companySubtitle: 'Divisi Logistik', address: 'Jl. Contoh No. 1, Kota, Indonesia', meta: 'Telp: 021-000000 | Email: logistik@company.com' },
      { type: 'divider', thickness: 2, style: 'solid' },
      { type: 'heading', text: 'SURAT JALAN', level: 1, align: 'center', bold: true },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>No. SJ:</strong> {{no_sj}}<br><strong>Tanggal:</strong> {{current_date}}<br><strong>Gudang Asal:</strong> {{gudang_asal}}',
        '<strong>Supir:</strong> {{nama_supir}}<br><strong>Kendaraan:</strong> {{plat_nomor}}<br><strong>Ekspedisi:</strong> {{ekspedisi}}',
      ] },
      { type: 'paragraph', text: 'Kepada Yth.:\n{{nama_penerima}}\n{{alamat_penerima}}\nTelp: {{telp_penerima}}', align: 'left' },
      { type: 'detail_table', title: 'Daftar Barang Dikirim' },
      { type: 'paragraph', text: 'Catatan: {{catatan}}', align: 'left' },
      { type: 'spacer', height: 12 },
      { type: 'signature', titlesText: 'Pengirim\nSupir / Kurir\nPenerima', caption: 'Nama & Tanda Tangan' },
    ],
  },
  {
    id: 'invoice_faktur',
    name: 'Invoice / Faktur',
    icon: '🧾',
    desc: 'Faktur tagihan lengkap dengan detail item, subtotal, PPN, dan informasi pembayaran.',
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 15,
    blocks: [
      { type: 'footer', text: 'Invoice ini sah tanpa tanda tangan basah | Halaman {page}/{pages}', align: 'center', showLine: true, showOnFirstPage: true },
      { type: 'company_header', companyName: 'Nama Perusahaan', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000 | Email: billing@company.com | NPWP: 00.000.000.0-000.000' },
      { type: 'divider', thickness: 2, style: 'solid' },
      { type: 'heading', text: 'FAKTUR / INVOICE', level: 1, align: 'center', bold: true },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>Tagihkan Kepada:</strong><br>{{nama_pelanggan}}<br>{{alamat_pelanggan}}<br>Telp: {{telp_pelanggan}}',
        '<strong>No. Invoice:</strong> {{no_invoice}}<br><strong>Tanggal:</strong> {{current_date}}<br><strong>Jatuh Tempo:</strong> {{tgl_jatuh_tempo}}<br><strong>Status:</strong> {{status_pembayaran}}',
      ] },
      { type: 'detail_table', title: 'Rincian Item' },
      { type: 'table', rows: 4, cols: 2, cellsText: 'Keterangan|Jumlah\nSubtotal|Rp 0\nPPN 11%|Rp 0\nTOTAL|Rp 0', showBorder: true, headerRow: true },
      { type: 'paragraph', text: 'Pembayaran dapat ditransfer ke:\nBank: [Nama Bank]   |   A/n: [Atas Nama]   |   No. Rek: [Nomor Rekening]\n\nCatatan: {{catatan}}', align: 'left' },
      { type: 'signature', titlesText: 'Hormat Kami', caption: 'Nama & Jabatan' },
    ],
  },
  {
    id: 'slip_gaji',
    name: 'Slip Gaji Karyawan',
    icon: '💰',
    desc: 'Slip penggajian karyawan bulanan dengan komponen pendapatan, potongan, dan gaji bersih.',
    paperSize: 'A5',
    orientation: 'landscape',
    marginMm: 12,
    blocks: [
      { type: 'company_header', companyName: 'Nama Perusahaan', companySubtitle: 'Departemen HRD / Penggajian', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000' },
      { type: 'divider', thickness: 2, style: 'solid' },
      { type: 'heading', text: 'SLIP GAJI', level: 1, align: 'center', bold: true },
      { type: 'paragraph', text: 'Periode: {{bulan_gaji}} {{tahun_gaji}}', align: 'center', italic: true },
      { type: 'divider', thickness: 1, style: 'dashed' },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>Data Karyawan</strong><br>Nama: {{nama_karyawan}}<br>NIK: {{nik}}<br>Jabatan: {{jabatan}}<br>Departemen: {{departemen}}',
        '<strong>Rekening Pembayaran</strong><br>Bank: {{nama_bank}}<br>No. Rek: {{no_rekening}}<br>A/n: {{atas_nama_rek}}<br>Tgl Masuk: {{tgl_masuk}}',
      ] },
      { type: 'divider', thickness: 1, style: 'solid' },
      { type: 'table', rows: 6, cols: 4, cellsText: 'PENDAPATAN|Jumlah|POTONGAN|Jumlah\nGaji Pokok|0|BPJS Ketenagakerjaan|0\nTunjangan Jabatan|0|BPJS Kesehatan|0\nTunjangan Transport|0|PPh 21|0\nUang Lembur|0|Potongan Lain|0\nTotal Pendapatan|0|Total Potongan|0', showBorder: true, headerRow: true },
      { type: 'table', rows: 1, cols: 2, cellsText: 'GAJI BERSIH (TAKE HOME PAY)|Rp {{gaji_bersih}}', showBorder: true, headerRow: false },
      { type: 'paragraph', text: 'Terbilang: ** {{terbilang}} Rupiah **', align: 'left', italic: true },
      { type: 'signature', titlesText: 'Karyawan\nHRD Manager\nDirektur', caption: 'Tanda Tangan' },
    ],
  },
  {
    id: 'purchase_order',
    name: 'Purchase Order (PO)',
    icon: '📦',
    desc: 'Order pembelian ke vendor/supplier dengan spesifikasi item, syarat pembayaran, dan persetujuan.',
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 15,
    blocks: [
      { type: 'footer', text: 'PO ini resmi diterbitkan oleh perusahaan | Halaman {page}/{pages}', align: 'center', showLine: true, showOnFirstPage: true },
      { type: 'company_header', companyName: 'Nama Perusahaan (Pembeli)', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000 | Email: purchasing@company.com' },
      { type: 'divider', thickness: 2, style: 'solid' },
      { type: 'heading', text: 'PURCHASE ORDER', level: 1, align: 'center', bold: true },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>Kepada (Vendor):</strong><br>{{nama_vendor}}<br>{{alamat_vendor}}<br>Telp: {{telp_vendor}}',
        '<strong>No. PO:</strong> {{no_po}}<br><strong>Tanggal:</strong> {{current_date}}<br><strong>Dibutuhkan Tgl:</strong> {{tgl_dibutuhkan}}<br><strong>Pembayaran:</strong> {{metode_pembayaran}}',
      ] },
      { type: 'detail_table', title: 'Rincian Barang / Jasa yang Dipesan' },
      { type: 'table', rows: 3, cols: 2, cellsText: 'Keterangan|Jumlah\nSubtotal|Rp 0\nPPN 11%|Rp 0', showBorder: true, headerRow: true },
      { type: 'paragraph', text: 'Syarat & Ketentuan:\n1. Barang/jasa harus sesuai spesifikasi yang tertera.\n2. Pengiriman harap disertai Surat Jalan.\n3. Invoice dapat ditagihkan setelah barang diterima dan ditandatangani.', align: 'left' },
      { type: 'signature', titlesText: 'Dibuat Oleh\nDisetujui (Manager)\nMengetahui (Direksi)', caption: 'Nama & Tanda Tangan' },
    ],
  },
  {
    id: 'surat_resmi',
    name: 'Surat Resmi / Dinas',
    icon: '📜',
    desc: 'Surat resmi instansi/perusahaan dengan kop, nomor surat, dan format paragraf formal.',
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 20,
    blocks: [
      { type: 'header', text: '{{page_title}} | {{current_date}}', align: 'right', showLine: true, showOnFirstPage: false },
      { type: 'company_header', companyName: 'NAMA INSTANSI / PERUSAHAAN', companySubtitle: 'Divisi / Bidang / Bagian', address: 'Jl. Contoh No. 1, Kota, Provinsi 00000', meta: 'Telp: (021) 000000 | Fax: (021) 000001 | Email: info@instansi.go.id' },
      { type: 'divider', thickness: 3, style: 'solid' },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        'Nomor&nbsp;&nbsp;: {{no_surat}}<br>Lampiran: {{lampiran}}<br>Hal&nbsp;&nbsp;&nbsp;&nbsp;: <strong>{{perihal}}</strong>',
        '{{kota}}, {{current_date}}<br><br>Kepada Yth.<br><strong>{{kepada}}</strong><br>di &ndash; <strong>{{kota_tujuan}}</strong>',
      ] },
      { type: 'spacer', height: 16 },
      { type: 'html', html: '<p>Dengan hormat,</p><p style="margin-top:8px;">{{isi_surat_pembuka}}</p><p style="margin-top:8px;">{{isi_surat_inti}}</p><p style="margin-top:8px;">{{isi_surat_penutup}}</p>' },
      { type: 'paragraph', text: 'Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.', align: 'left' },
      { type: 'spacer', height: 8 },
      { type: 'signature', titlesText: 'Hormat Kami', caption: '{{nama_pejabat}}\n{{jabatan_pejabat}}' },
      { type: 'footer', text: 'Halaman {page} dari {pages}', align: 'center', showLine: false, showOnFirstPage: true },
    ],
  },
  {
    id: 'kwitansi',
    name: 'Kwitansi / Receipt',
    icon: '🏷️',
    desc: 'Bukti penerimaan pembayaran dengan watermark LUNAS dan kolom tanda tangan.',
    paperSize: 'A5',
    orientation: 'landscape',
    marginMm: 12,
    blocks: [
      { type: 'company_header', companyName: 'Nama Perusahaan', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000' },
      { type: 'divider', thickness: 2, style: 'solid' },
      { type: 'heading', text: 'KWITANSI', level: 1, align: 'center', bold: true },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>No. Kwitansi:</strong> {{no_kwitansi}}<br><strong>Tanggal:</strong> {{current_date}}',
        '<strong>Sudah Terima Dari:</strong><br>{{nama_pembayar}}<br>{{alamat_pembayar}}',
      ] },
      { type: 'table', rows: 3, cols: 2, cellsText: 'Keterangan Pembayaran|Jumlah\n{{keterangan_bayar}}|Rp {{jumlah_bayar}}\nTOTAL|Rp {{total_bayar}}', showBorder: true, headerRow: true },
      { type: 'paragraph', text: 'Terbilang: ** {{terbilang}} Rupiah **', align: 'left', italic: true, bold: true },
      { type: 'watermark', text: 'LUNAS', opacity: 0.07, fontSize: 90, color: '#16a34a', rotate: -35 },
      { type: 'signature', titlesText: 'Penerima\nPembayar', caption: 'Nama & Tanda Tangan' },
    ],
  },
  {
    id: 'surat_penawaran',
    name: 'Surat Penawaran Harga',
    icon: '📋',
    desc: 'Quotation / penawaran harga barang atau jasa disertai total, diskon, PPN, dan syarat berlaku.',
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 15,
    blocks: [
      { type: 'footer', text: 'Penawaran berlaku 14 hari dari tanggal terbit | Halaman {page}/{pages}', align: 'center', showLine: true, showOnFirstPage: true },
      { type: 'company_header', companyName: 'Nama Perusahaan', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000 | Email: sales@company.com' },
      { type: 'divider', thickness: 2, style: 'solid' },
      { type: 'heading', text: 'SURAT PENAWARAN HARGA', level: 1, align: 'center', bold: true },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>No:</strong> {{no_penawaran}}<br><strong>Tanggal:</strong> {{current_date}}<br><strong>Berlaku s/d:</strong> {{tgl_berlaku}}',
        '<strong>Kepada Yth.:</strong><br>{{nama_pembeli}}<br>{{alamat_pembeli}}<br>Up: {{contact_person}}',
      ] },
      { type: 'html', html: '<p>Dengan hormat,</p><p style="margin-top:6px;">Bersama surat ini kami sampaikan penawaran harga untuk kebutuhan Bapak/Ibu sebagai berikut:</p>' },
      { type: 'detail_table', title: 'Daftar Penawaran' },
      { type: 'table', rows: 4, cols: 2, cellsText: 'Keterangan|Jumlah\nSubtotal|Rp 0\nDiskon|Rp 0\nPPN 11%|Rp 0', showBorder: true, headerRow: true },
      { type: 'paragraph', text: 'Catatan:\n• Harga sudah termasuk ongkos kirim ke lokasi\n• Pembayaran: NET 30 hari setelah invoice\n• Garansi: Sesuai ketentuan pabrik/vendor', align: 'left' },
      { type: 'signature', titlesText: 'Hormat Kami', caption: 'Sales / Marketing' },
    ],
  },
  {
    id: 'berita_acara',
    name: 'Berita Acara',
    icon: '📝',
    desc: 'Berita acara formal multi-pihak dengan dasar, data, kesimpulan, dan tanda tangan saksi.',
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 20,
    blocks: [
      { type: 'header', text: '{{page_title}} | No: {{no_ba}}', align: 'center', showLine: true, showOnFirstPage: false },
      { type: 'company_header', companyName: 'NAMA INSTANSI / PERUSAHAAN', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000' },
      { type: 'divider', thickness: 3, style: 'solid' },
      { type: 'heading', text: 'BERITA ACARA', level: 1, align: 'center', bold: true },
      { type: 'paragraph', text: 'Nomor: {{no_ba}}\nTanggal: {{tgl_ba}}\nTempat: {{tempat_ba}}', align: 'left' },
      { type: 'html', html: '<p><strong>Dasar Pelaksanaan:</strong><br>{{dasar_ba}}</p>' },
      { type: 'field_table', title: 'Data / Informasi' },
      { type: 'html', html: '<p style="margin-top:8px;"><strong>Hasil / Kesimpulan:</strong><br>{{kesimpulan_ba}}</p><p style="margin-top:8px;">Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>' },
      { type: 'signature', titlesText: 'Pihak Pertama\nPihak Kedua\nSaksi 1\nSaksi 2', caption: 'Nama & Jabatan' },
      { type: 'footer', text: 'Halaman {page} dari {pages}', align: 'center', showLine: false, showOnFirstPage: true },
    ],
  },
  {
    id: 'laporan_umum',
    name: 'Laporan / Report',
    icon: '📊',
    desc: 'Laporan periodik data lengkap dengan filter info, tabel detail, ringkasan, dan tanda tangan.',
    paperSize: 'A4',
    orientation: 'landscape',
    marginMm: 12,
    blocks: [
      { type: 'header', text: '{{page_title}} | Dicetak: {{current_datetime}}', align: 'right', showLine: true, showOnFirstPage: true },
      { type: 'company_header', companyName: 'Nama Perusahaan', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000' },
      { type: 'divider', thickness: 2, style: 'solid' },
      { type: 'heading', text: '{{page_title}}', level: 1, align: 'center', bold: true },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>Periode:</strong> {{periode_awal}} s/d {{periode_akhir}}<br><strong>Tanggal Cetak:</strong> {{current_date}}',
        '<strong>Dibuat Oleh:</strong> {{dibuat_oleh}}<br><strong>Divisi:</strong> {{divisi}}',
      ] },
      { type: 'divider', thickness: 1, style: 'dashed' },
      { type: 'field_table', title: 'Informasi / Filter' },
      { type: 'detail_table', title: 'Data Detail' },
      { type: 'table', rows: 3, cols: 2, cellsText: 'RINGKASAN|Jumlah\nTotal Record|0\nTotal Nilai|Rp 0', showBorder: true, headerRow: true },
      { type: 'signature', titlesText: 'Dibuat Oleh\nDiperiksa Oleh\nDisetujui Oleh', caption: 'Nama / Tanggal' },
      { type: 'footer', text: 'Laporan ini dicetak otomatis dari sistem | Halaman {page}/{pages}', align: 'center', showLine: true, showOnFirstPage: true },
    ],
  },
  {
    id: 'surat_kontrak',
    name: 'Surat Kontrak / PKS',
    icon: '🤝',
    desc: 'Perjanjian kerjasama formal dua pihak dengan pasal-pasal dan tanda tangan bermaterai.',
    paperSize: 'A4',
    orientation: 'portrait',
    marginMm: 20,
    blocks: [
      { type: 'header', text: 'PKS No. {{no_kontrak}} — Rahasia / Confidential', align: 'center', showLine: true, showOnFirstPage: false },
      { type: 'company_header', companyName: 'Nama Perusahaan / Instansi', address: 'Jl. Contoh No. 1, Kota', meta: 'Telp: 021-000000' },
      { type: 'divider', thickness: 3, style: 'solid' },
      { type: 'heading', text: 'PERJANJIAN KERJASAMA', level: 1, align: 'center', bold: true },
      { type: 'paragraph', text: 'No: {{no_kontrak}}\nTanggal: {{tgl_kontrak}}\nTentang: {{perihal_kontrak}}', align: 'center' },
      { type: 'divider', thickness: 1, style: 'solid' },
      { type: 'columns', colCount: 2, gap: 24, columnsHtml: [
        '<strong>PIHAK PERTAMA</strong><br>Nama: {{nama_pihak1}}<br>Jabatan: {{jabatan_pihak1}}<br>Perusahaan: {{perusahaan_pihak1}}<br>Alamat: {{alamat_pihak1}}',
        '<strong>PIHAK KEDUA</strong><br>Nama: {{nama_pihak2}}<br>Jabatan: {{jabatan_pihak2}}<br>Perusahaan: {{perusahaan_pihak2}}<br>Alamat: {{alamat_pihak2}}',
      ] },
      { type: 'html', html: '<p><strong>Pasal 1 — Ruang Lingkup</strong><br>{{ruang_lingkup}}</p><p style="margin-top:10px;"><strong>Pasal 2 — Hak dan Kewajiban</strong><br>{{hak_kewajiban}}</p><p style="margin-top:10px;"><strong>Pasal 3 — Jangka Waktu</strong><br>Perjanjian ini berlaku dari <strong>{{tgl_mulai}}</strong> sampai dengan <strong>{{tgl_selesai}}</strong>.</p><p style="margin-top:10px;"><strong>Pasal 4 — Force Majeure</strong><br>Apabila terjadi hal-hal di luar kemampuan para pihak (force majeure), kewajiban masing-masing pihak dapat ditangguhkan selama kondisi tersebut berlangsung.</p>' },
      { type: 'paragraph', text: 'Demikian perjanjian ini dibuat dalam rangkap 2 (dua), bermeterai cukup, dan mempunyai kekuatan hukum yang sama bagi para pihak.', align: 'left' },
      { type: 'signature', titlesText: 'Pihak Pertama\nPihak Kedua', caption: 'Nama & Tanda Tangan' },
      { type: 'footer', text: 'Halaman {page} dari {pages} — Dokumen Ini Bersifat Rahasia', align: 'center', showLine: false, showOnFirstPage: true },
    ],
  },
]

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
        companySubtitle: block?.companySubtitle || 'Alamat / Divisi / Cabang',
        address: block?.address || 'Jl. Contoh Alamat No. 123, Kota, Indonesia',
        meta: block?.meta || 'Telp: 021-000000 | Email: info@company.com',
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
        text: block?.text || 'Isi teks di sini. Bisa menggunakan token seperti {{current_date}} atau {{nama_field}}.',
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
          : ['<strong>Kolom 1</strong><br>Isi konten kolom kiri', '<strong>Kolom 2</strong><br>Isi konten kolom kanan'],
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
        cellsText: block?.cellsText || 'Kolom 1|Kolom 2|Kolom 3\nData A1|Data A2|Data A3\nData B1|Data B2|Data B3',
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
      return { ...base, html: block?.html || '<p style="font-size:12px;">Konten HTML custom. Bisa pakai token: <strong>{{page_title}}</strong></p>' }
    case 'header':
      return {
        ...base,
        text: block?.text || '{{page_title}}',
        align: block?.align || 'left',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: !!block?.bold,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
        showLine: block?.showLine !== false,
        showOnFirstPage: block?.showOnFirstPage !== false,
      }
    case 'footer':
      return {
        ...base,
        text: block?.text || 'Halaman {page}',
        align: block?.align || 'center',
        fontSize: Number(block?.fontSize || 0),
        fontFamily: block?.fontFamily || '',
        bold: !!block?.bold,
        italic: !!block?.italic,
        underline: !!block?.underline,
        color: block?.color || '',
        showLine: block?.showLine !== false,
        showOnFirstPage: block?.showOnFirstPage !== false,
      }
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

  const blocks = Array.isArray(rawConfig.blocks)
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

export function getPaperDimensions(printCfg) {
  const sizeMap = {
    A4: { portrait: { width: 210, height: 297 }, landscape: { width: 297, height: 210 } },
    A5: { portrait: { width: 148, height: 210 }, landscape: { width: 210, height: 148 } },
    Letter: { portrait: { width: 216, height: 279 }, landscape: { width: 279, height: 216 } },
    Legal: { portrait: { width: 216, height: 356 }, landscape: { width: 356, height: 216 } },
  }
  const paper = sizeMap[printCfg?.paperSize || 'A4'] || sizeMap.A4
  return paper[printCfg?.orientation === 'landscape' ? 'landscape' : 'portrait']
}

export function getPaperPreviewStyle(printCfg) {
  const dims = getPaperDimensions(printCfg)
  return {
    width: `${dims.width}mm`,
    height: `${dims.height}mm`,
    padding: `${Number(printCfg?.marginMm || 15)}mm`,
    overflow: 'hidden',
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
