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
  return authStore.selectRespo?.menus?.find(m => m.path === '/setup/user_default');
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
  if (isViewMode.value) return "Detail Master User Default";
  if (isCopyMode.value) return "Salin Master User Default";
  if (isEditMode.value) return "Edit Master User Default";
  return "Tambah Master User Default Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master user default";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master user default";
  return "Buat data master user default baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  name: "",
  username: "",
  password: "",
  tipe_user_id: "",
  m_kary_id: "",
  catatan: "",
  is_active: true,
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  name: "",
  username: "",
  password: "",
  tipe_user_id: "",
  m_kary_id: "",
  catatan: "",
});


// Detail arrays
const detailArr = ref([]);

const selectedDetailIds = computed(() => detailArr.value.map(d => d.user_default_id));

const handleDetailAdd = (selectedItems) => {
  if (!selectedItems || selectedItems.length === 0) return;
  let addedCount = 0;
  let skippedCount = 0;
  let hasPrimary = detailArr.value.some(d => d.is_primary)
  selectedItems.forEach((item, idx) => {
    const exists = detailArr.value.some((d) => d.user_default_id === item.id);
    if (exists) { skippedCount++; return; }
    console.log(idx)
    detailArr.value.push({
      user_default_id: item.id,
      user_default: item,
      is_primary: !hasPrimary && idx ===0,
      is_active: true,
    });
    if (!hasPrimary && idx === 0) {
      hasPrimary = true;
    }
    addedCount++;
  });
  if (addedCount > 0) toast.success(`${addedCount} item ditambahkan`);
  if (skippedCount > 0) toast.warning(`${skippedCount} item sudah ada`);
};

const removeDetail = (index) => {
  detailArr.value.splice(index, 1);
  toast.info("Item dihapus dari daftar");
};

const setPrimary = (index, value) => {
  if (value) {
    detailArr.value.forEach((item, i) => {
      item.is_primary = i === index
    })
  } else {
    detailArr.value[index].is_primary = false;
  }
}


// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/user_default";
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

    // Load detail: user_details
    if (data.user_details) {
      detailArr.value = data.user_details.map((detail) => ({
        user_default_id: detail.user_default_id,
        user_default: detail.user_default || null,
        is_primary: detail.is_primary !== undefined ? detail.is_primary : true,
        is_active: detail.is_active !== undefined ? detail.is_active : true,
      }));
    }
  } catch (err) {
    // Kalau gagal load data, tampilkan error dan kembali ke halaman list
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/setup/user_default"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    name: "",
    username: "",
    password: "",
    tipe_user_id: "",
    m_kary_id: "",
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
  if (!values.username?.toString().trim()) {
    errors.username = "Username Wajib Di isi";
    invalid = true;
  }
  if (!values.password?.toString().trim()) {
    errors.password = "Password Wajib Di isi";
    invalid = true;
  }
  if (!values.tipe_user_id?.toString().trim()) {
    errors.tipe_user_id = "Tipe User Wajib Di isi";
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
    name: values.name?.toString().trim() || null,
    username: values.username?.toString().trim() || null,
    password: values.password?.toString().trim() || null,
    tipe_user_id: values.tipe_user_id?.toString().trim() || null,
    m_kary_id: values.m_kary_id?.toString().trim() || null,
    catatan: values.catatan?.toString().trim() || null,
    is_active: values.is_active,

      user_detail: detailArr.value.map((d) => ({
        user_default_id: d.user_default_id,
        is_primary: d.is_primary !== undefined ? d.is_primary : true,
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
    router.replace("/setup/user_default");
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
  router.push("/setup/user_default");
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
          <CardTitle>Informasi Master User Default</CardTitle>
          <CardDescription>
            Isi data master user default dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX
              id="name"
              label="Name"
              :value="values.name"
              :errorname="errors.name ? 'failed' : ''"
              @input="(v) => (values.name = v)"
              :hints="errors.name"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Name"
              class="w-full"
            />

            <FieldX
              id="username"
              label="Username"
              :value="values.username"
              :errorname="errors.username ? 'failed' : ''"
              @input="(v) => (values.username = v)"
              :hints="errors.username"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Username"
              class="w-full"
            />

            <FieldX
              id="password"
              label="Password"
              :value="values.password"
              :errorname="errors.password ? 'failed' : ''"
              @input="(v) => (values.password = v)"
              :hints="errors.password"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Password"
              class="w-full"
            />

            <FieldSelect
              id="tipe_user_id"
              label="Tipe User"
              :value="values.tipe_user_id"
              :errorname="errors.tipe_user_id ? 'failed' : ''"
              @input="(v) => (values.tipe_user_id = v)"
              :hints="errors.tipe_user_id"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_general?filter_column_group=TIPE USER&filter_column_is_active=true"
              displayField="value1"
              valueField="id"
              placeholder="Tipe User"
              :clearable="true"
              class="w-full"
            />

            <FieldPopUp
              id="m_kary_id"
              label="Karyawan"
              :value="values.m_kary_id"
              :errorname="errors.m_kary_id ? 'failed' : ''"
              @input="(v) => (values.m_kary_id = v)"
              :hints="errors.m_kary_id"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_kary?join=true"
              displayField="nama_kary"
              valueField="id"
              :columns="[{ field: 'm_unit_bisni.nama_comp', headerName: 'Company' }, { field: 'kode_kary', headerName: 'Kode' }, { field: 'nama_kary', headerName: 'Nama' }]"
              placeholder="Karyawan"
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
              placeholder="Catatan"
              class="w-full"
            />
            </div>

            <FieldStatus
              v-model="values.is_active"
              label="Is Active"
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
                  title="Pilih Respo"
                  :api="{ url: '/api/dynamic/m_respo' }"
                  :columns="[
                    { key: 'nama', label: 'Nama', sortable: true, width: '200px' }
                  ]"
                  searchKey="nama"
                  displayKey="nama"
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
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Nama</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 110px; min-width: 110px;">Primary</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm" style="width: 110px; min-width: 110px;">Active</th>
                      <th v-if="!isReadOnly" class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="detailArr.length === 0">
                      <td colspan="5" class="text-center py-8 text-muted-foreground text-xs sm:text-sm">
                        Belum ada item ditambahkan
                      </td>
                    </tr>
                    <tr v-for="(detail, index) in detailArr" :key="index" class="border-t hover:bg-muted/50">
                      <td class="px-3 py-2 text-xs sm:text-sm whitespace-nowrap">{{ index + 1 }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.user_default?.nama || '-' }}</td>
                      <td class="px-2 py-2 text-center" style="width: 110px; min-width: 110px;">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_primary"
                          @input="(v) => setPrimary(index, v)"
                          :readonly="false"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_primary ? 'Ya' : 'Tidak' }}</span>
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
