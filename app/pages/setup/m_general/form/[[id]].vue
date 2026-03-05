<script setup lang="js">
import { toast } from "vue-sonner";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";

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
  if (isViewMode.value) return "Detail General";
  if (isCopyMode.value) return "Salin General";
  if (isEditMode.value) return "Edit General";
  return "Tambah General Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data general";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data general";
  return "Buat data general baru";
});

// Reactive form values with defaults
const values = reactive({
  group: "",
  key1: "",
  code: "",
  value1: "",
  value2: "",
  value3: "",
  value4: "",
  value5: "",
  is_active: true,
});

// Errors object (manual validation)
const errors = reactive({
  group: "",
  key1: "",
  code: "",
  value1: "",
  value2: "",
  value3: "",
  value4: "",
  value5: "",
});

// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_general";
const API_SAVE = API_BASE;

// ============================================================================
// LOAD DATA — Dipanggil saat halaman pertama kali dibuka (onBeforeMount)
// ============================================================================
const isRead = !!recordId.value;

onBeforeMount(async () => {
  if (!isRead) return;

  loading.value = true;
  try {
    const res = await api.get(`${API_BASE}/${recordId.value}`);
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
  } catch (err) {
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/setup/m_general"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    group: "",
    key1: "",
    code: "",
    value1: "",
    value2: "",
    value3: "",
    value4: "",
    value5: "",
    is_active: true,
  });
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });
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
  if (!values.group?.trim()) {
    errors.group = "Group wajib diisi";
    invalid = true;
  }
  if (!values.key1?.trim()) {
    errors.key1 = "Key wajib diisi";
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
      group: values.group?.trim() || null,
      key1: values.key1?.trim() || null,
      code: values.code?.trim() || null,
      value1: values.value1?.trim() || null,
      value2: values.value2?.trim() || null,
      value3: values.value3?.trim() || null,
      value4: values.value4?.trim() || null,
      value5: values.value5?.trim() || null,
      is_active: values.is_active,
    };

    if (isEditMode.value) {
      await api.put(`${API_SAVE}/${recordId.value}`, payload);
      toast.success("Data berhasil diperbarui");
    } else {
      await api.post(API_SAVE, payload);
      toast.success("Data berhasil dibuat");
    }

    router.replace("/setup/m_general");
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
  router.push("/setup/m_general");
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
          <CardTitle>Informasi General</CardTitle>
          <CardDescription>
            Isi data general dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Row 1: Group, Key, Code -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX
              id="group"
              label="Group"
              :value="values.group"
              :errorname="errors.group ? 'failed' : ''"
              @input="(v) => (values.group = v)"
              :hints="errors.group"
              :required="!isReadOnly"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Contoh: SYSTEM"
              class="w-full"
            />

            <FieldX
              id="key1"
              label="Key"
              :value="values.key1"
              :errorname="errors.key1 ? 'failed' : ''"
              @input="(v) => (values.key1 = v)"
              :hints="errors.key1"
              :required="!isReadOnly"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Contoh: APP_NAME"
              class="w-full"
            />

            <FieldX
              id="code"
              label="Code"
              :value="values.code"
              :errorname="errors.code ? 'failed' : ''"
              @input="(v) => (values.code = v)"
              :hints="errors.code"
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Kode (opsional)"
              class="w-full"
            />


          <!-- Row 2: Value 1 - 3 -->
          
            <FieldX
              id="value1"
              label="Value 1"
              :value="values.value1"
              :errorname="errors.value1 ? 'failed' : ''"
              @input="(v) => (values.value1 = v)"
              :hints="errors.value1"
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Value 1"
              class="w-full"
            />

            <FieldX
              id="value2"
              label="Value 2"
              :value="values.value2"
              :errorname="errors.value2 ? 'failed' : ''"
              @input="(v) => (values.value2 = v)"
              :hints="errors.value2"
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Value 2"
              class="w-full"
            />

            <FieldX
              id="value3"
              label="Value 3"
              :value="values.value3"
              :errorname="errors.value3 ? 'failed' : ''"
              @input="(v) => (values.value3 = v)"
              :hints="errors.value3"
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Value 3"
              class="w-full"
            />


          <!-- Row 3: Value 4 - 5 -->

            <FieldX
              id="value4"
              label="Value 4"
              :value="values.value4"
              :errorname="errors.value4 ? 'failed' : ''"
              @input="(v) => (values.value4 = v)"
              :hints="errors.value4"
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Value 4"
              class="w-full"
            />

            <FieldX
              id="value5"
              label="Value 5"
              :value="values.value5"
              :errorname="errors.value5 ? 'failed' : ''"
              @input="(v) => (values.value5 = v)"
              :hints="errors.value5"
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Value 5"
              class="w-full"
            />

            <div></div>


          <!-- Status -->
          <div class="flex items-center gap-3">
            <Switch
              id="is_active"
              v-model="values.is_active"
              :disabled="loading || isReadOnly"
            />
            <Label for="is_active" class="cursor-pointer">
              {{ values.is_active ? "Aktif" : "Tidak Aktif" }}
            </Label>
          </div>
          </div>
        </CardContent>
      </Card>

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
