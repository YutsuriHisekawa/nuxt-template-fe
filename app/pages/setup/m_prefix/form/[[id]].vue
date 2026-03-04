<script setup lang="js">
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
  if (isViewMode.value) return "Detail Master Prefix";
  if (isCopyMode.value) return "Salin Master Prefix";
  if (isEditMode.value) return "Edit Master Prefix";
  return "Tambah Master Prefix Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master prefix";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master prefix";
  return "Buat data master prefix baru";
});

// Reactive form values with defaults
const values = reactive({
  m_unit_bisnis_id: "",
  nama_prefx: "",
  value: "",
  tipe_prefix: "",
  is_active: true,
});

// Errors object (manual validation)
const errors = reactive({
  m_unit_bisnis_id: "",
  nama_prefx: "",
  value: "",
  tipe_prefix: "",
});

// ============================================================================
// API FUNCTIONS
// ============================================================================
const getById = async (id) => {
  return await api.get(`/api/dynamic/m_prefix/${id}`);
};

const createData = async (payload) => {
  return await api.post("/api/dynamic/m_prefix", payload);
};

const updateData = async (id, payload) => {
  return await api.put(`/api/dynamic/m_prefix/${id}`, payload);
};

// ============================================================================
// RESET FORM HANDLER
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    m_unit_bisnis_id: "",
    nama_prefx: "",
    value: "",
    tipe_prefix: "",
    is_active: true,
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

  loading.value = true;
  try {
    const res = await getById(id);
    if (res.status !== "success") throw new Error("Gagal memuat data");

    const data = res.data;

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
    setTimeout(() => router.push("/setup/m_prefix"), 2000);
  } finally {
    loading.value = false;
  }
};

watch(
  () => route.params.id,
  (id) => {
    onReset();
    if (id) loadData(id);
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
  if (!values.m_unit_bisnis_id?.toString().trim()) {
    errors.m_unit_bisnis_id = "Unit Bisnis wajib diisi";
    invalid = true;
  }
  if (!values.nama_prefx?.toString().trim()) {
    errors.nama_prefx = "Nama Prefix wajib diisi";
    invalid = true;
  }
  if (!values.value?.toString().trim()) {
    errors.value = "Value wajib diisi";
    invalid = true;
  }
  if (!values.tipe_prefix?.toString().trim()) {
    errors.tipe_prefix = "Tipe Prefix wajib diisi";
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
    m_unit_bisnis_id: values.m_unit_bisnis_id?.toString().trim() || null,
    nama_prefx: values.nama_prefx?.toString().trim() || null,
    value: values.value?.toString().trim() || null,
    tipe_prefix: values.tipe_prefix?.toString().trim() || null,
    is_active: values.is_active,
    };

    if (isEditMode.value) {
      await updateData(recordId.value, payload);
      toast.success("Data berhasil diperbarui");
    } else {
      await createData(payload);
      toast.success("Data berhasil dibuat");
    }

    // Navigate back to list
    router.replace("/setup/m_prefix");
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
  router.push("/setup/m_prefix");
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
      <Card>
        <CardHeader>
          <CardTitle>Informasi Master Prefix</CardTitle>
          <CardDescription>
            Isi data master prefix dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldSelect
              id="m_unit_bisnis_id"
              label="Unit Bisnis"
              :value="values.m_unit_bisnis_id"
              :errorname="errors.m_unit_bisnis_id ? 'failed' : ''"
              @input="(v) => (values.m_unit_bisnis_id = v)"
              :hints="errors.m_unit_bisnis_id"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_unit_bisnis?where=is_active:true"
              displayField="nama_comp"
              valueField="id"
              placeholder="Pilih Unit Bisnis"
              :clearable="true"
              class="w-full"
            />

            <FieldX
              id="nama_prefx"
              label="Nama Prefix"
              :value="values.nama_prefx"
              :errorname="errors.nama_prefx ? 'failed' : ''"
              @input="(v) => (values.nama_prefx = v)"
              :hints="errors.nama_prefx"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Tulis Nama Prefix"
              class="w-full"
            />

            <FieldX
              id="value"
              label="Value"
              :value="values.value"
              :errorname="errors.value ? 'failed' : ''"
              @input="(v) => (values.value = v)"
              :hints="errors.value"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Prefix 1"
              class="w-full"
            />

            <FieldSelect
              id="tipe_prefix"
              label="Tipe Prefix"
              :value="values.tipe_prefix"
              :errorname="errors.tipe_prefix ? 'failed' : ''"
              @input="(v) => (values.tipe_prefix = v)"
              :hints="errors.tipe_prefix"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              :options="[{ value: 'TEXT', label: 'TEXT' }, { value: 'DAY', label: 'DAY' }, { value: 'MONTH', label: 'MONTH' }, { value: 'YEAR', label: 'YEAR' }, { value: 'SEQ(XXXX)', label: 'SEQ (XXXX)' }]"
              displayField="label"
              valueField="value"
              placeholder="Pilih Tipe Prefix"
              :clearable="true"
              class="w-full"
            />

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
