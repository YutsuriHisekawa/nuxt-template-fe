<script setup lang="js">
// @ts-nocheck — This is a generator template with placeholders, not runtime code
import { nextTick } from "vue";
import { toast } from "vue-sonner";
import { ArrowLeft, Loader2, Save } from "lucide-vue-next";


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
  if (isViewMode.value) return "Detail Master Supplier";
  if (isCopyMode.value) return "Salin Master Supplier";
  if (isEditMode.value) return "Edit Master Supplier";
  return "Tambah Master Supplier Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master supplier";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master supplier";
  return "Buat data master supplier baru";
});

// Reactive form values with defaults
const values = reactive({
  nama_supplier: "",
  nama_supp: "",
  is_active: true,
  tipe_supp_id: "lokal",
  alamat_supp: "",
});

// Errors object (manual validation)
const errors = reactive({
  nama_supplier: "",
  nama_supp: "",
  tipe_supp_id: "",
  alamat_supp: "",
});




// ============================================================================
// API CONFIG — sesuaikan param di sini jika ada perubahan
// ============================================================================
const API_BASE = "/api/dynamic/m_supplier";
const API_SAVE = API_BASE;

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
    nama_supplier: "",
    nama_supp: "",
    is_active: true,
    tipe_supp_id: "lokal",
    alamat_supp: "",
  });
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

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
    setTimeout(() => router.push("/purchasing/master/m_supplier"), 2000);
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
  if (!values.nama_supp?.toString().trim()) {
    errors.nama_supp = "Nama Vendor wajib diisi";
    invalid = true;
  }
  if (!values.tipe_supp_id?.toString().trim()) {
    errors.tipe_supp_id = "Tipe Vendor wajib diisi";
    invalid = true;
  }

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
    nama_supplier: values.nama_supplier?.toString().trim() || null,
    nama_supp: values.nama_supp?.toString().trim() || null,
    is_active: values.is_active,
    tipe_supp_id: values.tipe_supp_id?.toString().trim() || null,
    alamat_supp: values.alamat_supp?.toString().trim() || null,

    };

    if (isEditMode.value) {
      await updateData(recordId.value, payload);
      toast.success("Data berhasil diperbarui");
    } else {
      await createData(payload);
      toast.success("Data berhasil dibuat");
    }

    // Navigate back to list
    router.replace("/purchasing/master/m_supplier");
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
  router.push("/purchasing/master/m_supplier");
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
          <CardTitle>Informasi Master Supplier</CardTitle>
          <CardDescription>
            Isi data master supplier dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
            <FieldX
              id="nama_supplier"
              label="Kode Vendor"
              :value="values.nama_supplier"
              :errorname="errors.nama_supplier ? 'failed' : ''"
              @input="(v) => (values.nama_supplier = v)"
              :hints="errors.nama_supplier"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Auto Generate"
              class="w-full"
            />
            </div>

            <div class="md:col-span-2">
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
              placeholder="Input Nama Vendor"
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
                {{ values.is_active ? "Aktif" : "Tidak Aktif" }}
              </Label>
            </div>

            <FieldX
              id="tipe_supp_id"
              label="Tipe Vendor"
              :value="values.tipe_supp_id"
              :errorname="errors.tipe_supp_id ? 'failed' : ''"
              @input="(v) => (values.tipe_supp_id = v)"
              :hints="errors.tipe_supp_id"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="In"
              class="w-full"
            />

            <FieldX
              id="alamat_supp"
              label="Alamat Vendor"
              :value="values.alamat_supp"
              :errorname="errors.alamat_supp ? 'failed' : ''"
              @input="(v) => (values.alamat_supp = v)"
              :hints="errors.alamat_supp"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Alamat Vendor"
              class="w-full"
            />
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
