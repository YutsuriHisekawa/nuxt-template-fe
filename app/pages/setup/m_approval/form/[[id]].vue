<script setup lang="js">
// @ts-nocheck — Template builder, bukan runtime code
import { toast } from "vue-sonner";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";
import { Trash2, Plus } from "lucide-vue-next";

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
  return authStore.selectRespo?.menus?.find(m => m.path === '/setup/m_approval');
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
  if (isViewMode.value) return "Detail Master Approval";
  if (isCopyMode.value) return "Salin Master Approval";
  if (isEditMode.value) return "Edit Master Approval";
  return "Tambah Master Approval Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master approval";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master approval";
  return "Buat data master approval baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  kode_approval: "",
  nama_approval: "",
  m_menu_id: "",
  catatan: "",
  is_active: true,
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  kode_approval: "",
  nama_approval: "",
  m_menu_id: "",
  catatan: "",
});


// Detail arrays
const detailArr = ref([]);


const addDetailRow = () => {
  detailArr.value.push({
    level: 0,
    tipe_approval_id: "",
    user_default_id: "",
    m_unit_bisnis_id: "",
    min_val: 0,
    max_val: 0,
    max_disc: 0,
    max_disc_value: 0,
    top_id: "",
    is_full: true,
    is_active: true,
  });
};

const removeDetail = (index) => {
  detailArr.value.splice(index, 1);
  toast.info("Item dihapus dari daftar");
};



// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_approval";
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

    // Load detail: m_approval_ds
    if (data.m_approval_ds) {
      detailArr.value = data.m_approval_ds.map((detail) => ({
        level: detail.level !== undefined ? detail.level : 0,
        tipe_approval_id: detail.tipe_approval_id || "",
        tipe_approval_value: detail.tipe_approv?.value1 || "",
        user_default_id: detail.user_default_id || "",
        user_default_value: detail.user?.name || "",
        m_unit_bisnis_id: detail.m_unit_bisnis_id || "",
        m_unit_bisnis_value: detail.company_approval?.nama_comp || "",
        min_val: detail.min_val !== undefined ? detail.min_val : 0,
        max_val: detail.max_val !== undefined ? detail.max_val : 0,
        max_disc: detail.max_disc !== undefined ? detail.max_disc : 0,
        max_disc_value: detail.max_disc_value !== undefined ? detail.max_disc_value : 0,
        top_id: detail.top_id || "",
        top_value: detail.top_approval?.value1 || "",
        is_full: detail.is_full !== undefined ? detail.is_full : true,
        is_active: detail.is_active !== undefined ? detail.is_active : true,
      }));
    }
  } catch (err) {
    // Kalau gagal load data, tampilkan error dan kembali ke halaman list
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/setup/m_approval"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    kode_approval: "",
    nama_approval: "",
    m_menu_id: "",
    catatan: "",
    is_active: true,
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
  if (!values.nama_approval?.toString().trim()) {
    errors.nama_approval = "Nama Approval Wajib Di isi";
    invalid = true;
  }
  if (!values.m_menu_id?.toString().trim()) {
    errors.m_menu_id = "Menu Wajib Di isi";
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
    kode_approval: values.kode_approval?.toString().trim() || null,
    nama_approval: values.nama_approval?.toString().trim() || null,
    m_menu_id: values.m_menu_id?.toString().trim() || null,
    catatan: values.catatan?.toString().trim() || null,
    is_active: values.is_active,

      m_approval_d: detailArr.value.map((d) => ({
        level: d.level !== undefined ? d.level : 0,
        tipe_approval_id: d.tipe_approval_id?.toString().trim() || null,
        user_default_id: d.user_default_id?.toString().trim() || null,
        m_unit_bisnis_id: d.m_unit_bisnis_id?.toString().trim() || null,
        min_val: d.min_val !== undefined ? d.min_val : 0,
        max_val: d.max_val !== undefined ? d.max_val : 0,
        max_disc: d.max_disc !== undefined ? d.max_disc : 0,
        max_disc_value: d.max_disc_value !== undefined ? d.max_disc_value : 0,
        top_id: d.top_id?.toString().trim() || null,
        is_full: d.is_full !== undefined ? d.is_full : true,
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
    router.replace("/setup/m_approval");
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
  router.push("/setup/m_approval");
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
          <CardTitle>Informasi Master Approval</CardTitle>
          <CardDescription>
            Isi data master approval dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX
              id="kode_approval"
              label="Kode Approval"
              :value="values.kode_approval"
              :errorname="errors.kode_approval ? 'failed' : ''"
              @input="(v) => (values.kode_approval = v)"
              :hints="errors.kode_approval"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="true"
              
              placeholder="Auto-generated"
              class="w-full"
            />

            <FieldX
              id="nama_approval"
              label="Nama Approval"
              :value="values.nama_approval"
              :errorname="errors.nama_approval ? 'failed' : ''"
              @input="(v) => (values.nama_approval = v)"
              :hints="errors.nama_approval"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Contoh: Approval Pembelian"
              class="w-full"
            />

            <FieldPopUp
              id="m_menu_id"
              label="Menu"
              :value="values.m_menu_id"
              :errorname="errors.m_menu_id ? 'failed' : ''"
              @input="(v) => (values.m_menu_id = v)"
              :hints="errors.m_menu_id"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_menu"
              displayField="name"
              valueField="id"
              :columns="[{ field: 'name', headerName: 'Nama Menu' }, { field: 'modul', headerName: 'Modul' }, { field: 'sub_modul', headerName: 'Sub Modul' }, { field: 'path', headerName: 'Path Menu' }]"
              searchFields="name,modul,submodul,path"
              placeholder="Pilih Menu"
              :clearable="true"
              class="w-full"
            />

            <div></div>

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
              placeholder="Masukkan catatan atau deskripsi"
              class="w-full"
            />
            </div>

            <FieldStatus
              v-model="values.is_active"
              label="Status Aktif"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              active-text="Aktif"
              inactive-text="Tidak Aktif"
            />
          </div>
        </CardContent>
      </Card>

      <!-- DETAIL TABS -->
      <Tabs default-value="detail-0" class="w-full">
        <TabsList class="w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="detail-0">Detail Approval Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="detail-0" class="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Detail Approval Workflows</CardTitle>
                  <CardDescription>Kelola data detail</CardDescription>
                </div>
                <Button
                  v-if="!isReadOnly"
                  variant="outline"
                  size="sm"
                  class="gap-1.5"
                  @click="addDetailRow"
                >
                  <Plus class="h-4 w-4" />
                  Pilih Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div class="border rounded-lg overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-muted">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">No</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 140px; min-width: 140px;">Level</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 180px; min-width: 180px;">Tipe</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 180px; min-width: 180px;">User</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 180px; min-width: 180px;">Unit Bisnis</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Min Val</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Max Val</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Max Disc. (%)</th>
                      <th class="px-2 py-2 text-right font-medium text-xs sm:text-sm" style="width: 150px; min-width: 150px;">Max Disc. (Rp)</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 180px; min-width: 180px;">TOP</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 110px; min-width: 110px;">Full</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 110px; min-width: 110px;">Aktif</th>
                      <th v-if="!isReadOnly" class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="detailArr.length === 0">
                      <td colspan="13" class="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                        Belum ada item ditambahkan
                      </td>
                    </tr>
                    <tr v-for="(detail, index) in detailArr" :key="index" class="border-t hover:bg-muted/50">
                      <td class="px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{{ index + 1 }}</td>
                      <td class="px-2 py-2 text-right" style="width: 140px; min-width: 140px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.level"
                          @input="(v) => (detail.level = v)"
                          type="integer"
                          :readonly="false"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.level || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</span>
                      </td>
                      <td class="px-2 py-2" style="width: 180px; min-width: 180px;">
                        <FieldSelect
                          v-if="!isReadOnly"
                          :value="detail.tipe_approval_id"
                          @input="(v) => (detail.tipe_approval_id = v)"
                          apiUrl="/api/dynamic/m_general?filter_column_group=TIPE APPROVAL&filter_column_is_active=true"
                          displayField="value1"
                          valueField="id"
                          :readonly="false"
                          class="w-full"
                        />
                        <span v-else>{{ detail.tipe_approval_value || '-' }}</span>
                      </td>
                      <td class="px-2 py-2" style="width: 180px; min-width: 180px;">
                        <FieldSelect
                          v-if="!isReadOnly"
                          :value="detail.user_default_id"
                          @input="(v) => (detail.user_default_id = v)"
                          apiUrl="/api/dynamic/user_default?filter_column_is_active=true"
                          displayField="name"
                          valueField="id"
                          :readonly="false"
                          class="w-full"
                        />
                        <span v-else>{{ detail.user_default_value || '-' }}</span>
                      </td>
                      <td class="px-2 py-2" style="width: 180px; min-width: 180px;">
                        <FieldSelect
                          v-if="!isReadOnly"
                          :value="detail.m_unit_bisnis_id"
                          @input="(v) => (detail.m_unit_bisnis_id = v)"
                          apiUrl="/api/dynamic/m_unit_bisnis?filter_column_is_active=true"
                          displayField="nama_comp"
                          valueField="id"
                          :readonly="false"
                          class="w-full"
                        />
                        <span v-else>{{ detail.m_unit_bisnis_value || '-' }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.min_val"
                          @input="(v) => (detail.min_val = v)"
                          type="decimal"
                          :readonly="false"
                          :decimalPlaces="2"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.min_val || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.max_val"
                          @input="(v) => (detail.max_val = v)"
                          type="decimal"
                          :readonly="false"
                          :decimalPlaces="2"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.max_val || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.max_disc"
                          @input="(v) => (detail.max_disc = v)"
                          type="decimal"
                          :readonly="false"
                          :decimalPlaces="2"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.max_disc || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2 text-right" style="width: 150px; min-width: 150px;">
                        <FieldNumber
                          v-if="!isReadOnly"
                          :value="detail.max_disc_value"
                          @input="(v) => (detail.max_disc_value = v)"
                          type="decimal"
                          :readonly="false"
                          :decimalPlaces="2"
                          class="w-full"
                        />
                        <span v-else>{{ Number(detail.max_disc_value || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}</span>
                      </td>
                      <td class="px-2 py-2" style="width: 180px; min-width: 180px;">
                        <FieldSelect
                          v-if="!isReadOnly"
                          :value="detail.top_id"
                          @input="(v) => (detail.top_id = v)"
                          apiUrl="/api/dynamic/m_general?filter_column_group=TERMIN&filter_column_is_active=true"
                          displayField="value1"
                          valueField="id"
                          :readonly="false"
                          class="w-full"
                        />
                        <span v-else>{{ detail.top_value || '-' }}</span>
                      </td>
                      <td class="px-2 py-2 text-center" style="width: 110px; min-width: 110px;">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_full"
                          @input="(v) => (detail.is_full = v)"
                          :readonly="false"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_full ? 'Ya' : 'Tidak' }}</span>
                      </td>
                      <td class="px-2 py-2 text-center" style="width: 110px; min-width: 110px;">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_active"
                          @input="(v) => (detail.is_active = v)"
                          :readonly="false"
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
