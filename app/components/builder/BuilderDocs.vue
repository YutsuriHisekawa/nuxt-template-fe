<script setup>
import { BookOpen, Plus, MousePointer, GripVertical, Trash2, Settings2, Layers, Table2, Zap, FileText, Copy, Download, Upload, Columns3, SlidersHorizontal, Eye } from 'lucide-vue-next'

const open = defineModel('open', { type: Boolean, default: false })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogScrollContent class="max-w-3xl max-h-[90vh]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-lg">
          <BookOpen class="h-5 w-5 text-primary" />
          Dokumentasi Builder
        </DialogTitle>
        <DialogDescription>Panduan lengkap penggunaan MVG Page Builder</DialogDescription>
      </DialogHeader>

      <ScrollArea class="h-[70vh] pr-4">
        <div class="space-y-8 text-sm pb-4">

          <!-- ============================================================ -->
          <!-- 1. FORM BUILDER -->
          <!-- ============================================================ -->
          <section class="space-y-3">
            <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
              <Settings2 class="h-4 w-4 text-primary" /> 1. Tab Form Builder
            </h2>
            <p class="text-muted-foreground">Tab ini untuk mendesain form input. Setiap field langsung ter-preview secara live.</p>

            <!-- 1.1 Operasi Field -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.1 Operasi Field</h3>
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
                <div><strong>Pindah Urutan</strong><br><span class="text-muted-foreground">Hover field → klik panah atas/bawah untuk mengubah posisi field.</span></div>
              </div>
              <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                <Trash2 class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div><strong>Hapus Field</strong><br><span class="text-muted-foreground">Hover field → klik ikon tempat sampah merah.</span></div>
              </div>
              <div class="flex items-start gap-2 rounded-lg border border-border p-2.5">
                <Copy class="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div><strong>Duplikasi Field</strong><br><span class="text-muted-foreground">Hover field → klik ikon copy. Field diduplikasi beserta semua konfigurasinya.</span></div>
              </div>
            </div>

            <!-- 1.2 Tipe Komponen -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.2 Tipe Komponen</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-1.5 pr-2 font-semibold">Kategori</th>
                    <th class="text-left py-1.5 pr-2 font-semibold">Tipe</th>
                    <th class="text-left py-1.5 font-semibold">Keterangan</th>
                  </tr>
                </thead>
                <tbody class="text-muted-foreground">
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Input</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">text</code></td><td class="py-1.5">Input teks standar</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">number</code></td><td class="py-1.5">Input angka (format biasa)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">decimal</code></td><td class="py-1.5">Input angka desimal</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">email</code></td><td class="py-1.5">Input email</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">tel</code></td><td class="py-1.5">Input telepon</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">password</code></td><td class="py-1.5">Input password (hidden)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">textarea</code></td><td class="py-1.5">Area teks multi-baris</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Number</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldnumber</code></td><td class="py-1.5">Input angka dengan formatting (ribuan)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldnumber_decimal</code></td><td class="py-1.5">Input angka desimal dengan formatting</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Tanggal</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">date</code></td><td class="py-1.5">Date picker</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">datetime</code></td><td class="py-1.5">Date & time picker</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Pilihan</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">select</code></td><td class="py-1.5">Dropdown select (dari API atau static)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">select_creatable</code></td><td class="py-1.5">Select + bisa input opsi baru</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">popup</code></td><td class="py-1.5">Dialog popup dengan tabel pencarian</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">radio</code></td><td class="py-1.5">Radio button group</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Toggle</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">switch</code></td><td class="py-1.5">Toggle switch (Aktif/Nonaktif)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">fieldbox</code></td><td class="py-1.5">Checkbox (Ya/Tidak)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Uang</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">currency</code></td><td class="py-1.5">Input mata uang dengan prefix (Rp) & formatting ribuan</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Slider</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">slider</code></td><td class="py-1.5">Slider range (min/max/step + unit label)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Layout</td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">section</code></td><td class="py-1.5">Section divider — judul pemisah antar grup field</td></tr>
                  <tr><td class="py-1.5 pr-2"></td><td class="py-1.5 pr-2"><code class="bg-muted px-1 rounded">space</code></td><td class="py-1.5">Pemisah / spacer (tidak ada input)</td></tr>
                </tbody>
              </table>
            </div>

            <!-- 1.3 Konfigurasi Field -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.3 Konfigurasi Umum Field</h3>
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
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Field Name</td><td class="py-1.5">Nama kolom database (misal: <code class="bg-muted px-1 rounded">nama_supplier</code>)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Label</td><td class="py-1.5">Label yang ditampilkan di atas input</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Placeholder</td><td class="py-1.5">Teks petunjuk di dalam input</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Default Value</td><td class="py-1.5">Nilai awal saat form kosong</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Required</td><td class="py-1.5">Wajib diisi — menampilkan error jika kosong</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Pesan Error</td><td class="py-1.5">Pesan kustom saat validasi gagal</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Readonly</td><td class="py-1.5">Field tidak bisa diedit</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Full Width</td><td class="py-1.5">Gunakan lebar penuh (2 kolom) di layout grid</td></tr>
                  <tr><td class="py-1.5 pr-2 font-medium text-foreground">Depends On</td><td class="py-1.5">Field induk untuk cascading/dependency</td></tr>
                </tbody>
              </table>
            </div>

            <!-- 1.4 Konfigurasi Select & Popup -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.4 Konfigurasi Select, Popup & Cascading</h3>
            <div class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-2 text-xs text-muted-foreground">
              <p class="font-semibold text-amber-700 dark:text-amber-400">Select & Select Creatable</p>
              <p>Punya 2 sumber data:</p>
              <ul class="list-disc list-inside space-y-1">
                <li><strong>API</strong> — Data dari endpoint (misal <code class="bg-muted px-1 py-0.5 rounded">/api/dynamic/m_supplier</code>). Atur: Display Field (field yang ditampilkan), Value Field (field yang disimpan), dan API Params.</li>
                <li><strong>Static / Hardcode</strong> — Opsi manual (misal: Ya/Tidak, Laki-laki/Perempuan). Tambah opsi satu per satu.</li>
              </ul>
            </div>
            <div class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-2 text-xs text-muted-foreground mt-2">
              <p class="font-semibold text-amber-700 dark:text-amber-400">FieldPopUp (Popup)</p>
              <p>Seperti Select tapi menampilkan dialog tabel dengan kolom yang bisa dikonfigurasi:</p>
              <ul class="list-disc list-inside space-y-1">
                <li><strong>Popup Columns</strong> — Kolom yang ditampilkan di dialog (field, headerName, width %)</li>
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
                <li>Untuk API: isi <strong>Depends On Param</strong> — nama query parameter yang dikirim ke API dengan value dari induk</li>
                <li>Untuk Static: setiap opsi bisa di-assign <strong>Parent Value</strong> agar terfilter berdasarkan induk</li>
                <li>Saat induk berubah, semua keturunan (anak, cucu, dst.) otomatis di-reset</li>
              </ol>
              <div class="mt-2 bg-muted/60 rounded-md p-2 font-mono text-[11px]">
                <p class="font-sans font-semibold text-foreground mb-1">Contoh: Provinsi → Kota</p>
                <p>Field "Kota": Depends On = <code>m_provinsi_id</code></p>
                <p>API: <code>/api/dynamic/m_kota</code></p>
                <p>Depends On Param: <code>filter_column_m_provinsi_id</code></p>
              </div>
            </div>

            <!-- 1.5 Switch & Date -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.5 Konfigurasi Switch, Checkbox & Date</h3>
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

            <!-- 1.6 Validation Rules -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.6 Validation Rules</h3>
            <p class="text-xs text-muted-foreground">Selain <strong>Required</strong>, setiap field bisa dikonfigurasi validasi tambahan di panel kanan:</p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-1.5 pr-2 font-semibold">Opsi</th>
                    <th class="text-left py-1.5 pr-2 font-semibold">Tipe Field</th>
                    <th class="text-left py-1.5 font-semibold">Keterangan</th>
                  </tr>
                </thead>
                <tbody class="text-muted-foreground">
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Min Length</td><td class="py-1.5 pr-2">text, email, tel, password, textarea</td><td class="py-1.5">Jumlah karakter minimal</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Max Length</td><td class="py-1.5 pr-2">text, email, tel, password, textarea</td><td class="py-1.5">Jumlah karakter maksimal</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Min Value</td><td class="py-1.5 pr-2">number, decimal, fieldnumber, currency, slider</td><td class="py-1.5">Nilai angka minimum</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Max Value</td><td class="py-1.5 pr-2">number, decimal, fieldnumber, currency, slider</td><td class="py-1.5">Nilai angka maksimum</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Regex Pattern</td><td class="py-1.5 pr-2">text, email, tel, number, decimal</td><td class="py-1.5">Regex JavaScript tanpa / pembungkus</td></tr>
                  <tr><td class="py-1.5 pr-2 font-medium text-foreground">Pesan Pattern</td><td class="py-1.5 pr-2">text, email, tel, number, decimal</td><td class="py-1.5">Pesan error jika regex tidak match</td></tr>
                </tbody>
              </table>
            </div>

            <!-- 1.7 Conditional Visibility -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.7 Conditional Visibility (visibleWhen)</h3>
            <p class="text-xs text-muted-foreground">Field bisa disembunyikan/ditampilkan berdasarkan nilai field lain. Contoh: field "Alasan Reject" hanya muncul jika status = "rejected".</p>
            <div class="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Langkah:</strong> Buka panel field → di bagian <strong>Visible When</strong>:</p>
              <ol class="list-decimal list-inside space-y-0.5">
                <li>Pilih <strong>field</strong> dari dropdown (semua field yg ada di form)</li>
                <li>Pilih atau ketik <strong>nilai</strong> — untuk select/popup/radio, opsi otomatis dimuat dari konfigurasi field tsb (termasuk dari API dengan display field yang benar)</li>
              </ol>
              <p class="mt-1">Dihasilkan sebagai <code class="bg-muted px-1 py-0.5 rounded">v-if="values.status === 'rejected'"</code> di kode generated.</p>
            </div>

            <!-- 1.8 Multi-Column Layout -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.8 Multi-Column Layout</h3>
            <p class="text-xs text-muted-foreground">Atur jumlah kolom form grid (1, 2, atau 3) menggunakan tombol <strong>Kolom</strong> di header form preview.</p>
            <div class="flex gap-2 text-xs text-muted-foreground">
              <div class="rounded-lg border border-border p-2.5 flex-1"><strong>1 Kolom</strong> — Semua field full-width. Ideal untuk form sederhana.</div>
              <div class="rounded-lg border border-border p-2.5 flex-1"><strong>2 Kolom</strong> — Default. Field 2 per baris, fullWidth span 2.</div>
              <div class="rounded-lg border border-border p-2.5 flex-1"><strong>3 Kolom</strong> — Field 3 per baris. Untuk form yang banyak field.</div>
            </div>

            <!-- 1.9 Import / Export Config -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">1.9 Import / Export Config</h3>
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
          <section class="space-y-3">
            <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
              <Layers class="h-4 w-4 text-primary" /> 2. Detail Tabs (Master-Detail)
            </h2>
            <p class="text-muted-foreground">Detail Tabs memungkinkan relasi master-detail. Contoh: Form <strong>Role</strong> memiliki detail tab <strong>Menu & Permissions</strong>.</p>
            <p class="text-muted-foreground">Klik <strong>"+ Tambah Detail Tab"</strong> di bawah form untuk menambah.</p>

            <!-- 2.1 Dua Mode -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">2.1 Mode Detail</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div class="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p class="font-semibold text-foreground">ButtonMultiSelect</p>
                <p class="text-muted-foreground">Pilih item dari tabel master via dialog popup. Cocok untuk relasi many-to-many.</p>
                <p class="text-muted-foreground"><strong>Contoh:</strong> Pilih menu yang tersedia dari m_menu</p>
                <ul class="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Membutuhkan API endpoint</li>
                  <li>Item duplikat otomatis dicegah</li>
                  <li>Menampilkan kolom display dari master</li>
                </ul>
              </div>
              <div class="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <p class="font-semibold text-foreground">Add To List</p>
                <p class="text-muted-foreground">Tambah baris kosong secara manual. Cocok untuk list dinamis tanpa master data.</p>
                <p class="text-muted-foreground"><strong>Contoh:</strong> Daftar item PO yang diisi manual</p>
                <ul class="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Tidak butuh API</li>
                  <li>Tombol "Tambah" menambah baris kosong</li>
                  <li>Semua field langsung editable</li>
                </ul>
              </div>
            </div>

            <!-- 2.2 Konfigurasi Detail Tab -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">2.2 Konfigurasi Detail Tab</h3>
            <p class="text-xs text-muted-foreground">Klik tombol <strong>"Konfigurasi"</strong> pada detail tab untuk membuka panel kanan. Opsi yang tersedia:</p>
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
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Tab Label</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Judul tab (misal: "Menu & Permissions")</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Button Label</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Label tombol aksi</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Response Key</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Key dari response GET API yang berisi array detail (misal: <code class="bg-muted px-1 rounded">m_role_ds</code>)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Payload Key</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Key untuk POST/PUT payload (misal: <code class="bg-muted px-1 rounded">m_role_d</code>)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">API Endpoint</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">URL API untuk fetch item (misal: <code class="bg-muted px-1 rounded">/api/dynamic/m_menu</code>)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Foreign Key</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Kolom yang menyimpan ID item terpilih (misal: <code class="bg-muted px-1 rounded">m_menu_id</code>)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Foreign Display</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Key objek nested dari API untuk info display (misal: <code class="bg-muted px-1 rounded">m_menu</code>)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Popup Columns</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Kolom di dialog popup (key, label, width %)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Display Columns</td><td class="py-1.5 pr-2">MultiSelect</td><td class="py-1.5">Kolom read-only dari master yang ditampilkan di tabel detail</td></tr>
                  <tr><td class="py-1.5 pr-2 font-medium text-foreground">Detail Fields</td><td class="py-1.5 pr-2">Semua</td><td class="py-1.5">Field per baris yang bisa diedit (lihat 2.3)</td></tr>
                </tbody>
              </table>
            </div>

            <!-- 2.3 Detail Fields -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">2.3 Detail Fields (Per Baris)</h3>
            <p class="text-xs text-muted-foreground">Setiap baris detail bisa punya beberapa field yang bisa diedit. Tipe yang tersedia:</p>
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
            </div>
            <p class="text-xs text-muted-foreground">Setiap detail field punya: <strong>Key</strong> (nama kolom), <strong>Label</strong>, <strong>Type</strong>, <strong>Default</strong> value. Untuk checkbox bisa set Label True & Label False.</p>
          </section>

          <!-- ============================================================ -->
          <!-- 3. KONFIGURASI LANDING -->
          <!-- ============================================================ -->
          <section class="space-y-3">
            <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
              <Table2 class="h-4 w-4 text-primary" /> 3. Tab Konfigurasi Landing
            </h2>
            <p class="text-muted-foreground">Tab ini mengatur tampilan halaman daftar (landing page) — tabel AG Grid yang menampilkan data.</p>

            <h3 class="font-semibold text-[13px] text-foreground mt-4">3.1 Auto-Sync dari Form Builder</h3>
            <p class="text-xs text-muted-foreground">Kolom landing <strong>otomatis sinkron</strong> dengan field di Form Builder:</p>
            <ul class="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>Field baru otomatis ditambahkan ke landing config</li>
              <li>Field yang dihapus otomatis hilang dari config</li>
              <li>Label otomatis terupdate jika diubah di form</li>
              <li>Urutan dan setting custom <strong>tetap dipertahankan</strong></li>
              <li>Field tipe <strong>Switch</strong> dan <strong>Space</strong> tidak masuk landing config</li>
            </ul>

            <h3 class="font-semibold text-[13px] text-foreground mt-4">3.2 Kolom Konfigurasi</h3>
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
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Label Kolom</td><td class="py-1.5">Header kolom di tabel (bisa diedit)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Display Field</td><td class="py-1.5">Path dot-notation untuk data nested/relasi (lihat 4.3)</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Tampil</td><td class="py-1.5">Checkbox — tampilkan kolom ini di landing</td></tr>
                  <tr class="border-b border-border/50"><td class="py-1.5 pr-2 font-medium text-foreground">Width</td><td class="py-1.5">Lebar minimum kolom dalam pixel (default: 140)</td></tr>
                  <tr><td class="py-1.5 pr-2 font-medium text-foreground">↑↓</td><td class="py-1.5">Ubah urutan kolom di tabel</td></tr>
                </tbody>
              </table>
            </div>

            <!-- 4.3 Display Field / Nested Data -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">3.3 Display Field — Data Nested / Relasi</h3>
            <p class="text-xs text-muted-foreground">Ketika API menggunakan JOIN, field foreign key (misal <code class="bg-muted px-1 py-0.5 rounded">m_unit_bisnis_id</code>) hanya berisi UUID. Data relasi ada di objek nested.</p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-1.5 pr-3 font-semibold">Kedalaman</th>
                    <th class="text-left py-1.5 pr-3 font-semibold">Display Field</th>
                    <th class="text-left py-1.5 font-semibold">Struktur API Response</th>
                  </tr>
                </thead>
                <tbody class="text-muted-foreground font-mono text-[11px]">
                  <tr class="border-b border-border/50">
                    <td class="py-1.5 pr-3 font-sans">1 level</td>
                    <td class="py-1.5 pr-3"><code class="bg-muted px-1 py-0.5 rounded">unit_bisnis.nama_comp</code></td>
                    <td class="py-1.5">{ unit_bisnis: { nama_comp: "PT XYZ" } }</td>
                  </tr>
                  <tr class="border-b border-border/50">
                    <td class="py-1.5 pr-3 font-sans">2 level</td>
                    <td class="py-1.5 pr-3"><code class="bg-muted px-1 py-0.5 rounded">kota.provinsi.nama</code></td>
                    <td class="py-1.5">{ kota: { provinsi: { nama: "Jawa Barat" } } }</td>
                  </tr>
                  <tr class="border-b border-border/50">
                    <td class="py-1.5 pr-3 font-sans">3 level</td>
                    <td class="py-1.5 pr-3"><code class="bg-muted px-1 py-0.5 rounded">kota.provinsi.negara.nama</code></td>
                    <td class="py-1.5">{ kota: { provinsi: { negara: { nama: "ID" } } } }</td>
                  </tr>
                  <tr>
                    <td class="py-1.5 pr-3 font-sans">Tak terbatas</td>
                    <td class="py-1.5 pr-3"><code class="bg-muted px-1 py-0.5 rounded">a.b.c.d.value</code></td>
                    <td class="py-1.5">Sambung dengan titik tanpa batas</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-muted-foreground italic">Kosongkan Display Field jika field sudah berisi nilai langsung (bukan relasi).</p>

            <!-- 4.4 Preview -->
            <h3 class="font-semibold text-[13px] text-foreground mt-4">3.4 Preview Tabel</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div class="rounded-lg border border-border p-2.5 space-y-1">
                <p class="font-semibold text-foreground">Sample Data</p>
                <p>3 baris dummy data untuk preview cepat. Cocok untuk mengecek layout kolom.</p>
              </div>
              <div class="rounded-lg border border-border p-2.5 space-y-1">
                <p class="font-semibold text-foreground">Mode: Real API</p>
                <p>Fetch data sungguhan dari API. Bisa tambah parameter (key-value). Berguna untuk memverifikasi Display Field dot-notation bekerja.</p>
              </div>
            </div>
          </section>

          <!-- ============================================================ -->
          <!-- 4. GENERATE -->
          <!-- ============================================================ -->
          <section class="space-y-3">
            <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
              <Zap class="h-4 w-4 text-primary" /> 4. Generate
            </h2>
            <p class="text-muted-foreground">Setelah semua konfigurasi selesai, klik tombol <strong>"Generate"</strong> di bawah halaman.</p>

            <h3 class="font-semibold text-[13px] text-foreground mt-4">4.1 File yang Dihasilkan</h3>
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
                    <td class="py-1.5"><strong>Landing Page</strong> — Tabel AG Grid dengan search, pagination, filter aktif/nonaktif, mobile card view, dialog hapus</td>
                  </tr>
                  <tr>
                    <td class="py-1.5 pr-2 font-mono text-[11px] text-foreground">app/pages/{module}/form/[[id]].vue</td>
                    <td class="py-1.5"><strong>Form Page</strong> — Form create/edit/view/copy dengan validasi, save API, detail tabs, responsive layout</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 class="font-semibold text-[13px] text-foreground mt-4">4.2 Setelah Generate</h3>
            <ul class="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>Cookie builder otomatis dihapus</li>
              <li>File <code class="bg-muted px-1 py-0.5 rounded">.builder_config.json</code> dihapus (token tidak valid lagi)</li>
              <li>Nuxt auto-reload — halaman baru langsung bisa diakses</li>
              <li>File yang <strong>sudah ada</strong> tidak akan di-overwrite (aman untuk re-generate)</li>
            </ul>
          </section>

          <!-- ============================================================ -->
          <!-- 5. TIPS -->
          <!-- ============================================================ -->
          <section class="space-y-3">
            <h2 class="text-base font-bold flex items-center gap-2 text-foreground border-b border-border pb-2">
              <FileText class="h-4 w-4 text-primary" /> 5. Tips & Catatan
            </h2>
            <div class="space-y-2 text-xs text-muted-foreground">
              <div class="flex items-start gap-2">
                <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <p><strong>State tersimpan di cookie</strong> — Field, detail, dan landing config tersimpan selama 24 jam. Refresh halaman tidak akan hilang.</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <p><strong>Preview live</strong> — Semua perubahan di Form Builder langsung terlihat. Gunakan ini untuk memvalidasi tampilan sebelum generate.</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <p><strong>Cascading select</strong> — Pastikan field induk sudah ada sebelum mengkonfigurasi field anak. Urutan field di form juga menentukan urutan cascading.</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                <p><strong>Test dengan Real API</strong> — Sebelum generate, gunakan "Mode: Real API" di tab landing untuk memastikan Display Field dot-notation sudah benar.</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
                <p><strong>Tombol Batal</strong> — Menghapus semua cookie + config. Builder token menjadi tidak valid. Perlu jalankan <code class="bg-muted px-1 py-0.5 rounded">add_route.cjs</code> lagi untuk memulai ulang.</p>
              </div>
              <div class="flex items-start gap-2">
                <span class="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shrink-0">6</span>
                <p><strong>Detail Tab - ButtonMultiSelect</strong> — Konfigurasi API dulu, lalu test di preview. Pastikan Foreign Key, Display Key, dan Popup Columns sudah benar sebelum generate.</p>
              </div>
            </div>
          </section>

        </div>
      </ScrollArea>

      <DialogFooter>
        <DialogClose as-child>
          <Button variant="outline">Tutup</Button>
        </DialogClose>
      </DialogFooter>
    </DialogScrollContent>
  </Dialog>
</template>
