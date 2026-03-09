<script setup lang="js">
// @ts-nocheck — Template builder, bukan runtime code
import { toast } from "vue-sonner";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";
import { Trash2 } from "lucide-vue-next";

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
  return authStore.selectRespo?.menus?.find(m => m.path === '/marketing/transaksi/t_sales_order');
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
  if (isViewMode.value) return "Detail Transaksi Sales Order";
  if (isCopyMode.value) return "Salin Transaksi Sales Order";
  if (isEditMode.value) return "Edit Transaksi Sales Order";
  return "Tambah Transaksi Sales Order Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data transaksi sales order";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data transaksi sales order";
  return "Buat data transaksi sales order baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  note: "",
  amount: "",
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  note: "",
  amount: "",
});


// Detail arrays
const detailArr = ref([]);

const selectedDetailIds = computed(() => detailArr.value.map(d => d.item_id));

const handleDetailAdd = (selectedItems) => {
  if (!selectedItems || selectedItems.length === 0) return;
  let addedCount = 0;
  let skippedCount = 0;
  selectedItems.forEach((item) => {
    const exists = detailArr.value.some((d) => d.item_id === item.id);
    if (exists) { skippedCount++; return; }
    detailArr.value.push({
      item_id: item.id,
      nama_item: item,
      nama_item_cetak: item.nama_item || "",
      qty: 0,
      price: 0,
      amount: 0,
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
    // amount = qty * price
    row.amount = (Number(row.qty) || 0) * (Number(row.price) || 0);
  });

  // MYB  
  values.amount = arr.reduce((total, row) => total + row.amount, 0);

}, { deep: true, immediate: true });

// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/t_sales_order";
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

    // Load detail: t_so_ds
    if (data.t_so_ds) {
      detailArr.value = data.t_so_ds.map((detail) => ({
        item_id: detail.item_id,
        nama_item: detail.nama_item || null,
        nama_item_cetak: detail.nama_item_cetak || "",
        qty: detail.qty !== undefined ? detail.qty : 0,
        price: detail.price !== undefined ? detail.price : 0,
        amount: detail.amount !== undefined ? detail.amount : 0,
      }));
    }
  } catch (err) {
    // Kalau gagal load data, tampilkan error dan kembali ke halaman list
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/marketing/transaksi/t_sales_order"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    note: "",
    amount: "",
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
      note: values.note?.toString().trim() || null,
      amount: values.amount?.toString().trim() || null,

      t_so_ds: detailArr.value.map((d) => ({
        item_id: d.item_id,
        nama_item_cetak: d.nama_item_cetak?.toString().trim() || null,
        qty: d.qty !== undefined ? d.qty : 0,
        price: d.price !== undefined ? d.price : 0,
        amount: d.amount !== undefined ? d.amount : 0,
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
    router.replace("/marketing/transaksi/t_sales_order");
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
  router.push("/marketing/transaksi/t_sales_order");
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
          <CardTitle>Informasi Transaksi Sales Order</CardTitle>
          <CardDescription>
            Isi data transaksi sales order dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX id="note" label="Catatan" :value="values.note" :errorname="errors.note ? 'failed' : ''"
              @input="(v) => (values.note = v)" :hints="errors.note" :required="false" :disabled="loading || isReadOnly"
              :readonly="isReadOnly" placeholder="Catatan" class="w-full" />

            <FieldCurrency id="amount" label="Total SO" :value="values.amount"
              :errorname="errors.amount ? 'failed' : ''" @input="(v) => (values.amount = v)" :hints="errors.amount"
              :required="false" :disabled="loading || isReadOnly" :readonly="true" prefix="Rp" :allowDecimal="true"
              placeholder="Total SO" class="w-full" />
          </div>
        </CardContent>
      </Card>

      <!-- DETAIL TABS -->
      <Tabs default-value="detail-0" class="w-full">
        <TabsList class="w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="detail-0">Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="detail-0" class="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Detail</CardTitle>
                  <CardDescription>Kelola data detail</CardDescription>
                </div>
                <ButtonMultiSelect v-if="!isReadOnly" title="Pilih Item" :api="{ url: '/api/dynamic/m_items' }"
                  :columns="[
                    { key: 'kode_item', label: 'Kode Item', sortable: true, width: '30%' },
                    { key: 'nama_item', label: 'Nama Item', sortable: true, width: '70%' }
                  ]" searchKey="nama_item" displayKey="Item" uniqueKey="id" :excludeIds="selectedDetailIds"
                  @add="handleDetailAdd" />
              </div>
            </CardHeader>
            <CardContent>
              <div class="border rounded-lg overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-muted">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">No</th>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Kode</th>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Nama</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Nama Cetakan</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Qty</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Harga</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Total</th>
                      <th v-if="!isReadOnly" class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="detailArr.length === 0">
                      <td colspan="8" class="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                        Belum ada item ditambahkan
                      </td>
                    </tr>
                    <tr v-for="(detail, index) in detailArr" :key="index" class="border-t hover:bg-muted/50">
                      <td class="px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{{ index + 1 }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.nama_item?.kode_item || '-' }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.nama_item?.nama_item || '-' }}</td>
                      <td class="px-2 py-2">
                        <FieldX v-if="!isReadOnly" :value="detail.nama_item_cetak"
                          @input="(v) => (detail.nama_item_cetak = v)" placeholder="Nama Cetakan" class="w-full" />
                        <span v-else>{{ detail.nama_item_cetak || '-' }}</span>
                      </td>
                      <td class="px-2 py-2">
                        <FieldNumber v-if="!isReadOnly" :value="detail.qty" @input="(v) => (detail.qty = v)"
                          type="decimal" class="w-full" />
                        <span v-else>{{ detail.qty }}</span>
                      </td>
                      <td class="px-2 py-2">
                        <FieldCurrency v-if="!isReadOnly" :value="detail.price" @input="(v) => (detail.price = v)"
                          class="w-full" />
                        <span v-else>{{ Number(detail.price || 0).toLocaleString('id-ID') }}</span>
                      </td>
                      <td class="px-2 py-2 text-right">
                        <span class="text-xs sm:text-sm font-medium text-foreground/80">{{ Number(detail.amount ||
                          0).toLocaleString('id-ID') }}</span>
                      </td>
                      <td v-if="!isReadOnly" class="px-2 py-2 text-center">
                        <Button variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8" @click="removeDetail(index)">
                          <Trash2 class="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <!-- ================================================================ -->
      <!-- ACTION BUTTONS -->
      <!-- ================================================================ -->
      <div
        class="flex flex-col-reverse sm:flex-row items-center gap-3 sm:justify-end sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t sm:border-0 -mx-6 px-6 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:py-0 sm:static">
        <Button type="button" variant="outline" @click="handleCancel" :disabled="loading" class="w-full sm:w-auto">
          {{ isReadOnly ? "Kembali" : "Batal" }}
        </Button>

        <Button v-if="!isReadOnly && (isEditMode ? perms.is_update !== false : perms.is_create !== false)" type="button"
          @click="onSave" :disabled="loading" class="gap-2 w-full sm:w-auto">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
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
