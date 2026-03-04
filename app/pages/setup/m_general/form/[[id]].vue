<script setup lang="js">
import { toast } from "vue-sonner";

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
// API FUNCTIONS
// ============================================================================
const getById = async (id) => {
  return await api.get(`/api/dynamic/m_general/${id}`);
};

const createData = async (payload) => {
  return await api.post("/api/dynamic/m_general", payload);
};

const updateData = async (id, payload) => {
  return await api.put(`/api/dynamic/m_general/${id}`, payload);
};

// ============================================================================
// RESET FORM HANDLER
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
// LIFECYCLE HOOKS - LOAD DATA BEFORE MOUNT
// ============================================================================
onBeforeMount(async () => {
  onReset();

  if (isCreateMode.value) return;

  const sourceId = recordId.value;
  if (!sourceId) return;

  loading.value = true;
  try {
    const res = await getById(sourceId);
    if (res.status !== "success") throw new Error("Gagal memuat data");

    const data = res.data;

    // Ensure boolean
    if (data.is_active !== undefined) {
      const v = data.is_active;
      data.is_active = v === true || v === 1 || v === "1";
    } else {
      data.is_active = true;
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
    setTimeout(() => router.push("/setup/m_general"), 2000);
  } finally {
    loading.value = false;
  }
});

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

  loading.value = true;
  try {
    // Clean payload: convert empty strings to null
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
      await updateData(recordId.value, payload);
      toast.success("Data berhasil diperbarui", {
        description: `General "${values.group} - ${values.key1}" telah diperbarui`,
      });
    } else {
      await createData(payload);
      toast.success("Data berhasil dibuat", {
        description: `General "${values.group} - ${values.key1}" telah ditambahkan`,
      });
    }

    // Navigate back to list
    router.replace("/setup/m_general");
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
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
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
              :disabled="loading || isReadOnly"
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
              :disabled="loading || isReadOnly"
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
              :disabled="loading || isReadOnly"
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
              :disabled="loading || isReadOnly"
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
              :disabled="loading || isReadOnly"
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
              :disabled="loading || isReadOnly"
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
              :disabled="loading || isReadOnly"
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
              :disabled="loading || isReadOnly"
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
          <Icon
            v-if="loading"
            name="lucide:loader-2"
            class="h-4 w-4 animate-spin"
          />
          <Icon v-else name="lucide:save" class="h-4 w-4" />
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
