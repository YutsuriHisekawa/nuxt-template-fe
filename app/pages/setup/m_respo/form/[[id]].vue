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
// AUTH — Cek tipe user (Super Admin atau bukan)
// ============================================================================
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

// Nama company untuk display di field readonly (non-super-admin)
const companyNameDisplay = computed(() => {
  const ud = authStore.userDefault;
  if (!ud) return '-';
  // Coba dari karyawan.m_unit_bisni (selalu ada di response join)
  if (ud.karyawan?.m_unit_bisni?.nama_comp) return ud.karyawan.m_unit_bisni.nama_comp;
  // Fallback: dari user_details -> m_respo -> unit_bisnis
  const primary = ud.user_details?.find((d) => d.is_primary && d.is_active) || ud.user_details?.find((d) => d.is_active);
  return primary?.m_respo?.unit_bisnis?.nama_comp || '-';
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
  if (isViewMode.value) return "Detail Master Respo";
  if (isCopyMode.value) return "Salin Master Respo";
  if (isEditMode.value) return "Edit Master Respo";
  return "Tambah Master Respo Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master respo";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master respo";
  return "Buat data master respo baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  m_unit_bisnis_id: "",
  nama: "",
  catatan: "",
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  m_unit_bisnis_id: "",
  nama: "",
  catatan: "",
});


// Detail arrays
const detailArr = ref([]);

const selectedDetailIds = computed(() => detailArr.value.map(d => d.m_role_id));

const handleDetailAdd = (selectedItems) => {
  if (!selectedItems || selectedItems.length === 0) return;
  let addedCount = 0;
  let skippedCount = 0;
  selectedItems.forEach((item) => {
    const exists = detailArr.value.some((d) => d.m_role_id === item.id);
    if (exists) { skippedCount++; return; }
    detailArr.value.push({
      m_role_id: item.id,
      m_role: item,
      catatan: "",
      is_active: true,
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


// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_respo";
const API_SAVE = API_BASE + "/with-details"; // with-details karena ada detail

// ============================================================================
// LOAD DATA — Dipanggil saat halaman pertama kali dibuka (onBeforeMount)
// Jika ada recordId (mode Edit/View/Copy), ambil data dari server
// ============================================================================
const isRead = !!recordId.value;  // true kalau mode Edit / View / Copy

onBeforeMount(async () => {
  // Auto-fill unit bisnis dari user respo untuk non-super-admin
  if (!isSuperAdmin.value) {
    const ud = authStore.userDefault;
    if (ud) {
      // Prioritas: karyawan.m_unit_bisnis_id (pasti ada) → respo.m_unit_bisnis_id
      const companyId = ud.karyawan?.m_unit_bisnis_id
        || ud.user_details?.find((d) => d.is_primary && d.is_active)?.m_respo?.m_unit_bisnis_id
        || ud.user_details?.find((d) => d.is_active)?.m_respo?.m_unit_bisnis_id;
      if (companyId) values.m_unit_bisnis_id = companyId;
    }
  }

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

    // Load detail: m_respo_ds
    if (data.m_respo_ds) {
      detailArr.value = data.m_respo_ds.map((detail) => ({
        m_role_id: detail.m_role_id,
        m_role: detail.m_role || null,
        catatan: detail.catatan || "",
        is_active: detail.is_active !== undefined ? detail.is_active : true,
      }));
    }
  } catch (err) {
    // Kalau gagal load data, tampilkan error dan kembali ke halaman list
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/setup/m_respo"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    m_unit_bisnis_id: "",
    nama: "",
    catatan: "",
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
  if (!values.nama?.toString().trim()) {
    errors.nama = "Nama Respo Wajib Di isi";
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
    m_unit_bisnis_id: values.m_unit_bisnis_id?.toString().trim() || null,
    nama: values.nama?.toString().trim() || null,
    catatan: values.catatan?.toString().trim() || null,

      m_respo_d: detailArr.value.map((d) => ({
        m_role_id: d.m_role_id,
        catatan: d.catatan?.toString().trim() || null,
        is_active: d.is_active !== undefined ? d.is_active : true,
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
    router.replace("/setup/m_respo");
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
  router.push("/setup/m_respo");
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
          <CardTitle>Informasi Master Respo</CardTitle>
          <CardDescription>
            Isi data master respo dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Super Admin: bisa pilih unit bisnis -->
            <FieldSelect
              v-if="isSuperAdmin"
              id="m_unit_bisnis_id"
              label="Unit Bisnis"
              :value="values.m_unit_bisnis_id"
              :errorname="errors.m_unit_bisnis_id ? 'failed' : ''"
              @input="(v) => (values.m_unit_bisnis_id = v)"
              :hints="errors.m_unit_bisnis_id"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_unit_bisnis?join=true"
              displayField="nama_comp"
              valueField="id"
              placeholder="Pilih Unit Bisnis"
              :clearable="true"
              class="w-full"
            />
            <!-- Non-super-admin: readonly, otomatis dari unit bisnis user -->
            <FieldX
              v-else
              id="m_unit_bisnis_id_display"
              label="Unit Bisnis"
              :value="companyNameDisplay"
              :disabled="true"
              :readonly="true"
              hints="Unit bisnis dari akun Anda"
              class="w-full"
            />

            <FieldX
              id="nama"
              label="Nama Respo"
              :value="values.nama"
              :errorname="errors.nama ? 'failed' : ''"
              @input="(v) => (values.nama = v)"
              :hints="errors.nama"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Nama Respo"
              class="w-full"
            />

            <div class="md:col-span-2">
            <FieldTextarea
              id="catatan"
              label="Catatan"
              :value="values.catatan"
              :errorname="errors.catatan ? 'failed' : ''"
              @input="(v) => (values.catatan = v)"
              :hints="errors.catatan"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Tuliskan C"
              class="w-full"
            />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- DETAIL TABS -->
      <Tabs default-value="detail-0" class="w-full">
        <TabsList class="w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="detail-0">Detail Respo</TabsTrigger>
        </TabsList>

        <TabsContent value="detail-0" class="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Detail Respo</CardTitle>
                  <CardDescription>Kelola data detail</CardDescription>
                </div>
                <ButtonMultiSelect
                  v-if="!isReadOnly"
                  title="Pilih Item"
                  :api="{ url: '/api/dynamic/m_role' }"
                  :columns="[
                    { key: 'kode_role', label: 'Kode Role', sortable: true, width: '200px' },
                    { key: 'nama_role', label: 'Nama Role', sortable: true, width: '200px' }
                  ]"
                  searchKey="name"
                  displayKey="name"
                  uniqueKey="id"
                  :excludeIds="selectedDetailIds"
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
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Kode Role</th>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Nama Role</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Catatan</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">status</th>
                      <th v-if="!isReadOnly" class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="detailArr.length === 0">
                      <td colspan="6" class="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                        Belum ada item ditambahkan
                      </td>
                    </tr>
                    <tr v-for="(detail, index) in detailArr" :key="index" class="border-t hover:bg-muted/50">
                      <td class="px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{{ index + 1 }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.m_role?.kode_role || '-' }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.m_role?.nama_role || '-' }}</td>
                      <td class="px-2 py-2">
                        <FieldTextarea
                          v-if="!isReadOnly"
                          :value="detail.catatan"
                          @input="(v) => (detail.catatan = v)"
                          class="w-full"
                        />
                        <span v-else>{{ detail.catatan || '-' }}</span>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_active"
                          @input="(v) => (detail.is_active = v)"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_active ? 'Ya' : 'Tidak' }}</span>
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
          v-if="!isReadOnly"
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
