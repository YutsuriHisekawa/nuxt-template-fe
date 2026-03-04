<script setup lang="js">
// @ts-nocheck — This is a generator template with placeholders, not runtime code
import { nextTick } from "vue";
import { toast } from "vue-sonner";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";
__DETAIL_IMPORTS__

// ============================================================================
// COMPOSABLES & STORES
// ============================================================================
const api = useApi();
const router = useRouter();
const route = useRoute();

// ============================================================================
// STATE
// ============================================================================
const loading = ref(false);
const lastLoadRequestId = ref(0);

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
  if (isViewMode.value) return "Detail __READABLE_NAME__";
  if (isCopyMode.value) return "Salin __READABLE_NAME__";
  if (isEditMode.value) return "Edit __READABLE_NAME__";
  return "Tambah __READABLE_NAME__ Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data __READABLE_NAME_LOWER__";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data __READABLE_NAME_LOWER__";
  return "Buat data __READABLE_NAME_LOWER__ baru";
});

// Reactive form values with defaults
const values = reactive({
__VALUES_DEFAULTS__
});

// Errors object (manual validation)
const errors = reactive({
__ERRORS_DEFAULTS__
});
__DETAIL_STATE__
__DETAIL_SELECTED_IDS__
__DETAIL_METHODS__

// ============================================================================
// API CONFIG — sesuaikan param di sini jika ada perubahan
// ============================================================================
const API_BASE = "/api/dynamic/__API_ENDPOINT__";
__API_DETAIL_ENDPOINT__

const getByIdParams = {
  join: true,
};

// ============================================================================
// API FUNCTIONS
// ============================================================================
const getById = async (id) => {
  const qs = new URLSearchParams(getByIdParams).toString();
  return await api.get(`${API_BASE}/${id}${qs ? `?${qs}` : ''}`);
};

const createData = async (payload) => {
  return await api.post(API_SAVE, payload);
};

const updateData = async (id, payload) => {
  return await api.put(`${API_SAVE}/${id}`, payload);
};

// ============================================================================
// RESET FORM HANDLER
// ============================================================================
const onReset = () => {
  Object.assign(values, {
__RESET_VALUES__
  });
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });
__DETAIL_RESET__
};

// ============================================================================
// LOAD DATA (watch route param — works on both navigation & refresh)
// ============================================================================
const loadData = async (id) => {
  if (!id) return;

  const requestId = ++lastLoadRequestId.value;

  loading.value = true;
  try {
    const res = await getById(id);

    const normalizedStatus =
      res?.status === "success" ? res.status : res?.data?.status;
    if (normalizedStatus && normalizedStatus !== "success") {
      throw new Error("Gagal memuat data");
    }

    const sourceData =
      res?.status === "success"
        ? res?.data
        : (res?.data?.data ?? res?.data ?? null);

    if (!sourceData || typeof sourceData !== "object" || Array.isArray(sourceData)) {
      throw new Error("Format data tidak valid");
    }

    if (requestId !== lastLoadRequestId.value) {
      return;
    }

    const data = { ...sourceData };

    // Ensure boolean for switch fields
    for (const key of Object.keys(values)) {
      if (typeof values[key] === "boolean" && data[key] !== undefined) {
        const v = data[key];
        data[key] = v === true || v === 1 || v === "1";
      }
    }

    // Mode copy: hapus id agar jadi create baru
    if (isCopyMode.value) {
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;
    }

    // Assign hanya key yang sudah ada di state reactive values
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = data[key] ?? "";
      }
    }
__DETAIL_LOAD_DATA__

    // Force Vue to flush DOM updates
    await nextTick();

    if (isCopyMode.value) {
      toast.success("Data berhasil disalin", {
        description: "Silakan edit dan simpan sebagai data baru",
      });
    } else {
      toast.success("Data berhasil dimuat");
    }
  } catch (error) {
    console.error("Error loading data:", error);
    toast.error("Gagal memuat data", {
      description: error?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("__ROUTE_PATH__"), 2000);
  } finally {
    loading.value = false;
  }
};

watch(
  () => route.params.id,
  (id) => {
    const normalizedId = Array.isArray(id) ? id[0] : id;

    if (!normalizedId) {
      onReset();
      return;
    }

    onReset();
    loadData(normalizedId);
  },
  { immediate: true },
);

// ============================================================================
// SAVE HANDLER
// ============================================================================
const onSave = async () => {
  // Clear errors
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

  // Validasi required
  let invalid = false;
__VALIDATION__

  if (invalid) {
    toast.error("Validasi gagal", {
      description: "Mohon lengkapi semua field yang wajib diisi",
    });
    return;
  }

  loading.value = true;
  try {
    // Clean payload
    const payload = {
__PAYLOAD__
__DETAIL_PAYLOAD__
    };

    if (isEditMode.value) {
      await updateData(recordId.value, payload);
      toast.success("Data berhasil diperbarui");
    } else {
      await createData(payload);
      toast.success("Data berhasil dibuat");
    }

    // Navigate back to list
    router.replace("__ROUTE_PATH__");
  } catch (error) {
    toast.error(
      isEditMode.value ? "Gagal memperbarui data" : "Gagal membuat data",
      {
        description: error?.message || "Terjadi kesalahan",
      },
    );
  } finally {
    loading.value = false;
  }
};

// ============================================================================
// CANCEL HANDLER
// ============================================================================
const handleCancel = () => {
  router.push("__ROUTE_PATH__");
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
          <CardTitle>Informasi __READABLE_NAME__</CardTitle>
          <CardDescription>
            Isi data __READABLE_NAME_LOWER__ dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
__FORM_FIELDS__
          </div>
        </CardContent>
      </Card>
__DETAIL_TEMPLATE__

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
