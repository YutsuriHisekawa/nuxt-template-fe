<script setup lang="js">
import { toast } from "vue-sonner";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";
import { Trash2 } from "lucide-vue-next";

// ============================================================================
// COMPOSABLES & ROUTE
// ============================================================================
const api = useApi();       // Helper untuk panggil API (GET, POST, PUT)
const router = useRouter();  // Untuk navigasi antar halaman
const route = useRoute();    // Untuk baca parameter URL (misalnya :id)

// ============================================================================
// STATE — variabel reaktif yang dipakai di form
// ============================================================================
const loading = ref(false);  // Menampilkan spinner saat sedang request

const recordId = computed(() => route.params.id);
const action = computed(() => route.query.action);

const isEditMode = computed(() => !!recordId.value && action.value === "Edit");
const isViewMode = computed(
  () => !!recordId.value && (!action.value || action.value === "View"),
);
const isCopyMode = computed(() => !!recordId.value && action.value === "Copy");
const isCreateMode = computed(() => !recordId.value);
const isReadOnly = computed(() => isViewMode.value);

const pageTitle = computed(() => {
  if (isViewMode.value) return "Detail Master Role";
  if (isCopyMode.value) return "Salin Master Role";
  if (isEditMode.value) return "Edit Master Role";
  return "Tambah Master Role Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master role";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master role";
  return "Buat data master role baru";
});

// Reactive form values with defaults
const values = reactive({
  kode_role: "",
  nama_role: "",
  catatan: "",
  is_active: true,
});

// Errors object (manual validation)
const errors = reactive({
  kode_role: "",
  nama_role: "",
  catatan: "",
});

// Detail arrays
const detailArr = ref([]);

const selectedDetailIds = computed(() => detailArr.value.map(d => d.m_menu_id));

const handleDetailAdd = (selectedItems) => {
  if (!selectedItems || selectedItems.length === 0) return;
  let addedCount = 0;
  let skippedCount = 0;
  selectedItems.forEach((item) => {
    const exists = detailArr.value.some((d) => d.m_menu_id === item.id);
    if (exists) { skippedCount++; return; }
    detailArr.value.push({
      m_menu_id: item.id,
      m_menu: item,
      is_read: true,
      is_create: true,
      is_update: true,
      is_print: true,
      is_copy: true,
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
const API_BASE = "/api/dynamic/m_role";
const API_SAVE = API_BASE + "/with-details";

// ============================================================================
// LOAD DATA — Dipanggil saat halaman pertama kali dibuka (onBeforeMount)
// ============================================================================
const isRead = !!recordId.value;

onBeforeMount(async () => {
  if (!isRead) return;

  loading.value = true;
  try {
    const res = await api.get(`${API_BASE}/${recordId.value}?join=true`);
    const data = res?.data ?? res;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Data tidak ditemukan");
    }

    // Konversi boolean untuk field switch
    for (const key of Object.keys(values)) {
      if (typeof values[key] === "boolean" && data[key] !== undefined) {
        data[key] = data[key] === true || data[key] === 1 || data[key] === "1";
      }
    }

    // Mode Copy: hapus id supaya tersimpan sebagai data baru
    if (isCopyMode.value) {
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;
    }

    // Masukkan data ke form
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = data[key] ?? "";
      }
    }

    // Load detail: m_role_ds
    if (data.m_role_ds) {
      detailArr.value = data.m_role_ds.map((detail) => ({
        m_menu_id: detail.m_menu_id,
        m_menu: detail.m_menu || null,
        is_read: detail.is_read !== undefined ? detail.is_read : true,
        is_create: detail.is_create !== undefined ? detail.is_create : true,
        is_update: detail.is_update !== undefined ? detail.is_update : true,
        is_print: detail.is_print !== undefined ? detail.is_print : true,
        is_copy: detail.is_copy !== undefined ? detail.is_copy : true,
      }));
    }
  } catch (err) {
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/setup/m_role"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    kode_role: "",
    nama_role: "",
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
  // 1. Bersihkan error sebelumnya
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

  // 2. Validasi field wajib
  let invalid = false;
  if (!values.nama_role?.toString().trim()) {
    errors.nama_role = "Nama Role wajib diisi";
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
    const payload = {
      kode_role: values.kode_role?.toString().trim() || null,
      nama_role: values.nama_role?.toString().trim() || null,
      catatan: values.catatan?.toString().trim() || null,
      is_active: values.is_active,

      m_role_d: detailArr.value.map((d) => ({
        m_menu_id: d.m_menu_id,
        is_read: d.is_read !== undefined ? d.is_read : true,
        is_create: d.is_create !== undefined ? d.is_create : true,
        is_update: d.is_update !== undefined ? d.is_update : true,
        is_print: d.is_print !== undefined ? d.is_print : true,
        is_copy: d.is_copy !== undefined ? d.is_copy : true,
      })),
    };

    if (isEditMode.value) {
      await api.put(`${API_SAVE}/${recordId.value}`, payload);
      toast.success("Data berhasil diperbarui");
    } else {
      await api.post(API_SAVE, payload);
      toast.success("Data berhasil dibuat");
    }

    router.replace("/setup/m_role");
  } catch (error) {
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
  router.push("/setup/m_role");
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
          <CardTitle>Informasi Master Role</CardTitle>
          <CardDescription>
            Isi data master role dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX
              id="kode_role"
              label="Kode Role"
              :value="values.kode_role"
              :errorname="errors.kode_role ? 'failed' : ''"
              @input="(v) => (values.kode_role = v)"
              :hints="errors.kode_role"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="!isReadOnly"
              placeholder="Auto Generated System"
              class="w-full"
            />

            <FieldX
              id="nama_role"
              label="Nama Role"
              :value="values.nama_role"
              :errorname="errors.nama_role ? 'failed' : ''"
              @input="(v) => (values.nama_role = v)"
              :hints="errors.nama_role"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Masukan Nama Role"
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
              placeholder="Masukan Catatan"
              class="w-full"
            />
            </div>

            <div class="flex items-center gap-3">
              <Switch
                id="is_active"
                v-model="values.is_active"
                :disabled="loading || isReadOnly"
              />
              <Label for="is_active" class="cursor-pointer">
                {{ values.is_active ? "Ya" : "Tidak" }}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- DETAIL TABS -->
      <Tabs default-value="detail-0" class="w-full">
        <TabsList class="w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="detail-0">Detail Role</TabsTrigger>
        </TabsList>

        <TabsContent value="detail-0" class="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle>Detail Role</CardTitle>
                  <CardDescription>Kelola data detail</CardDescription>
                </div>
                <ButtonMultiSelect
                  v-if="!isReadOnly"
                  title="Pilih Item"
                  :api="{ url: '/api/dynamic/m_menu' }"
                  :columns="[
                    { key: 'modul', label: 'Modul', sortable: true, width: '200px' },
                    { key: 'sub_modul', label: 'Sub Modul', sortable: true, width: '200px' },
                    { key: 'name', label: 'Nama Menu', sortable: true, width: '200px' },
                    { key: 'path', label: 'Path', sortable: true, width: '200px' }
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
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Nama</th>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Modul</th>
                      <th class="px-3 py-2 text-left font-medium text-xs sm:text-sm">Sub Modul</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Read</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Create</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Update</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Print</th>
                      <th class="px-2 py-2 text-center font-medium text-xs sm:text-sm">Copy</th>
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
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.m_menu?.name || '-' }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.m_menu?.modul || '-' }}</td>
                      <td class="px-3 py-2 text-xs sm:text-sm">{{ detail.m_menu?.sub_modul || '-' }}</td>
                      <td class="px-2 py-2 text-center">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_read"
                          @input="(v) => (detail.is_read = v)"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_read ? 'Ya' : 'Tidak' }}</span>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_create"
                          @input="(v) => (detail.is_create = v)"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_create ? 'Ya' : 'Tidak' }}</span>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_update"
                          @input="(v) => (detail.is_update = v)"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_update ? 'Ya' : 'Tidak' }}</span>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_print"
                          @input="(v) => (detail.is_print = v)"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_print ? 'Ya' : 'Tidak' }}</span>
                      </td>
                      <td class="px-2 py-2 text-center">
                        <FieldBox
                          v-if="!isReadOnly"
                          :value="detail.is_copy"
                          @input="(v) => (detail.is_copy = v)"
                          labelTrue="Ya"
                          labelFalse="Tidak"
                        />
                        <span v-else>{{ detail.is_copy ? 'Ya' : 'Tidak' }}</span>
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
