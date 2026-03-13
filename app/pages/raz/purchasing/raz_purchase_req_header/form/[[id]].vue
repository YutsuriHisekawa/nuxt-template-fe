<script setup lang="js">
// @ts-nocheck — Template builder, bukan runtime code
import { toast } from "vue-sonner";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";
import { Trash2 } from "lucide-vue-next";

// Resolve dot-path keys like 'm_item.kode_item' → obj.m_item.kode_item
function $resolvePath(obj, path) {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined) return obj[path];
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

// Build composite key from object columns for anti-duplicate check
function $buildItemKey(obj, columns) {
  if (!obj || !columns?.length) return JSON.stringify(obj);
  return columns.map(c => $resolvePath(obj, c.key) ?? '').join('|');
}

// ============================================================================
// COMPOSABLES & ROUTE
// ============================================================================
const api = useApi();       // Helper untuk panggil API (GET, POST, PUT)
const router = useRouter();  // Untuk navigasi antar halaman
const route = useRoute();    // Untuk baca parameter URL (misalnya :id)
const authStore = useAuthStore();

// ============================================================================
// PERMISSIONS — Cek hak akses user berdasarkan menu
// ============================================================================
const currentMenu = computed(() => {
  return authStore.selectRespo?.menus?.find(m => m.path === '/raz/purchasing/raz_purchase_req_header');
});
const perms = computed(() => {
  if (authStore.isSuperAdmin) return { is_read: true, is_create: true, is_update: true, is_delete: true, is_print: true };
  const menuId = currentMenu.value?.id;
  if (!menuId) return { is_read: true, is_create: true, is_update: true, is_delete: true, is_print: true };
  return authStore.selectRespo?.permissions?.[menuId] || {};
});


// ============================================================================
// STATE — variabel reaktif yang dipakai di form
// ============================================================================
const loading = ref(false);  // Menampilkan spinner saat sedang request

// Ambil parameter dari URL:
// recordId = id record yang sedang diedit/dilihat (null jika mode create)
// action   = aksi saat ini: "Edit", "View", "Copy", atau null (create)
const recordId = computed(() => route.params.id);
const action = computed(() => route.query.action);

// Cek mode saat ini berdasarkan URL
const isEditMode = computed(() => !!recordId.value && action.value === "Edit");
const isViewMode = computed(
  () => !!recordId.value && (!action.value || action.value === "View"),
);
const isCopyMode = computed(() => !!recordId.value && action.value === "Copy");
const isCreateMode = computed(() => !recordId.value);
const isReadOnly = computed(() => isViewMode.value);  // View mode = form readonly

// Judul & deskripsi halaman dinamis sesuai mode
const pageTitle = computed(() => {
  if (isViewMode.value) return "Detail Master Raz Purchase Req Header";
  if (isCopyMode.value) return "Salin Master Raz Purchase Req Header";
  if (isEditMode.value) return "Edit Master Raz Purchase Req Header";
  return "Tambah Master Raz Purchase Req Header Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master raz purchase req header";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master raz purchase req header";
  return "Buat data master raz purchase req header baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  kode_supplier: "",
  kode_coba: "",
  nama_supp: "",
  nama_coba: "",
  alamat_supp: "",
  negara_supp_id: "",
  kota_supp_id: "",
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  kode_supplier: "",
  kode_coba: "",
  nama_supp: "",
  nama_coba: "",
  alamat_supp: "",
  negara_supp_id: "",
  kota_supp_id: "",
});
const wizardStep = ref(0);

// Detail arrays
const detailArr = ref([]);


const handleDetailAdd = (selectedItems) => {
  if (!selectedItems || selectedItems.length === 0) return;
  let addedCount = 0;
  let skippedCount = 0;
  selectedItems.forEach((item) => {
    detailArr.value.push({
      m_item.id: $resolvePath(item, "m_item.id") ?? item.id ?? null,
      m_items: item,
      m_item.nama_item: item.nama_item || "",
      harga: 0,
      disc: 0,
      qty: 0,
      subtotal: 0,
      cek_stok: "",
    });
    addedCount++;
  });
  if (addedCount > 0) toast.success(`${addedCount} item ditambahkan`);
  if (skippedCount > 0) toast.warning(`${skippedCount} item sudah ada`);
};

const removeDetail = (index) => {
  detailArr.value.splice(index, 1);
  toast.info("Item dihapus dari daftar");
};


// ── Detail Computed (Per-Row Formula) ──

// Auto-compute detail formula fields for detailArr
watch(detailArr, (arr) => {
  if (isReadOnly.value) return;
  arr.forEach((row) => {
      // subtotal = harga * ( 1 - ( disc / 100 ) ) * qty
      row.subtotal = (Number(row.harga) || 0) * (1 - ((Number(row.disc) || 0) / 100)) * (Number(row.qty) || 0);
  });
}, { deep: true, immediate: true });

// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/raz_purchase_req_header";
const API_SAVE = API_BASE + "/with-details"; // with-details karena ada detail

// ============================================================================
// LOAD DATA — Dipanggil saat halaman pertama kali dibuka (onBeforeMount)
// Jika ada recordId (mode Edit/View/Copy), ambil data dari server
// ============================================================================
const isRead = !!recordId.value;  // true kalau mode Edit / View / Copy

onBeforeMount(async () => {
  if (!isRead) return;  // Mode create, tidak perlu load data

  const params = { join: true };
  const fixedParams = new URLSearchParams(params);

  loading.value = true;
  try {
    // Panggil API untuk ambil data berdasarkan ID
    const res = await api.get(`${API_BASE}/${recordId.value}?` + fixedParams);

    // Ambil data dari response (handle berbagai format response)
    const data = res?.data ?? res;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Data tidak ditemukan");
    }

    // Konversi boolean untuk field switch (karena dari DB bisa 0/1)
    for (const key of Object.keys(values)) {
      if (typeof values[key] === "boolean" && data[key] !== undefined) {
        data[key] = data[key] === true || data[key] === 1 || data[key] === "1";
      }
    }

    // Mode Copy: hapus id supaya nanti tersimpan sebagai data baru
    if (isCopyMode.value) {
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;
    }

    // Masukkan data ke form (hanya field yang sudah didefinisikan di values)
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = data[key] ?? "";
      }
    }

    // Load detail: detailArr
    if (data) {
      detailArr.value = data.map((detail) => ({
        m_item.id: detail.m_item.id,
        m_items: detail.m_items || null,
        m_item.nama_item: detail.m_item.nama_item || "",
        harga: detail.harga !== undefined ? detail.harga : 0,
        disc: detail.disc !== undefined ? detail.disc : 0,
        qty: detail.qty !== undefined ? detail.qty : 0,
        subtotal: detail.subtotal !== undefined ? detail.subtotal : 0,
        cek_stok: detail.cek_stok || "",
      }));
    }
  } catch (err) {
    // Kalau gagal load data, tampilkan error dan kembali ke halaman list
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/raz/purchasing/raz_purchase_req_header"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    kode_supplier: "",
    kode_coba: "",
    nama_supp: "",
    nama_coba: "",
    alamat_supp: "",
    negara_supp_id: "",
    kota_supp_id: "",
  });
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

  // Reset detail arrays
  detailArr.value = [];
};

// ============================================================================
// SAVE — Simpan data ke server (POST untuk create, PUT untuk update)
// ============================================================================
const onSave = async () => {
  // 1. Bersihkan semua pesan error sebelumnya
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

  // 2. Validasi: cek field yang wajib diisi
  let invalid = false;
  if (!values.kode_supplier?.toString().trim()) {
    errors.kode_supplier = "Harus diisi!!";
    invalid = true;
  }
  if (!values.kode_coba?.toString().trim()) {
    errors.kode_coba = "Isien jal!!!";
    invalid = true;
  }
  if (!values.nama_supp?.toString().trim()) {
    errors.nama_supp = "Wajib diisi!!!";
    invalid = true;
  }
  if (!values.nama_coba?.toString().trim()) {
    errors.nama_coba = "ojo lali diisi cak!!";
    invalid = true;
  }
  if (!values.alamat_supp?.toString().trim()) {
    errors.alamat_supp = "Alamat Vendor Wajib Di isi";
    invalid = true;
  }
  if (!values.negara_supp_id?.toString().trim()) {
    errors.negara_supp_id = "Harus dipilih!!!";
    invalid = true;
  }
  if (!values.kota_supp_id?.toString().trim()) {
    errors.kota_supp_id = "Harus diisi!!";
    invalid = true;
  }


  if (invalid) {
    toast.error("Validasi gagal", {
      description: "Mohon lengkapi semua field yang wajib diisi",
    });
    return;
  }

  // 3. Konfirmasi sebelum menyimpan
  if (!window.confirm("Simpan data?")) return;

  // 4. Kirim data ke server
  loading.value = true;
  try {
    // Siapkan payload (data yang akan dikirim)
    const payload = {
    kode_supplier: values.kode_supplier?.toString().trim() || null,
    kode_coba: values.kode_coba?.toString().trim() || null,
    nama_supp: values.nama_supp?.toString().trim() || null,
    nama_coba: values.nama_coba?.toString().trim() || null,
    alamat_supp: values.alamat_supp?.toString().trim() || null,
    negara_supp_id: values.negara_supp_id?.toString().trim() || null,
    kota_supp_id: values.kota_supp_id?.toString().trim() || null,

      detail: detailArr.value.map((d) => ({
        m_item.id: d.m_item.id,
        m_item.nama_item: d.m_item.nama_item?.toString().trim() || null,
        harga: d.harga !== undefined ? d.harga : 0,
        disc: d.disc !== undefined ? d.disc : 0,
        qty: d.qty !== undefined ? d.qty : 0,
        subtotal: d.subtotal !== undefined ? d.subtotal : 0,
        cek_stok: d.cek_stok?.toString().trim() || null,
      })),
    };

    // Pilih method: PUT (update) atau POST (create baru)
    if (isEditMode.value) {
      await api.put(`${API_SAVE}/${recordId.value}`, payload);
      toast.success("Data berhasil diperbarui");
    } else {
      await api.post(API_SAVE, payload);
      toast.success("Data berhasil dibuat");
    }

    // Kembali ke halaman list setelah sukses simpan
    router.replace("/raz/purchasing/raz_purchase_req_header");
  } catch (error) {
    // Tampilkan error dari server
    toast.error(
      isEditMode.value ? "Gagal memperbarui data" : "Gagal membuat data",
      { description: error?.message || "Terjadi kesalahan" },
    );
  }
  loading.value = false;
};

// ============================================================================
// CANCEL — Kembali ke halaman list tanpa menyimpan
// ============================================================================
const handleCancel = () => {
  router.push("/raz/purchasing/raz_purchase_req_header");
};
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- ================================================================ -->
    <!-- HEADER SECTION -->
    <!-- ================================================================ -->
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="handleCancel">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold text-foreground">
          {{ pageTitle }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ pageDescription }}
        </p>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- FORM SECTION -->
    <!-- ================================================================ -->
    <form class="space-y-6" @submit.prevent>
      <Card :key="recordId || 'new'">
        <CardHeader>
          <CardTitle>Informasi Master Raz Purchase Req Header</CardTitle>
          <CardDescription>
            Isi data master raz purchase req header dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Wizard Steps -->
          <div class="flex gap-2 mb-6 flex-wrap">
              <button
                @click="wizardStep = 0"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="wizardStep === 0 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'"
              >
                <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="wizardStep === 0 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'">1</span>
                Steady
              </button>
              <button
                @click="wizardStep = 1"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="wizardStep === 1 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'"
              >
                <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="wizardStep === 1 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'">2</span>
                Ready
              </button>
              <button
                @click="wizardStep = 2"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="wizardStep === 2 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'"
              >
                <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="wizardStep === 2 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'">3</span>
                Go
              </button>
          </div>

          <div v-show="wizardStep === 0" class="grid grid-cols-1 gap-6">
            <FieldX
              id="kode_supplier"
              label="Kode Vendor"
              :value="values.kode_supplier"
              :errorname="errors.kode_supplier ? 'failed' : ''"
              @input="(v) => (values.kode_supplier = v)"
              :hints="errors.kode_supplier"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Isi kode untuk vendor"
              class="w-full"
            />

            <FieldX
              id="kode_coba"
              label="Kode Coba"
              :value="values.kode_coba"
              :errorname="errors.kode_coba ? 'failed' : ''"
              @input="(v) => (values.kode_coba = v)"
              :hints="errors.kode_coba"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Kode Coba"
              class="w-full"
            />

            <div class="md:col-span-2">
            <div class="col-span-full border-b border-border pb-2 pt-4">
              <h3 class="text-base font-semibold text-foreground">Section Title</h3>
            </div>
            </div>

            <FieldX
              id="nama_coba"
              label="Nama Coba"
              :value="values.nama_coba"
              :errorname="errors.nama_coba ? 'failed' : ''"
              @input="(v) => (values.nama_coba = v)"
              :hints="errors.nama_coba"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Nama Coba"
              class="w-full"
            />

            <div></div>

            <div class="md:col-span-2 rounded-lg border border-border bg-card/50 p-5 space-y-1">
              <h3 class="text-sm font-semibold text-foreground mb-3">Lokasi Vendor</h3>
              <div class="grid grid-cols-1 gap-6">

              </div>
            </div>
          </div>

          <div v-show="wizardStep === 1" class="grid grid-cols-1 gap-6">
            <FieldX
              id="nama_supp"
              label="Nama Vendor"
              :value="values.nama_supp"
              :errorname="errors.nama_supp ? 'failed' : ''"
              @input="(v) => (values.nama_supp = v)"
              :hints="errors.nama_supp"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Isi nama untuk vendor"
              class="w-full"
            />

            <FieldX
              id="alamat_supp"
              label="Alamat Vendor"
              :value="values.alamat_supp"
              :errorname="errors.alamat_supp ? 'failed' : ''"
              @input="(v) => (values.alamat_supp = v)"
              :hints="errors.alamat_supp"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Isi alamat untuk vendor"
              class="w-full"
            />

            <div class="md:col-span-2">
            <div class="col-span-full border-b border-border pb-2 pt-4">
              <h3 class="text-base font-semibold text-foreground">Section Title</h3>
            </div>
            </div>
          </div>

          <div v-show="wizardStep === 2" class="grid grid-cols-1 gap-6">
            <FieldSelect
              id="negara_supp_id"
              label="Negara Vendor"
              :value="values.negara_supp_id"
              :errorname="errors.negara_supp_id ? 'failed' : ''"
              @input="(v) => { values.negara_supp_id = v; values.kota_supp_id = '' }"
              :hints="errors.negara_supp_id"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_negoro"
              displayField="nama_negoro"
              valueField="id"
              placeholder="Negara Vendor"
              :clearable="true"
              class="w-full"
            />

            <FieldSelect
              id="kota_supp_id"
              label="Kota Vendor"
              :value="values.kota_supp_id"
              :errorname="errors.kota_supp_id ? 'failed' : ''"
              @input="(v) => (values.kota_supp_id = v)"
              :hints="errors.kota_supp_id"
              :required="!isReadOnly"
              :disabled="!values.negara_supp_id || loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_kuto?join=true"
              :apiParams="{ 'filter_column_m_negoro.id': values.negara_supp_id }"
              displayField="nama_kuto"
              valueField="id"
              placeholder="Kota Vendor"
              :clearable="true"
              class="w-full"
            />
          </div>

          <div class="flex justify-between mt-4">
            <Button variant="outline" v-if="wizardStep > 0" @click="wizardStep--">Sebelumnya</Button>
            <div v-else />
            <Button v-if="wizardStep < 2" @click="wizardStep++">Selanjutnya</Button>
          </div>
        </CardContent>
      </Card>

      <!-- DETAIL TABS -->
      <Tabs default-value="detail-tab-0" class="w-full">
        <TabsList class="w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="detail-tab-0">Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="detail-tab-0" class="mt-4">
          <div class="space-y-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Detail</CardTitle>
                  <CardDescription>Kelola data detail</CardDescription>
                </div>
                <ButtonMultiSelect
                  v-if="!isReadOnly"
                  title="Pilih Item"
                  :api="{ url: '/api/fn/raz_purchase_req_header/readSum' }"
                  :columns="[
                    { key: 'kode_item', label: 'Kode Item', sortable: true, width: '200px' },
                    { key: 'nama_item', label: 'Nama Item', sortable: true, width: '200px' },
                    { key: 'value1', label: 'Unit', sortable: true, width: '200px' },
                    { key: 'qty', label: 'Qty Stock', sortable: true, width: '200px' }
                  ]"
                  searchKey="m_item.nama_item"
                  @add="handleDetailAdd"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div class="border rounded-lg overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-muted">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">No</th>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Kode Item</th>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Nama Item</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 180px; min-width: 180px;">Nama Item Print</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Harga</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Discount(%)</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Quantity</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Subtotal</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 180px; min-width: 180px;">Cek Stok</th>
                      <th v-if="!isReadOnly" class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="detailArr.length === 0">
                      <td colspan="10" class="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                        Belum ada item ditambahkan
                      </td>
                    </tr>
                    <tr v-for="(detail, index) in detailArr" :key="index" class="border-t hover:bg-muted/50">
                      <td class="px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{{ index + 1 }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.m_items?.kode_item || '-' }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.m_items?.nama_item || '-' }}</td>
                      <td class="px-2 py-2" style="width: 180px; min-width: 180px;">
                        <FieldX
                          v-if="!isReadOnly"
                          :value="detail.m_item.nama_item"
                          @input="(v) => (detail.m_item.nama_item = v)"
                          placeholder="Nama Item Print"
                          :readonly="false"
                          class="w-full"
                        />
                        <span v-else>{{ detail.m_item.nama_item || '-' }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.harga"
                          @input="(v) => (detail.harga = v)"
                          type="decimal"
                          :readonly="false"
                          :decimalPlaces="2"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.harga || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.disc"
                          @input="(v) => (detail.disc = v)"
                          type="decimal"
                          :readonly="false"
                          :decimalPlaces="2"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.disc || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.qty"
                          @input="(v) => (detail.qty = v)"
                          type="decimal"
                          :readonly="false"
                          :decimalPlaces="2"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.qty || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <span class="text-xs sm:text-sm font-medium text-foreground/80">{{ Number(detail.subtotal || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2" style="width: 180px; min-width: 180px;">
                        <FieldPopUp
                          v-if="!isReadOnly"
                          :value="detail.cek_stok"
                          @input="(v) => (detail.cek_stok = v)"
                          apiUrl="/api/fn/raz_purchase_req_header/readGudang?kode_item=x999"
                          displayField="nama_item"
                          valueField="id"
                          :columns="[{ field: 'kode_item', headerName: 'Kode Item' }, { field: 'nama_item', headerName: 'Nama Item' }, { field: 'value1', headerName: 'UOM' }, { field: 'free_stock', headerName: 'Qty' }, { field: 'nama_gudang', headerName: 'Gudang' }]"
                          searchFields="nama_gudang"
                          dialogTitle="Cek Stok"
                          :readonly="false"
                          class="w-full"
                        />
                        <span v-else>{{ detail.cek_stok || '-' }}</span>
                      </td>
                      <td v-if="!isReadOnly" class="px-2 py-2 text-center whitespace-nowrap">
                        <Button variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8" @click="removeDetail(index)">
                          <Trash2 class="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-muted/70 border-t-2 border-border">
                    <tr>
                      <td class="px-2 py-2 text-right font-bold text-xs sm:text-sm" colspan="3">Total</td>
                      <td class="px-2 py-2"></td>
                      <td class="px-2 py-2"></td>
                      <td class="px-2 py-2"></td>
                      <td class="px-2 py-2"></td>
                      <td class="px-2 py-2 text-right font-semibold text-xs sm:text-sm">
                        {{ Number(detailArr.reduce((s, d) => s + (Number(d.subtotal) || 0), 0) || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                      </td>
                      <td class="px-2 py-2"></td>
                      <td class="px-2 py-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      </Tabs>

      <!-- ================================================================ -->
      <!-- ACTION BUTTONS -->
      <!-- ================================================================ -->
      <div
        class="flex flex-col-reverse sm:flex-row items-center gap-3 sm:justify-end sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t sm:border-0 -mx-6 px-6 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:py-0 sm:static"
      >
        <Button
          type="button"
          variant="outline"
          @click="handleCancel"
          :disabled="loading"
          class="w-full sm:w-auto"
        >
          {{ isReadOnly ? "Kembali" : "Batal" }}
        </Button>
        <Button
          v-if="isViewMode && perms.is_print !== false"
          type="button"
          variant="outline"
          @click="navigateTo('/raz/purchasing/raz_purchase_req_header/print/' + recordId, { open: { target: '_blank' } })"
          class="gap-2 w-full sm:w-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          Cetak
        </Button>
        <Button
          v-if="!isReadOnly && (isEditMode ? perms.is_update !== false : perms.is_create !== false)"
          type="button"
          @click="onSave"
          :disabled="loading"
          class="gap-2 w-full sm:w-auto"
        >
          <Loader2
            v-if="loading"
            class="h-4 w-4 animate-spin"
          />
          <Save v-else class="h-4 w-4" />
          {{ isEditMode ? "Perbarui" : "Simpan" }}
        </Button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.required::after {
  content: " *";
  color: hsl(var(--destructive));
}
</style>
