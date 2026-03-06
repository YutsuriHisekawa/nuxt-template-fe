<script setup>
import { BookOpen, Plus, MousePointer, GripVertical, Trash2, Settings2, Layers, Table2, Zap, FileText, Copy, Download, Upload, Columns3, SlidersHorizontal, Eye, Search, Calculator, ListChecks, Footprints, FolderOpen, ShieldCheck, ToggleLeft } from 'lucide-vue-next'

const open = defineModel('open', { type: Boolean, default: false })

// Search
const searchQuery = ref('')

// Sections data
const sections = [
  { id: 'form-builder', label: 'Form Builder', icon: Settings2 },
  { id: 'operasi-field', label: 'Operasi Field', icon: MousePointer },
  { id: 'tipe-komponen', label: 'Tipe Komponen', icon: Columns3 },
  { id: 'konfigurasi-umum', label: 'Konfigurasi Umum', icon: SlidersHorizontal },
  { id: 'select-popup', label: 'Select & Popup', icon: FolderOpen },
  { id: 'switch-date', label: 'Switch & Date', icon: ToggleLeft },
  { id: 'validation', label: 'Validasi', icon: ShieldCheck },
  { id: 'visible-when', label: 'Visible When', icon: Eye },
  { id: 'required-when', label: 'Required When', icon: ShieldCheck },
  { id: 'computed-formula', label: 'Auto-Hitung (Formula)', icon: Calculator },
  { id: 'field-group', label: 'Field Group', icon: FolderOpen },
  { id: 'preset-template', label: 'Preset Template', icon: FileText },
  { id: 'wizard-steps', label: 'Wizard Steps', icon: Footprints },
  { id: 'layout', label: 'Layout & Kolom', icon: Columns3 },
  { id: 'upload', label: 'Upload File', icon: Upload },
  { id: 'drag-drop', label: 'Drag & Drop', icon: GripVertical },
  { id: 'undo-redo', label: 'Undo / Redo', icon: Copy },
  { id: 'search-filter', label: 'Search & Filter', icon: Search },
  { id: 'bulk-select', label: 'Bulk Select', icon: ListChecks },
  { id: 'import-export', label: 'Import / Export', icon: Download },
  { id: 'detail-tabs', label: 'Detail Tabs', icon: Layers },
  { id: 'landing-config', label: 'Konfigurasi Landing', icon: Table2 },
  { id: 'generate', label: 'Generate', icon: Zap },
  { id: 'tips', label: 'Tips & Catatan', icon: FileText },
]

const activeSection = ref('form-builder')

function scrollToSection(id) {
  activeSection.value = id
  const el = document.getElementById(`doc-${id}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Filter sidebar based on search
const filteredSections = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return sections
  return sections.filter(s => s.label.toLowerCase().includes(q))
})

// Filter content visibility based on search
const contentQuery = computed(() => searchQuery.value.toLowerCase().trim())
function sectionVisible(id) {
  if (!contentQuery.value) return true
  const s = sections.find(x => x.id === id)
  if (s && s.label.toLowerCase().includes(contentQuery.value)) return true
  // Check if any text in the section matches
  const el = document.getElementById(`doc-${id}`)
  if (el && el.textContent?.toLowerCase().includes(contentQuery.value)) return true
  return !contentQuery.value
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="max-w-6xl max-h-[92vh] p-0 gap-0">
      <!-- Header -->
      <div class="border-b border-border px-6 py-4 shrink-0">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-lg">
            <BookOpen class="h-5 w-5 text-primary" />
            Dokumentasi Builder
          </DialogTitle>
          <DialogDescription>Panduan lengkap penggunaan MVG Page Builder</DialogDescription>
        </DialogHeader>
        <!-- Search -->
        <div class="mt-3 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari dokumentasi... (misal: formula, select, wizard)"
            class="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <!-- Body: sidebar + content -->
      <div class="flex min-h-0 flex-1" style="height: calc(92vh - 140px);">
        <!-- Sidebar -->
        <nav class="w-56 shrink-0 border-r border-border overflow-y-auto py-2 px-2 bg-muted/30">
          <button
            v-for="s in filteredSections"
            :key="s.id"
            class="w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors"
            :class="activeSection === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
            @click="scrollToSection(s.id)"
          >
            <component :is="s.icon" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ s.label }}</span>
          </button>
        </nav>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-8 py-6">
          <div class="space-y-10 text-sm pb-8 max-w-4xl">

            <!-- ============================================================ -->
            <!-- 1. FORM BUILDER -->
            <!-- ============================================================ -->
            <section id="doc-form-builder" class="space-y-3" v-show="sectionVisible('form-builder')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Settings2 class="h-4 w-4 text-primary" /> Form Builder
              </h2>
              <p class="text-muted-foreground">Tab ini untuk mendesain form input. Setiap field langsung ter-preview secara live. State tersimpan di cookie selama 24 jam sehingga aman refresh.</p>
            </section>

            <!-- 1.1 Operasi Field -->
            <section id="doc-operasi-field" class="space-y-3" v-show="sectionVisible('operasi-field')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <MousePointer class="h-4 w-4 text-primary" /> Operasi Field
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <Plus class="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div><strong>Tambah Field</strong><br><span class="text-muted-foreground">Klik area "+ Tambah Field" di bawah form. Panel konfigurasi otomatis terbuka.</span></div>
                </div>
                <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <MousePointer class="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div><strong>Edit Field</strong><br><span class="text-muted-foreground">Hover field → klik ikon pensil. Panel konfigurasi terbuka di sisi kanan.</span></div>
                </div>
                <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <GripVertical class="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div><strong>Pindah Urutan</strong><br><span class="text-muted-foreground">Hover field → klik panah atas/bawah, atau drag & drop langsung.</span></div>
                </div>
                <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <Trash2 class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div><strong>Hapus Field</strong><br><span class="text-muted-foreground">Hover field → klik ikon tempat sampah merah.</span></div>
                </div>
                <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <Copy class="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div><strong>Duplikasi Field</strong><br><span class="text-muted-foreground">Hover field → klik ikon copy. Semua konfigurasi ikut terduplikasi, field name ditambah suffix "_copy".</span></div>
                </div>
              </div>
            </section>

            <!-- 1.2 Tipe Komponen -->
            <section id="doc-tipe-komponen" class="space-y-3" v-show="sectionVisible('tipe-komponen')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Columns3 class="h-4 w-4 text-primary" /> Tipe Komponen
              </h2>
              <p class="text-muted-foreground">Pilih tipe di panel kanan setelah menambah field. Total 24 tipe tersedia:</p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold w-24">Kategori</th>
                      <th class="text-left py-1.5 pr-2 font-semibold w-44">Tipe</th>
                      <th class="text-left py-1.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="7">Input</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">text</code></td><td class="py-1.5">Input teks standar</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">number</code></td><td class="py-1.5">Input angka (format biasa)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">decimal</code></td><td class="py-1.5">Input angka desimal</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">email</code></td><td class="py-1.5">Input email</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">tel</code></td><td class="py-1.5">Input telepon</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">password</code></td><td class="py-1.5">Input password (hidden)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">textarea</code></td><td class="py-1.5">Area teks multi-baris</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="4">Number</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldnumber</code></td><td class="py-1.5">Input angka dengan formatting ribuan (1.000.000)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldnumber_decimal</code></td><td class="py-1.5">Input angka desimal dengan formatting</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">currency</code></td><td class="py-1.5">Input mata uang dengan prefix (Rp) & formatting ribuan</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">slider</code></td><td class="py-1.5">Slider range (min/max/step + unit label)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="2">Tanggal</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">date</code></td><td class="py-1.5">Date picker</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">datetime</code></td><td class="py-1.5">Date & time picker</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="4">Pilihan</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">select</code></td><td class="py-1.5">Dropdown select (dari API atau static)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">select_creatable</code></td><td class="py-1.5">Select + bisa input opsi baru</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">popup</code></td><td class="py-1.5">Dialog popup dengan tabel pencarian (AG Grid)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">radio</code></td><td class="py-1.5">Radio button group</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="2">Toggle</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">switch</code></td><td class="py-1.5">Toggle switch (Aktif/Nonaktif)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldbox</code></td><td class="py-1.5">Checkbox (Ya/Tidak)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="2">Upload</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">upload</code></td><td class="py-1.5">Upload file tunggal dengan preview & kompresi otomatis</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">multi_upload</code></td><td class="py-1.5">Upload banyak file (thumbnail grid, carousel, PDF support)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="4">Layout</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">section</code></td><td class="py-1.5">Section divider — judul pemisah antar grup field</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">space</code></td><td class="py-1.5">Pemisah / spacer (tidak ada input)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldgroup</code></td><td class="py-1.5">Field Group Start — membungkus field dalam grup</td></tr>
                    <tr><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldgroup_end</code></td><td class="py-1.5">Field Group End — penutup grup (otomatis ditambahkan)</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Konfigurasi Umum -->
            <section id="doc-konfigurasi-umum" class="space-y-3" v-show="sectionVisible('konfigurasi-umum')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <SlidersHorizontal class="h-4 w-4 text-primary" /> Konfigurasi Umum Field
              </h2>
              <p class="text-muted-foreground text-xs">Setiap field yang dipilih dapat dikonfigurasi di panel kanan:</p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Opsi</th>
                      <th class="text-left py-1.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Field Name</td><td class="py-1.5">Nama kolom database (misal: <code class="bg-muted px-1 rounded">nama_supplier</code>). Harus unik.</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Label</td><td class="py-1.5">Label yang ditampilkan di atas input</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Placeholder</td><td class="py-1.5">Teks petunjuk di dalam input</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Default Value</td><td class="py-1.5">Nilai awal saat form kosong</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Required</td><td class="py-1.5">Wajib diisi — menampilkan error jika kosong</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Pesan Error</td><td class="py-1.5">Pesan kustom saat validasi gagal (default: "{Label} Wajib Di isi")</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Readonly</td><td class="py-1.5">Field tidak bisa diedit, hanya tampil</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Full Width</td><td class="py-1.5">Gunakan lebar penuh (span seluruh kolom) di layout grid</td></tr>
                    <tr><td class="py-1.5 pr-2 font-medium text-foreground">Depends On</td><td class="py-1.5">Field induk untuk cascading/dependency (child disabled sampai parent dipilih)</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Select & Popup -->
            <section id="doc-select-popup" class="space-y-3" v-show="sectionVisible('select-popup')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <FolderOpen class="h-4 w-4 text-primary" /> Select, Popup & Cascading
              </h2>
              <div class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-2 text-xs text-muted-foreground">
                <p class="font-semibold text-amber-700 dark:text-amber-400">Select & Select Creatable</p>
                <p>Punya 2 sumber data:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>API</strong> — Data dari endpoint (misal <code class="bg-muted px-1 py-0.5 rounded">/api/dynamic/m_supplier</code>). Atur: Display Field, Value Field, dan API Params.</li>
                  <li><strong>Static / Hardcode</strong> — Opsi manual (misal: Ya/Tidak, Laki-laki/Perempuan). Tambah opsi satu per satu.</li>
                </ul>
              </div>
              <div class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-2 text-xs text-muted-foreground mt-2">
                <p class="font-semibold text-amber-700 dark:text-amber-400">FieldPopUp (Popup)</p>
                <p>Menampilkan dialog tabel dengan kolom yang bisa dikonfigurasi:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>Popup Columns</strong> — Kolom AG Grid (field, headerName, width %)</li>
                  <li><strong>Search Fields</strong> — Field yang bisa di-search di dialog popup</li>
                  <li><strong>Dialog Title</strong> — Judul dialog popup</li>
                </ul>
              </div>
              <div class="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-3 space-y-2 text-xs text-muted-foreground mt-2">
                <p class="font-semibold text-blue-700 dark:text-blue-400">Cascading / Dependency</p>
                <p>Untuk membuat field saling bergantung (misal: Provinsi → Kota → Kecamatan):</p>
                <ol class="list-decimal list-inside space-y-1">
                  <li>Pada field <strong>anak</strong>, set <strong>Depends On</strong> ke field induk</li>
                  <li>Field anak akan disabled sampai induk dipilih</li>
                  <li>Untuk API: isi <strong>Depends On Param</strong> — nama query parameter dikirim ke API</li>
                  <li>Untuk Static: setiap opsi bisa di-assign <strong>Parent Value</strong> agar terfilter</li>
                  <li>Saat induk berubah, semua keturunan (anak, cucu, dst.) otomatis di-reset</li>
                </ol>
                <div class="mt-2 bg-muted/60 rounded-md p-2 font-mono text-[11px]">
                  <p class="font-sans font-semibold text-foreground mb-1">Contoh: Provinsi → Kota</p>
                  <p>Field "Kota": Depends On = <code>m_provinsi_id</code></p>
                  <p>API: <code>/api/dynamic/m_kota</code></p>
                  <p>Depends On Param: <code>filter_column_m_provinsi_id</code></p>
                </div>
              </div>
            </section>

            <!-- Switch & Date -->
            <section id="doc-switch-date" class="space-y-3" v-show="sectionVisible('switch-date')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <ToggleLeft class="h-4 w-4 text-primary" /> Switch, Checkbox & Date
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div class="rounded-lg border border-border p-2.5 space-y-1">
                  <p class="font-semibold text-foreground">Switch & FieldBox</p>
                  <ul class="list-disc list-inside space-y-0.5">
                    <li>Default Value: <code class="bg-muted px-1 rounded">true</code> / <code class="bg-muted px-1 rounded">false</code></li>
                    <li>Label True: teks saat aktif (default: "Aktif" / "Ya")</li>
                    <li>Label False: teks saat nonaktif</li>
                  </ul>
                </div>
                <div class="rounded-lg border border-border p-2.5 space-y-1">
                  <p class="font-semibold text-foreground">Date & DateTime</p>
                  <ul class="list-disc list-inside space-y-0.5">
                    <li>Default Value: "Kosong" atau "Hari Ini"</li>
                    <li>"Hari Ini" otomatis isi tanggal saat form dibuka</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- Validation -->
            <section id="doc-validation" class="space-y-3" v-show="sectionVisible('validation')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <ShieldCheck class="h-4 w-4 text-primary" /> Validation Rules
              </h2>
              <p class="text-xs text-muted-foreground">Selain <strong>Required</strong>, setiap field bisa dikonfigurasi validasi tambahan:</p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Opsi</th>
                      <th class="text-left py-1.5 pr-2 font-semibold">Berlaku Untuk</th>
                      <th class="text-left py-1.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Min Length</td><td class="py-1.5 pr-2">text, email, tel, password, textarea</td><td class="py-1.5">Jumlah karakter minimal</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Max Length</td><td class="py-1.5 pr-2">text, email, tel, password, textarea</td><td class="py-1.5">Jumlah karakter maksimal</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Min Value</td><td class="py-1.5 pr-2">number, decimal, fieldnumber, currency, slider</td><td class="py-1.5">Nilai angka minimum</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Max Value</td><td class="py-1.5 pr-2">number, decimal, fieldnumber, currency, slider</td><td class="py-1.5">Nilai angka maksimum</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Regex Pattern</td><td class="py-1.5 pr-2">text, email, tel, number, decimal</td><td class="py-1.5">Regex JavaScript (tanpa pembungkus /)</td></tr>
                    <tr><td class="py-1.5 pr-2 font-medium text-foreground">Pesan Pattern</td><td class="py-1.5 pr-2">text, email, tel, number, decimal</td><td class="py-1.5">Pesan error jika regex tidak match</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Visible When -->
            <section id="doc-visible-when" class="space-y-3" v-show="sectionVisible('visible-when')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Eye class="h-4 w-4 text-primary" /> Conditional Visibility (visibleWhen)
              </h2>
              <p class="text-xs text-muted-foreground">Field bisa disembunyikan/ditampilkan berdasarkan nilai field lain. Contoh: field "Alasan Reject" hanya muncul jika status = "rejected".</p>
              <div class="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Langkah:</strong></p>
                <ol class="list-decimal list-inside space-y-0.5">
                  <li>Buka panel field → di bagian <strong>Visible When</strong></li>
                  <li>Pilih <strong>field</strong> dari dropdown</li>
                  <li>Pilih atau ketik <strong>nilai</strong> — untuk select/popup/radio, opsi otomatis dimuat dari konfigurasi field tsb</li>
                </ol>
                <p class="mt-2">Dihasilkan sebagai <code class="bg-muted px-1 py-0.5 rounded">v-if="values.status === 'rejected'"</code> di kode generated.</p>
                <p class="mt-1 text-amber-600 dark:text-amber-400">Di builder preview, field dengan visibleWhen yang tidak terpenuhi tampil transparan (opacity rendah).</p>
              </div>
            </section>

            <!-- Required When -->
            <section id="doc-required-when" class="space-y-3" v-show="sectionVisible('required-when')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <ShieldCheck class="h-4 w-4 text-primary" /> Conditional Required (requiredWhen)
              </h2>
              <p class="text-xs text-muted-foreground">Field bisa diwajibkan secara kondisional — hanya required jika field lain bernilai tertentu.</p>
              <div class="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Langkah:</strong></p>
                <ol class="list-decimal list-inside space-y-0.5">
                  <li>Buka panel field → di bagian <strong>Required When</strong></li>
                  <li>Pilih <strong>field</strong> dari dropdown</li>
                  <li>Pilih atau ketik <strong>nilai</strong> pemicu</li>
                </ol>
                <p class="mt-2"><strong>Contoh:</strong> Field "NPWP" required hanya jika "Tipe Pembayaran" = "Faktur Pajak".</p>
                <p class="mt-1">Ditandai badge <span class="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 text-[9px] px-1 py-0.5 rounded">Req. Kondisional</span> di card field.</p>
              </div>
            </section>

            <!-- Computed Formula -->
            <section id="doc-computed-formula" class="space-y-3" v-show="sectionVisible('computed-formula')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Calculator class="h-4 w-4 text-primary" /> Auto-Hitung (Computed Formula)
              </h2>
              <p class="text-xs text-muted-foreground">Field bisa dihitung otomatis berdasarkan nilai field lain. Field dengan formula otomatis menjadi readonly/disabled.</p>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Template Formula (Rekomendasi)</h3>
              <p class="text-xs text-muted-foreground">Cara termudah: pilih dari <strong>template</strong> yang sudah disediakan. Tidak perlu menyusun formula manual.</p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Kategori</th>
                      <th class="text-left py-1.5 pr-2 font-semibold">Template</th>
                      <th class="text-left py-1.5 font-semibold">Rumus</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="4">Dasar</td><td class="py-1.5 pr-2">Tambah (A + B)</td><td class="py-1.5 font-mono text-[11px]">A + B</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">Kurang (A − B)</td><td class="py-1.5 font-mono text-[11px]">A − B</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">Kali (A × B)</td><td class="py-1.5 font-mono text-[11px]">A × B</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">Bagi (A ÷ B)</td><td class="py-1.5 font-mono text-[11px]">A ÷ B</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="5">Persentase</td><td class="py-1.5 pr-2">Diskon %</td><td class="py-1.5 font-mono text-[11px]">A − (A × B ÷ 100)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">Markup %</td><td class="py-1.5 font-mono text-[11px]">A + (A × B ÷ 100)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">Persen Dari</td><td class="py-1.5 font-mono text-[11px]">A × B ÷ 100</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">PPN 11%</td><td class="py-1.5 font-mono text-[11px]">A × 11 ÷ 100</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">Harga + PPN 11%</td><td class="py-1.5 font-mono text-[11px]">A + (A × 11 ÷ 100)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground" rowspan="3">3 Field</td><td class="py-1.5 pr-2">Qty × Harga − Diskon</td><td class="py-1.5 font-mono text-[11px]">(A × B) − C</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2">Qty × Harga − Diskon%</td><td class="py-1.5 font-mono text-[11px]">(A × B) − ((A × B) × C ÷ 100)</td></tr>
                    <tr><td class="py-1.5 pr-2">A + B + C</td><td class="py-1.5 font-mono text-[11px]">A + B + C</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Cara Pakai Template:</h3>
              <ol class="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                <li>Buka panel field → scroll ke bagian <strong>Computed / Auto-Fill</strong></li>
                <li>Pilih template dari daftar kategori (Dasar / Persentase / 3 Field)</li>
                <li>Pilih field A, B (dan C jika 3 field) dari dropdown</li>
                <li>Klik <strong>"Terapkan"</strong></li>
              </ol>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Manual Builder (Advanced)</h3>
              <p class="text-xs text-muted-foreground">Untuk formula yang tidak ada di template, buka <strong>"Builder Manual"</strong> (ada di bawah template). Komponen:</p>
              <div class="flex flex-wrap gap-1.5 text-[11px]">
                <span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Field (dari dropdown)</span>
                <span class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">Operator: + − × ÷</span>
                <span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">Angka konstanta</span>
                <span class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">Kurung ( )</span>
              </div>
              <p class="text-xs text-muted-foreground mt-2">Formula ditampilkan sebagai token berwarna. Klik ✕ untuk menghapus per token, atau "Hapus Semua" untuk reset.</p>
              <p class="text-xs text-muted-foreground">Formula berantai didukung — field A bisa dihitung dari field B yang juga dihitung dari field C. Multi-pass evaluation memastikan semua chain terkomputasi.</p>
            </section>

            <!-- Field Group -->
            <section id="doc-field-group" class="space-y-3" v-show="sectionVisible('field-group')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <FolderOpen class="h-4 w-4 text-primary" /> Field Group
              </h2>
              <p class="text-xs text-muted-foreground">Membungkus beberapa field dalam grup visual dengan judul. Berguna untuk mengelompokkan field yang berhubungan (misal: "Informasi Pengiriman", "Data Pajak").</p>
              <div class="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Cara pakai:</strong></p>
                <ol class="list-decimal list-inside space-y-0.5">
                  <li>Tambah field baru → ubah tipe ke <code class="bg-muted px-1 rounded">fieldgroup</code></li>
                  <li>Field <code class="bg-muted px-1 rounded">fieldgroup_end</code> otomatis ditambahkan sebagai penutup</li>
                  <li>Klik <strong>"+ Tambah Field di Group ini"</strong> untuk menambah field di dalam grup</li>
                  <li>Atur judul grup di <strong>Label</strong></li>
                  <li>Grup bisa dikombinasi dengan <strong>visibleWhen</strong> — semua field di dalam grup ikut show/hide</li>
                </ol>
                <p class="mt-1">Field di dalam grup ditandai dengan <span class="border-l-2 border-l-primary/40 pl-1">garis biru di kiri</span>.</p>
              </div>
            </section>

            <!-- Preset Template -->
            <section id="doc-preset-template" class="space-y-3" v-show="sectionVisible('preset-template')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <FileText class="h-4 w-4 text-primary" /> Preset Template
              </h2>
              <p class="text-xs text-muted-foreground">Klik tombol <strong>"Preset"</strong> untuk menambahkan sekumpulan field sekaligus. Preset yang memiliki field computed akan langsung jalan perhitungannya.</p>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Preset Data</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Preset</th>
                      <th class="text-left py-1.5 pr-2 font-semibold">Isi</th>
                      <th class="text-left py-1.5 font-semibold">Fitur Khusus</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">🏠 Alamat Set</td><td class="py-1.5 pr-2">Provinsi, Kota, Kecamatan, Kode Pos, Alamat</td><td class="py-1.5">Cascading select (API kodepos), textarea alamat</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">📞 Contact Info</td><td class="py-1.5 pr-2">Nama, Email, Telepon, HP</td><td class="py-1.5">—</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">🏢 Perusahaan</td><td class="py-1.5 pr-2">Nama, NPWP, Alamat, Telp, Email</td><td class="py-1.5">—</td></tr>
                    <tr><td class="py-1.5 pr-2 font-medium text-foreground">🏦 Rekening Bank</td><td class="py-1.5 pr-2">Nama Bank, No. Rek, Atas Nama, Cabang</td><td class="py-1.5">—</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Preset Perhitungan</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Preset</th>
                      <th class="text-left py-1.5 pr-2 font-semibold">Rumus</th>
                      <th class="text-left py-1.5 font-semibold">Field Otomatis</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">💰 Harga & Diskon</td><td class="py-1.5 pr-2 font-mono text-[11px]">Harga − (Harga × Diskon% ÷ 100)</td><td class="py-1.5">Total (auto)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">🛒 Qty × Harga</td><td class="py-1.5 pr-2 font-mono text-[11px]">Qty × Harga Satuan</td><td class="py-1.5">Subtotal (auto)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">🧾 Invoice Lengkap</td><td class="py-1.5 pr-2 font-mono text-[11px]">Qty × Harga → Diskon% → PPN 11%</td><td class="py-1.5">Subtotal, After Diskon, PPN, Grand Total (4 auto)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">📊 Margin & Profit</td><td class="py-1.5 pr-2 font-mono text-[11px]">Jual − Beli → Profit, Margin%</td><td class="py-1.5">Profit, Margin% (auto)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">👤 Gaji Karyawan</td><td class="py-1.5 pr-2 font-mono text-[11px]">Pokok + Tunjangan − Potongan</td><td class="py-1.5">Take Home Pay (auto)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">📐 Luas & Volume</td><td class="py-1.5 pr-2 font-mono text-[11px]">P × L → Luas, × T → Volume</td><td class="py-1.5">Luas, Volume (auto)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">🏧 Pinjaman Cicilan</td><td class="py-1.5 pr-2 font-mono text-[11px]">Total ÷ Tenor</td><td class="py-1.5">Cicilan/Bulan (auto)</td></tr>
                    <tr><td class="py-1.5 pr-2 font-medium text-foreground">📦 Berat & Ongkir</td><td class="py-1.5 pr-2 font-mono text-[11px]">Qty × Berat → Total, × Tarif → Ongkir</td><td class="py-1.5">Total Berat, Ongkir (auto)</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="text-xs text-muted-foreground italic">Semua field "auto" bersifat readonly dan otomatis terisi di preview maupun di halaman generated.</p>
            </section>

            <!-- Wizard Steps -->
            <section id="doc-wizard-steps" class="space-y-3" v-show="sectionVisible('wizard-steps')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Footprints class="h-4 w-4 text-primary" /> Wizard Steps
              </h2>
              <p class="text-xs text-muted-foreground">Form bisa dibagi jadi beberapa <strong>step/langkah</strong> — cocok untuk form yang panjang agar user tidak kewalahan.</p>
              <div class="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Cara pakai:</strong></p>
                <ol class="list-decimal list-inside space-y-0.5">
                  <li>Di card <strong>"Wizard Steps"</strong> (atas form builder), klik <strong>"+ Step"</strong></li>
                  <li>Beri nama setiap step (misal: "Data Umum", "Informasi Pembayaran")</li>
                  <li>Pada setiap field, pilih step mana field tersebut berada lewat dropdown <strong>"S1: ..."</strong> di footer field card</li>
                  <li>Step bisa dihapus — field yang berada di step tersebut otomatis pindah ke step pertama</li>
                </ol>
                <p class="mt-2"><strong>Hasil generate:</strong> Form menggunakan tab navigation. User harus menyelesaikan step 1 sebelum ke step 2, dst.</p>
              </div>
            </section>

            <!-- Layout -->
            <section id="doc-layout" class="space-y-3" v-show="sectionVisible('layout')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Columns3 class="h-4 w-4 text-primary" /> Multi-Column Layout
              </h2>
              <p class="text-xs text-muted-foreground">Atur jumlah kolom form grid (1, 2, atau 3) menggunakan tombol <strong>Kolom</strong> di header form preview.</p>
              <div class="flex gap-2 text-xs text-muted-foreground">
                <div class="rounded-lg border border-border p-2.5 flex-1"><strong>1 Kolom</strong> — Semua field full-width. Ideal untuk form sederhana.</div>
                <div class="rounded-lg border border-border p-2.5 flex-1"><strong>2 Kolom</strong> — Default. Field 2 per baris, fullWidth span 2.</div>
                <div class="rounded-lg border border-border p-2.5 flex-1"><strong>3 Kolom</strong> — Field 3 per baris. Untuk form yang banyak field.</div>
              </div>
            </section>

            <!-- Upload -->
            <section id="doc-upload" class="space-y-3" v-show="sectionVisible('upload')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Upload class="h-4 w-4 text-primary" /> File / Image Upload
              </h2>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Tipe</th>
                      <th class="text-left py-1.5 pr-2 font-semibold">Opsi</th>
                      <th class="text-left py-1.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground"><code class="bg-muted px-1 rounded">upload</code></td><td class="py-1.5 pr-2">Accept Types</td><td class="py-1.5">Filter file: PNG, JPG, WebP, PDF, Excel, Word, atau All</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2">Max Size (MB)</td><td class="py-1.5">Ukuran maksimal per file</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground"><code class="bg-muted px-1 rounded">multi_upload</code></td><td class="py-1.5 pr-2">Accept Types</td><td class="py-1.5">Sama seperti upload tunggal</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2">Max Images</td><td class="py-1.5">Jumlah maksimal file (default: 10)</td></tr>
                    <tr><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2">Max Size (MB)</td><td class="py-1.5">Ukuran maksimal per file</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="text-muted-foreground text-xs mt-1">Fitur: kompresi gambar otomatis (max 1920px), preview popup, thumbnail grid, carousel untuk multi upload, PDF preview.</p>
            </section>

            <!-- Drag & Drop -->
            <section id="doc-drag-drop" class="space-y-3" v-show="sectionVisible('drag-drop')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <GripVertical class="h-4 w-4 text-primary" /> Drag & Drop Reorder
              </h2>
              <p class="text-muted-foreground text-xs">Urutan field bisa diubah dengan <strong>drag & drop</strong> — klik tahan pada card field, lalu seret ke posisi tujuan. Drop indicator berupa border biru akan muncul.</p>
            </section>

            <!-- Undo / Redo -->
            <section id="doc-undo-redo" class="space-y-3" v-show="sectionVisible('undo-redo')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Copy class="h-4 w-4 text-primary" /> Undo / Redo
              </h2>
              <p class="text-muted-foreground text-xs">Aksi yang mengubah struktur field (tambah, hapus, pindah, clone, import, drag reorder) bisa di-undo/redo:</p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Shortcut</th>
                      <th class="text-left py-1.5 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2"><kbd class="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">Ctrl+Z</kbd></td><td class="py-1.5">Undo — batalkan perubahan terakhir</td></tr>
                    <tr><td class="py-1.5 pr-2"><kbd class="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">Ctrl+Y</kbd> / <kbd class="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">Ctrl+Shift+Z</kbd></td><td class="py-1.5">Redo — ulangi perubahan yang di-undo</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="text-muted-foreground text-xs mt-1">Tombol Undo/Redo juga tersedia di toolbar atas. Maksimal 50 history.</p>
            </section>

            <!-- Search & Filter -->
            <section id="doc-search-filter" class="space-y-3" v-show="sectionVisible('search-filter')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Search class="h-4 w-4 text-primary" /> Search & Filter Fields
              </h2>
              <p class="text-xs text-muted-foreground">Gunakan input search <strong>"Cari field..."</strong> di atas form builder untuk memfilter field berdasarkan <strong>label</strong>, <strong>field name</strong>, atau <strong>tipe</strong>. Field yang tidak match akan disembunyikan sementara.</p>
            </section>

            <!-- Bulk Select -->
            <section id="doc-bulk-select" class="space-y-3" v-show="sectionVisible('bulk-select')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <ListChecks class="h-4 w-4 text-primary" /> Bulk Select
              </h2>
              <p class="text-xs text-muted-foreground">Klik tombol <strong>"Bulk"</strong> untuk masuk mode seleksi massal. Pilih beberapa field sekaligus lalu lakukan aksi:</p>
              <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span class="rounded-lg border border-border px-2.5 py-1.5"><strong>Hapus Terpilih</strong> — Hapus semua field yang dicentang</span>
                <span class="rounded-lg border border-border px-2.5 py-1.5"><strong>Set Readonly / Editable</strong> — Ubah readonly massal</span>
                <span class="rounded-lg border border-border px-2.5 py-1.5"><strong>Set Required / Optional</strong> — Ubah required massal</span>
                <span class="rounded-lg border border-border px-2.5 py-1.5"><strong>Select All / Deselect</strong> — Pilih/lepas semua</span>
              </div>
            </section>

            <!-- Import / Export -->
            <section id="doc-import-export" class="space-y-3" v-show="sectionVisible('import-export')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Download class="h-4 w-4 text-primary" /> Import / Export Config
              </h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <Download class="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div><strong>Export</strong> — Download konfigurasi builder sebagai file JSON. Berguna untuk backup atau sharing antar developer.</div>
                </div>
                <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <Upload class="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div><strong>Import</strong> — Upload file JSON untuk memuat konfigurasi. Field, detail, landing, dan kolom layout langsung ter-restore.</div>
                </div>
              </div>
            </section>

            <!-- ============================================================ -->
            <!-- 2. DETAIL TABS -->
            <!-- ============================================================ -->
            <section id="doc-detail-tabs" class="space-y-3" v-show="sectionVisible('detail-tabs')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Layers class="h-4 w-4 text-primary" /> Detail Tabs (Master-Detail)
              </h2>
              <p class="text-muted-foreground">Detail Tabs memungkinkan relasi master-detail. Contoh: Form <strong>Role</strong> memiliki detail tab <strong>Menu & Permissions</strong>.</p>
              <p class="text-muted-foreground">Klik <strong>"+ Tambah Detail Tab"</strong> di bawah form untuk menambah.</p>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Mode Detail</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <p class="font-semibold text-foreground">ButtonMultiSelect</p>
                  <p class="text-muted-foreground">Pilih item dari tabel master via dialog popup. Cocok untuk relasi many-to-many.</p>
                  <ul class="list-disc list-inside text-muted-foreground space-y-0.5">
                    <li>Membutuhkan API endpoint</li>
                    <li>Item duplikat otomatis dicegah</li>
                    <li>Menampilkan kolom display dari master</li>
                  </ul>
                </div>
                <div class="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <p class="font-semibold text-foreground">Add To List</p>
                  <p class="text-muted-foreground">Tambah baris kosong secara manual. Cocok untuk list dinamis tanpa master data.</p>
                  <ul class="list-disc list-inside text-muted-foreground space-y-0.5">
                    <li>Tidak butuh API</li>
                    <li>Tombol "Tambah" menambah baris kosong</li>
                    <li>Semua field langsung editable</li>
                  </ul>
                </div>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Konfigurasi Detail Tab</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Opsi</th>
                      <th class="text-left py-1.5 pr-2 font-semibold">Mode</th>
                      <th class="text-left py-1.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Tab Label</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Judul tab</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Button Label</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Label tombol aksi</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Response Key</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Key dari response GET API untuk array detail</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Payload Key</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Key untuk POST/PUT payload</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">API Endpoint</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">URL API untuk fetch item</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Foreign Key</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Kolom yang menyimpan ID item terpilih</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Foreign Display</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Key objek nested untuk info display</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Popup Columns</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Kolom di dialog popup</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Display Columns</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Kolom read-only dari master di tabel detail</td></tr>
                    <tr><td class="py-1.5 pr-2 font-medium text-foreground">Detail Fields</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Field per baris yang editable</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Detail Fields (Per Baris)</h3>
              <p class="text-xs text-muted-foreground">Tipe yang tersedia untuk field baris detail:</p>
              <div class="flex flex-wrap gap-1.5 text-[11px]">
                <span class="bg-muted px-2 py-0.5 rounded-full">checkbox</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">text</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">number</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">fieldnumber</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">fieldnumber_decimal</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">textarea</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">select</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">date</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">datetime</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">radio</span>
                <span class="bg-muted px-2 py-0.5 rounded-full">currency</span>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Summary Footer (Detail Table)</h3>
              <p class="text-xs text-muted-foreground">Detail fields bertipe number/fieldnumber/currency bisa dikonfigurasi untuk menampilkan <strong>summary</strong> di footer tabel. Pilihan: <strong>Sum</strong>, <strong>Average</strong>, <strong>Count</strong>, <strong>Min</strong>, <strong>Max</strong>. Hasilnya muncul di baris bawah AG Grid.</p>
            </section>

            <!-- ============================================================ -->
            <!-- 3. KONFIGURASI LANDING -->
            <!-- ============================================================ -->
            <section id="doc-landing-config" class="space-y-3" v-show="sectionVisible('landing-config')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Table2 class="h-4 w-4 text-primary" /> Konfigurasi Landing
              </h2>
              <p class="text-muted-foreground">Tab ini mengatur tampilan halaman daftar (landing page) — tabel AG Grid yang menampilkan data.</p>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Auto-Sync</h3>
              <p class="text-xs text-muted-foreground">Kolom landing <strong>otomatis sinkron</strong> dengan field di Form Builder. Field baru otomatis ditambahkan, yang dihapus otomatis hilang. Label terupdate otomatis. Urutan dan setting custom tetap dipertahankan.</p>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Kolom Konfigurasi</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">Kolom</th>
                      <th class="text-left py-1.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Field</td><td class="py-1.5">Nama kolom database (read-only)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Label Kolom</td><td class="py-1.5">Header kolom di tabel</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Display Field</td><td class="py-1.5">Path dot-notation untuk data nested/relasi (misal: <code class="bg-muted px-1 rounded">unit_bisnis.nama_comp</code>)</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Tampil</td><td class="py-1.5">Checkbox — tampilkan kolom di landing</td></tr>
                    <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Width</td><td class="py-1.5">Lebar minimum dalam pixel (default: 140)</td></tr>
                    <tr><td class="py-1.5 pr-2 font-medium text-foreground">↑↓</td><td class="py-1.5">Ubah urutan kolom</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Display Field — Data Nested / Relasi</h3>
              <p class="text-xs text-muted-foreground">Ketika API menggunakan JOIN, FK field hanya berisi UUID. Data relasi ada di objek nested. Gunakan dot-notation tanpa batas kedalaman:</p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-3 font-semibold">Display Field</th>
                      <th class="text-left py-1.5 font-semibold">Contoh Response</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground font-mono text-[11px]">
                    <tr class="border-b border-border/50">
                      <td class="py-1.5 pr-3"><code class="bg-muted px-1 py-0.5 rounded">unit_bisnis.nama_comp</code></td>
                      <td class="py-1.5">{ unit_bisnis: { nama_comp: "PT XYZ" } }</td>
                    </tr>
                    <tr class="border-b border-border/50">
                      <td class="py-1.5 pr-3"><code class="bg-muted px-1 py-0.5 rounded">kota.provinsi.nama</code></td>
                      <td class="py-1.5">{ kota: { provinsi: { nama: "Jawa Barat" } } }</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Preview Tabel</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div class="rounded-lg border border-border p-2.5"><strong>Sample Data</strong> — 3 baris dummy untuk preview cepat.</div>
                <div class="rounded-lg border border-border p-2.5"><strong>Mode: Real API</strong> — Fetch data sungguhan dari API. Bisa tambah parameter.</div>
              </div>
            </section>

            <!-- ============================================================ -->
            <!-- 4. GENERATE -->
            <!-- ============================================================ -->
            <section id="doc-generate" class="space-y-3" v-show="sectionVisible('generate')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <Zap class="h-4 w-4 text-primary" /> Generate
              </h2>
              <p class="text-muted-foreground">Setelah semua konfigurasi selesai, klik tombol <strong>"Generate"</strong> di bawah halaman.</p>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">File yang Dihasilkan</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1.5 pr-2 font-semibold">File</th>
                      <th class="text-left py-1.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody class="text-muted-foreground">
                    <tr class="border-b border-border/50">
                      <td class="py-1.5 pr-2 font-mono text-[11px] text-foreground">app/pages/{module}/index.vue</td>
                      <td class="py-1.5"><strong>Landing Page</strong> — Tabel AG Grid dengan search, pagination, filter, mobile card view, dialog hapus</td>
                    </tr>
                    <tr>
                      <td class="py-1.5 pr-2 font-mono text-[11px] text-foreground">app/pages/{module}/form/[[id]].vue</td>
                      <td class="py-1.5"><strong>Form Page</strong> — Form create/edit/view/copy dengan validasi, save API, detail tabs, responsive layout</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 class="font-semibold text-[13px] text-foreground mt-4">Setelah Generate</h3>
              <ul class="list-disc list-inside text-xs text-muted-foreground space-y-1">
                <li>Cookie builder otomatis dihapus</li>
                <li>File config dihapus (token tidak valid lagi)</li>
                <li>Nuxt auto-reload — halaman baru langsung bisa diakses</li>
                <li>File yang <strong>sudah ada</strong> tidak akan di-overwrite (aman untuk re-generate)</li>
              </ul>
            </section>

            <!-- ============================================================ -->
            <!-- 5. TIPS -->
            <!-- ============================================================ -->
            <section id="doc-tips" class="space-y-3" v-show="sectionVisible('tips')">
              <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <FileText class="h-4 w-4 text-primary" /> Tips & Catatan
              </h2>
              <div class="space-y-2 text-xs text-muted-foreground">
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  <p><strong>State tersimpan di cookie</strong> — Field, detail, dan landing config tersimpan selama 24 jam. Refresh halaman tidak akan hilang.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  <p><strong>Preview live</strong> — Semua perubahan langsung terlihat. Gunakan ini untuk memvalidasi tampilan sebelum generate.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  <p><strong>Cascading select</strong> — Pastikan field induk sudah ada sebelum mengkonfigurasi field anak.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                  <p><strong>Test dengan Real API</strong> — Di tab landing, gunakan "Mode: Real API" untuk memastikan Display Field dot-notation benar.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
                  <p><strong>Tombol Batal</strong> — Menghapus semua cookie + config. Perlu jalankan <code class="bg-muted px-1 py-0.5 rounded">add_route.cjs</code> lagi untuk memulai ulang.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">6</span>
                  <p><strong>Preset Perhitungan</strong> — Gunakan preset untuk menambah field dengan formula yang sudah jalan. Tidak perlu setup formula manual.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">7</span>
                  <p><strong>Formula berantai</strong> — Field computed bisa bergantung pada field computed lain (misal: subtotal → after_diskon → ppn → grand_total). Semua auto-terkomputasi.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">8</span>
                  <p><strong>Duplikat field name</strong> — Builder akan menampilkan badge warning merah jika ada field name yang sama. Pastikan semua field name unik sebelum generate.</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-6 py-3 flex justify-end shrink-0">
        <DialogClose as-child>
          <Button variant="outline">Tutup</Button>
        </DialogClose>
      </div>
    </DialogScrollContent>
  </Dialog>
</template>
