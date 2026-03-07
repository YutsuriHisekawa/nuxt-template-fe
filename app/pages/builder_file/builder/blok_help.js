export const BLOCK_HELP = {
  company_header: {
    icon: '🏢', title: 'Company Header',
    desc: 'Menampilkan kop surat perusahaan: logo, nama, alamat, dan info kontak di bagian atas dokumen.',
    steps: [
      'Upload logo via field "Logo Perusahaan" (opsional)',
      'Isi Nama Perusahaan, Sub Title / Divisi',
      'Isi Alamat lengkap perusahaan',
      'Isi Info Tambahan: Telp, Email, Website, NPWP',
      'Pilih Align: Left atau Center',
    ],
    example: 'PT. Maju Bersama Globaltama\nDivisi Operasional\nJl. Sudirman No. 10, Jakarta 10110\nTelp: 021-123456 | Email: info@company.com',
  },
  heading: {
    icon: '📝', title: 'Heading / Judul',
    desc: 'Teks besar sebagai judul dokumen atau judul section. Bisa pakai token data otomatis.',
    steps: [
      'Isi teks judul. Gunakan {{page_title}} untuk judul otomatis dari nama halaman',
      'Pilih level: H1 (paling besar), H2 (sedang), H3 (kecil)',
      'Atur Align: Left / Center / Right',
      'Aktifkan Bold/Italic/Underline jika perlu',
    ],
    tokens: ['{{page_title}}', '{{current_date}}', '{{no_dokumen}}'],
    example: 'SURAT JALAN\nNomor: {{no_surat}} — {{current_date}}',
  },
  paragraph: {
    icon: '📄', title: 'Paragraph / Teks Bebas',
    desc: 'Blok teks paragraf bebas. Bisa memuat token data dari field form secara otomatis.',
    steps: [
      'Ketik teks di area "Isi Teks"',
      'Sisipkan {{nama_field}} untuk menampilkan nilai dari form',
      '{{current_date}} otomatis terisi tanggal hari ini',
      'Atur Align: Left / Center / Right / Justify',
    ],
    tokens: ['{{page_title}}', '{{current_date}}', '{{current_datetime}}', '{{nama_field}}'],
    example: 'Yang bertanda tangan di bawah ini menyatakan bahwa barang atas nama {{nama_customer}} dengan nomor order {{no_order}} telah dikirim pada tanggal {{tanggal_kirim}}.',
  },
  field: {
    icon: '🏷️', title: 'Field (Satu Data)',
    desc: 'Menampilkan satu field dari form, dengan label di kiri dan nilai di kanan (atau atas-bawah).',
    steps: [
      'Pilih field dari dropdown — field diambil dari tab Form',
      'Pilih layout: Row (label | nilai sejajar) atau Stacked (label di atas)',
      'Isi Label Override jika ingin ganti nama label bawaan',
    ],
    example: 'Nama Customer   :  PT. Sumber Makmur\nAlamat          :  Jl. Kemang No. 5, Jakarta\nTanggal Order   :  07/03/2026',
  },
  field_table: {
    icon: '📋', title: 'Field Table (Tabel Data Form)',
    desc: 'Kumpulan field form ditampilkan dalam tabel dua kolom: Label | Nilai. Cocok untuk bagian "Informasi Order", "Data Pengirim", dsb.',
    steps: [
      'Satu baris = satu field. Format: nama_field|Label Custom',
      'Jika label kosong, digunakan label default dari form',
      'Susun urutan field sesuai kebutuhan layout dokumen',
    ],
    example: 'no_order|Nomor Order\nnama_customer|Nama Pelanggan\nalamat_kirim|Alamat Pengiriman\ntanggal_order|Tanggal Order\ntotal_bayar|Total Pembayaran',
  },
  detail_table: {
    icon: '📊', title: 'Detail Table (Tabel Rows / Detail)',
    desc: 'Menampilkan data baris dari sub-tab (misal: daftar barang, item invoice, rincian gaji). Kolom otomatis diambil dari field di tab detail.',
    steps: [
      'Pilih "Sumber Detail" sesuai tab detail yang ada di form (misal: detail_barang)',
      'Kolom-kolom tabel otomatis diambil dari field tab detail tersebut',
      'Tambahkan Judul tabel jika perlu',
    ],
    example: 'No | Nama Barang       | Qty | Satuan | Harga      | Total\n 1 | Laptop ASUS X450  |   2 | Unit   | 8.500.000  | 17.000.000\n 2 | Mouse Wireless    |   5 | Pcs    |   150.000  |    750.000',
  },
  table: {
    icon: '📐', title: 'Table (Bebas / Manual)',
    desc: 'Tabel statis yang diisi manual, sel per sel. Bisa campur teks statis dengan token data {{nama_field}}.',
    steps: [
      'Atur jumlah Baris dan Kolom terlebih dahulu',
      'Klik langsung di sel tabel untuk mengedit isinya',
      'Aktifkan "Header Row" agar baris pertama tampil tebal/berbeda warna',
      'Token {{nama_field}} bisa dipakai di dalam sel manapun',
    ],
    tokens: ['{{nama_field}}', '{{current_date}}', '{{total_bayar}}'],
    example: 'PENDAPATAN     | Jumlah\nGaji Pokok     | Rp {{gaji_pokok}}\nTunjangan      | Rp {{tunjangan}}\nTOTAL GAJI     | Rp {{total_gaji}}',
  },
  image: {
    icon: '🖼️', title: 'Image / Logo',
    desc: 'Menampilkan gambar dari URL. Bisa untuk logo, stempel, QR code, tanda tangan digital, dsb.',
    steps: [
      'Masukkan URL gambar (https://...)',
      'Atur Width dan Height dalam pixel',
      'Pilih posisi: Left / Center / Right',
    ],
    example: 'https://company.com/assets/logo.png\n\nAtau upload ke storage (S3/Supabase/Firebase)\nlalu gunakan URL hasil upload.',
  },
  columns: {
    icon: '⬛⬛', title: 'Multi Column',
    desc: 'Membagi konten menjadi 2–4 kolom sejajar. Tiap kolom diisi HTML bebas + token data.',
    steps: [
      'Atur jumlah kolom (1–4)',
      'Tiap kolom diisi dengan HTML: <b>teks</b>, <br>, <table>, dll',
      'Token {{nama_field}} bisa dipakai di dalam HTML tiap kolom',
      'Cocok untuk: info pengirim vs penerima, tanda tangan berdampingan',
    ],
    example: 'Kolom 1:\n<b>Dari:</b><br>{{nama_pengirim}}<br>{{alamat_pengirim}}\n\nKolom 2:\n<b>Kepada:</b><br>{{nama_penerima}}<br>{{alamat_penerima}}',
  },
  list: {
    icon: '📌', title: 'List (Bullet / Nomor)',
    desc: 'Daftar item bergaya bullet (•) atau nomor (1. 2. 3.).',
    steps: [
      'Pilih tipe: Bullet atau Numbered',
      'Satu baris = satu item list',
      'Token {{nama_field}} bisa dipakai di tiap baris',
    ],
    example: 'Produk dikirim dalam kondisi baik\nPenerima menyetujui jumlah: {{total_qty}} item\nTidak ada klaim setelah barang diterima',
  },
  divider: {
    icon: '➖', title: 'Divider / Garis Pemisah',
    desc: 'Garis horizontal sebagai pemisah visual antara section-section dalam dokumen.',
    steps: [
      'Atur ketebalan garis (1–6 px)',
      'Pilih style: Solid, Dashed, Dotted, atau Double',
    ],
    example: 'Company Header\n────────────────────────────\nJudul Dokumen\n────────────────────────────\nIsi tabel / paragraph...',
  },
  spacer: {
    icon: '↕️', title: 'Spacer (Jarak Kosong)',
    desc: 'Menambah ruang kosong antara dua block. Berguna untuk mengatur jarak visual.',
    steps: [
      'Atur tinggi spacer dalam pixel (8–120 px)',
      'Letakkan di antara dua section yang perlu jarak lebih',
    ],
    example: 'Tabel data...\n\n[Spacer 32px]\n\nArea tanda tangan',
  },
  page_break: {
    icon: '📃', title: 'Page Break (Ganti Halaman)',
    desc: 'Memaksa konten di bawahnya pindah ke halaman baru saat print atau export PDF.',
    steps: [
      'Tidak ada konfigurasi tambahan',
      'Letakkan di antara dua section yang harus dipisah halamannya',
    ],
    example: 'Halaman 1: Surat Pengantar\n[Page Break]\nHalaman 2: Lampiran Data Detail',
  },
  page_number: {
    icon: '🔢', title: 'Page Number (Nomor Halaman)',
    desc: 'Menampilkan nomor halaman. Biasanya diletakkan di dalam block Footer.',
    steps: [
      'Gunakan {page} untuk nomor halaman saat ini',
      'Gunakan {pages} untuk total jumlah halaman',
      'Atur Align dan ukuran font sesuai kebutuhan',
    ],
    example: 'Halaman {page} dari {pages}\n\nAtau singkat: {page} / {pages}\n\nAtau: Page {page}',
  },
  watermark: {
    icon: '💧', title: 'Watermark',
    desc: 'Teks besar transparan diagonal di latar belakang setiap halaman. Cocok untuk DRAFT, CONFIDENTIAL, LUNAS.',
    steps: [
      'Isi teks watermark (misal: DRAFT, LUNAS, CONFIDENTIAL)',
      'Atur Font Size (default 80px)',
      'Atur Opacity: kecil = transparan (0.05), besar = terlihat jelas (0.3)',
      'Atur sudut rotasi (default -35°)',
    ],
    example: 'DRAFT\nCONFIDENTIAL\nLUNAS\nSAMPLE',
  },
  signature: {
    icon: '✍️', title: 'Signature (Tanda Tangan)',
    desc: 'Area tanda tangan dengan kolom nama jabatan dan garis tanda tangan. Biasanya di bagian bawah dokumen.',
    steps: [
      'Isi judul tiap kolom tanda tangan (misal: Dibuat Oleh, Disetujui, Penerima)',
      'Atur jumlah kolom tanda tangan (1–4)',
      'Tambah nama/jabatan opsional di bawah garis tanda tangan',
    ],
    example: 'Dibuat Oleh        Disetujui          Penerima\n\n(____________)     (____________)     (____________)\nAdmin Gudang       Kepala Gudang      Supir / Driver',
  },
  html: {
    icon: '💻', title: 'HTML Custom',
    desc: 'Blok HTML bebas untuk layout yang tidak bisa dilakukan block lain. Powerful tapi butuh keahlian HTML dasar.',
    steps: [
      'Tulis HTML biasa: <b>, <table>, <div style="...">, dsb',
      'Token {{nama_field}} tetap bisa dipakai di dalam HTML',
      'Gunakan inline style untuk styling spesifik',
    ],
    example: '<div style="border:1px solid #000;padding:8px;">\n  <b>No. Dokumen:</b> {{no_dokumen}}<br>\n  <b>Tanggal:</b> {{current_date}}\n</div>',
  },
  header: {
    icon: '⬆️', title: 'Header (Kop Halaman)',
    desc: 'Konten yang muncul otomatis di bagian atas setiap halaman (kop surat berulang).',
    steps: [
      'Tambahkan block Company Header atau Heading di dalam blok ini',
      'Aktifkan "Show on First Page" agar muncul di halaman pertama',
      'Block Header otomatis diulang di semua halaman',
    ],
    example: '[Company Header: logo + nama perusahaan]\n─── Divider ───\n\n(muncul otomatis di setiap halaman)',
  },
  footer: {
    icon: '⬇️', title: 'Footer (Kaki Halaman)',
    desc: 'Konten yang muncul otomatis di bagian bawah setiap halaman.',
    steps: [
      'Isi teks footer: biasanya nomor halaman + tanggal cetak',
      'Gunakan {page} dan {pages} untuk nomor halaman',
      'Aktifkan "Show Line" untuk garis pembatas antara konten dan footer',
    ],
    example: 'Dicetak: {{current_datetime}} | Halaman {page} dari {pages} | Sistem MVG',
  },
}
