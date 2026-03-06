// Preset Templates — koleksi template field siap pakai untuk builder
export const PRESET_TEMPLATES = [
  {
    name: 'Alamat Set',
    icon: '🏠',
    fields: [
      {
        field: 'provinsi', label: 'Provinsi', type: 'select', required: true,
        sourceType: 'api',
        apiUrl: 'https://backend.qqltech.com/kodepos/region/provinsi',
        displayField: 'name', valueField: 'name',
        placeholder: 'Pilih Provinsi',
      },
      {
        field: 'kota', label: 'Kota', type: 'select', required: true,
        sourceType: 'api',
        apiUrl: 'https://backend.qqltech.com/kodepos/region/kabupaten-kota',
        displayField: 'name', valueField: 'name',
        dependsOn: 'provinsi', dependsOnParam: 'provinsi',
        placeholder: 'Pilih Kota',
      },
      {
        field: 'kecamatan', label: 'Kecamatan', type: 'select', required: true,
        sourceType: 'api',
        apiUrl: 'https://backend.qqltech.com/kodepos/region/kecamatan',
        displayField: 'name', valueField: 'name',
        dependsOn: 'kota', dependsOnParam: 'kota',
        placeholder: 'Pilih Kecamatan',
      },
      { field: 'kode_pos', label: 'Kode Pos', type: 'text', placeholder: 'Isi Kode Pos' },
      { field: 'alamat', label: 'Alamat', type: 'textarea', required: true, fullWidth: true, placeholder: 'Masukan Alamat Lengkap' },
    ],
  },
  {
    name: 'Contact Info',
    icon: '📞',
    fields: [
      { field: 'nama', label: 'Nama Lengkap', type: 'text', required: true },
      { field: 'email', label: 'Email', type: 'email', required: true },
      { field: 'telepon', label: 'No. Telepon', type: 'tel', required: true },
      { field: 'hp', label: 'No. HP', type: 'tel' },
    ],
  },
  {
    name: 'Perusahaan',
    icon: '🏢',
    fields: [
      { field: 'nama_perusahaan', label: 'Nama Perusahaan', type: 'text', required: true },
      { field: 'npwp', label: 'NPWP', type: 'text' },
      { field: 'alamat_perusahaan', label: 'Alamat Perusahaan', type: 'textarea', required: true },
      { field: 'telepon_perusahaan', label: 'Telepon', type: 'tel' },
      { field: 'email_perusahaan', label: 'Email', type: 'email' },
    ],
  },
  {
    name: 'Rekening Bank',
    icon: '🏦',
    fields: [
      { field: 'nama_bank', label: 'Nama Bank', type: 'text', required: true },
      { field: 'no_rekening', label: 'No. Rekening', type: 'text', required: true },
      { field: 'atas_nama', label: 'Atas Nama', type: 'text', required: true },
      { field: 'cabang', label: 'Cabang', type: 'text' },
    ],
  },
  {
    name: 'Harga & Diskon',
    icon: '💰',
    desc: 'Harga − Diskon% → Total',
    fields: [
      { field: 'harga', label: 'Harga', type: 'currency', required: true, currencyPrefix: 'Rp', allowDecimal: true },
      { field: 'diskon_persen', label: 'Diskon (%)', type: 'fieldnumber_decimal', defaultValue: '0' },
      {
        field: 'total', label: 'Total', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'harga' },
          { type: 'op', value: '-' },
          { type: 'paren', value: '(' },
          { type: 'field', value: 'harga' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'diskon_persen' },
          { type: 'op', value: '/' },
          { type: 'number', value: '100' },
          { type: 'paren', value: ')' },
        ],
      },
    ],
  },
  {
    name: 'Qty × Harga',
    icon: '🛒',
    desc: 'Qty × Harga Satuan → Subtotal',
    fields: [
      { field: 'qty', label: 'Qty', type: 'fieldnumber', required: true },
      { field: 'harga_satuan', label: 'Harga Satuan', type: 'currency', required: true, currencyPrefix: 'Rp', allowDecimal: true },
      {
        field: 'subtotal', label: 'Subtotal', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'qty' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'harga_satuan' },
        ],
      },
    ],
  },
  {
    name: 'Invoice Lengkap',
    icon: '🧾',
    desc: 'Qty × Harga − Diskon% + PPN 11%',
    fields: [
      { field: 'qty', label: 'Qty', type: 'fieldnumber', required: true },
      { field: 'harga_satuan', label: 'Harga Satuan', type: 'currency', required: true, currencyPrefix: 'Rp', allowDecimal: true },
      {
        field: 'subtotal', label: 'Subtotal', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'qty' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'harga_satuan' },
        ],
      },
      { field: 'diskon_persen', label: 'Diskon (%)', type: 'fieldnumber_decimal', defaultValue: '0' },
      {
        field: 'after_diskon', label: 'Setelah Diskon', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'subtotal' },
          { type: 'op', value: '-' },
          { type: 'paren', value: '(' },
          { type: 'field', value: 'subtotal' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'diskon_persen' },
          { type: 'op', value: '/' },
          { type: 'number', value: '100' },
          { type: 'paren', value: ')' },
        ],
      },
      {
        field: 'ppn', label: 'PPN (11%)', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'after_diskon' },
          { type: 'op', value: '*' },
          { type: 'number', value: '11' },
          { type: 'op', value: '/' },
          { type: 'number', value: '100' },
        ],
      },
      {
        field: 'grand_total', label: 'Grand Total', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'after_diskon' },
          { type: 'op', value: '+' },
          { type: 'field', value: 'ppn' },
        ],
      },
    ],
  },
  {
    name: 'Margin & Profit',
    icon: '📊',
    desc: 'Harga Jual − Harga Beli → Profit & Margin%',
    fields: [
      { field: 'harga_beli', label: 'Harga Beli', type: 'currency', required: true, currencyPrefix: 'Rp', allowDecimal: true },
      { field: 'harga_jual', label: 'Harga Jual', type: 'currency', required: true, currencyPrefix: 'Rp', allowDecimal: true },
      {
        field: 'profit', label: 'Profit', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'harga_jual' },
          { type: 'op', value: '-' },
          { type: 'field', value: 'harga_beli' },
        ],
      },
      {
        field: 'margin_persen', label: 'Margin (%)', type: 'fieldnumber_decimal', readonly: true,
        computedFormula: [
          { type: 'paren', value: '(' },
          { type: 'field', value: 'profit' },
          { type: 'op', value: '/' },
          { type: 'field', value: 'harga_jual' },
          { type: 'paren', value: ')' },
          { type: 'op', value: '*' },
          { type: 'number', value: '100' },
        ],
      },
    ],
  },
  {
    name: 'Gaji Karyawan',
    icon: '👤',
    desc: 'Gaji Pokok + Tunjangan − Potongan → Take Home Pay',
    fields: [
      { field: 'gaji_pokok', label: 'Gaji Pokok', type: 'currency', required: true, currencyPrefix: 'Rp', allowDecimal: true },
      { field: 'tunjangan', label: 'Tunjangan', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, defaultValue: '0' },
      { field: 'potongan', label: 'Potongan', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, defaultValue: '0' },
      {
        field: 'take_home_pay', label: 'Take Home Pay', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'gaji_pokok' },
          { type: 'op', value: '+' },
          { type: 'field', value: 'tunjangan' },
          { type: 'op', value: '-' },
          { type: 'field', value: 'potongan' },
        ],
      },
    ],
  },
  {
    name: 'Luas & Volume',
    icon: '📐',
    desc: 'Panjang × Lebar → Luas, × Tinggi → Volume',
    fields: [
      { field: 'panjang', label: 'Panjang', type: 'fieldnumber_decimal', required: true },
      { field: 'lebar', label: 'Lebar', type: 'fieldnumber_decimal', required: true },
      {
        field: 'luas', label: 'Luas', type: 'fieldnumber_decimal', readonly: true,
        computedFormula: [
          { type: 'field', value: 'panjang' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'lebar' },
        ],
      },
      { field: 'tinggi', label: 'Tinggi', type: 'fieldnumber_decimal' },
      {
        field: 'volume', label: 'Volume', type: 'fieldnumber_decimal', readonly: true,
        computedFormula: [
          { type: 'field', value: 'panjang' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'lebar' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'tinggi' },
        ],
      },
    ],
  },
  {
    name: 'Pinjaman Cicilan',
    icon: '🏧',
    desc: 'Total Pinjaman ÷ Tenor → Cicilan/Bulan',
    fields: [
      { field: 'total_pinjaman', label: 'Total Pinjaman', type: 'currency', required: true, currencyPrefix: 'Rp', allowDecimal: true },
      { field: 'tenor_bulan', label: 'Tenor (Bulan)', type: 'fieldnumber', required: true },
      {
        field: 'cicilan_per_bulan', label: 'Cicilan / Bulan', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'total_pinjaman' },
          { type: 'op', value: '/' },
          { type: 'field', value: 'tenor_bulan' },
        ],
      },
    ],
  },
  {
    name: 'Berat & Ongkir',
    icon: '📦',
    desc: 'Qty × Berat Satuan → Total Berat, × Tarif → Ongkir',
    fields: [
      { field: 'qty_brg', label: 'Qty Barang', type: 'fieldnumber', required: true },
      { field: 'berat_satuan', label: 'Berat / pcs (kg)', type: 'fieldnumber_decimal', required: true },
      {
        field: 'total_berat', label: 'Total Berat (kg)', type: 'fieldnumber_decimal', readonly: true,
        computedFormula: [
          { type: 'field', value: 'qty_brg' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'berat_satuan' },
        ],
      },
      { field: 'tarif_per_kg', label: 'Tarif / kg', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, required: true },
      {
        field: 'ongkir', label: 'Ongkir', type: 'currency', currencyPrefix: 'Rp', allowDecimal: true, readonly: true,
        computedFormula: [
          { type: 'field', value: 'total_berat' },
          { type: 'op', value: '*' },
          { type: 'field', value: 'tarif_per_kg' },
        ],
      },
    ],
  },
]
