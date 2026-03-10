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

const recordId = computed(() => {
  const id = route.params.id;
  return Array.isArray(id) ? id[0] : id;
});
const action = computed(() => route.query.action);

const isEditMode = computed(() => !!recordId.value && action.value === "Edit");
const isViewMode = computed(
  () => !!recordId.value && (!action.value || action.value === "View"),
);
const isCopyMode = computed(() => !!recordId.value && action.value === "Copy");
const isCreateMode = computed(() => !recordId.value);
const isReadOnly = computed(() => isViewMode.value);

const pageTitle = computed(() => {
  if (isViewMode.value) return "Detail Menu";
  if (isCopyMode.value) return "Salin Menu";
  if (isEditMode.value) return "Edit Menu";
  return "Tambah Menu Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data menu";
  if (isCopyMode.value) return "Buat menu baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data menu";
  return "Buat menu aplikasi baru";
});

// Reactive form values with defaults
const values = reactive({
  name: "",
  modul: "",
  sub_modul: "",
  path: "",
  desc: "",
  icon: "",
  seq: "",
  is_active: true,
});

// Errors object (manual validation)
const errors = reactive({
  name: "",
  modul: "",
  sub_modul: "",
  path: "",
  desc: "",
  icon: "",
  seq: "",
});

// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_menu";
const API_SAVE = API_BASE;

// ============================================================================
// LOAD DATA — Dipanggil saat halaman pertama kali dibuka (onBeforeMount)
// ============================================================================
onBeforeMount(async () => {
  if (!recordId.value) return;

  const params = { join: true };
  const fixedParams = new URLSearchParams(params);

  loading.value = true;
  try {
    const res = await api.get(`${API_BASE}/${recordId.value}?` + fixedParams);
    const data = res?.data ?? res;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Data tidak ditemukan");
    }

    // Normalize seq to string
    if (data.seq !== undefined && data.seq !== null) {
      data.seq = String(data.seq);
    } else {
      data.seq = "";
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
    setTimeout(() => router.push("/setup/menu"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    name: "",
    modul: "",
    sub_modul: "",
    path: "",
    desc: "",
    icon: "",
    seq: "",
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
  if (!values.name?.trim()) {
    errors.name = "Nama menu wajib diisi";
    invalid = true;
  }
  if (!values.modul?.trim()) {
    errors.modul = "Modul wajib diisi";
    invalid = true;
  }
  if (!values.path?.trim()) {
    errors.path = "Path wajib diisi";
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
      name: values.name?.trim() || null,
      modul: values.modul?.trim() || null,
      sub_modul: values.sub_modul?.trim() || null,
      path: values.path?.trim() || null,
      icon: values.icon?.trim() || null,
      seq: values.seq?.trim() || null,
      desc: values.desc?.trim() || null,
      is_active: values.is_active,
    };

    if (isEditMode.value) {
      await api.put(`${API_SAVE}/${recordId.value}`, payload);
      toast.success("Data berhasil diperbarui");
    } else {
      await api.post(API_SAVE, payload);
      toast.success("Data berhasil dibuat");
    }

    if (import.meta.client) {
      window.dispatchEvent(new CustomEvent("menuUpdated"));
    }

    router.replace("/setup/menu");
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
  router.push("/setup/menu");
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
    <!-- SEQ INFORMATION CARD -->
    <!-- ================================================================ -->
    <Card
      class="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
    >
      <CardHeader>
        <CardTitle class="text-lg text-blue-900 dark:text-blue-100">
          📋 Panduan Kode Urutan Menu (Sequence)
        </CardTitle>
        <CardDescription class="text-blue-700 dark:text-blue-300">
          Ikuti aturan penomoran berikut untuk mengorganisir menu berdasarkan
          departemen/modul
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              class="flex gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50 border border-blue-100 dark:border-blue-900"
            >
              <div
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 font-bold text-blue-700 dark:text-blue-300"
              >
                1.x
              </div>
              <div>
                <p class="font-semibold text-foreground text-sm">
                  Setup & Konfigurasi
                </p>
                <p class="text-xs text-muted-foreground">
                  Gunakan 1, 1.1, 1.2, 1.3, dst
                </p>
              </div>
            </div>

            <div
              class="flex gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50 border border-green-100 dark:border-green-900"
            >
              <div
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 font-bold text-green-700 dark:text-green-300"
              >
                2.x
              </div>
              <div>
                <p class="font-semibold text-foreground text-sm">
                  Pembelian (Purchasing)
                </p>
                <p class="text-xs text-muted-foreground">
                  Gunakan 2, 2.1, 2.2, 2.3, dst
                </p>
              </div>
            </div>

            <div
              class="flex gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50 border border-purple-100 dark:border-purple-900"
            >
              <div
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 font-bold text-purple-700 dark:text-purple-300"
              >
                3.x
              </div>
              <div>
                <p class="font-semibold text-foreground text-sm">
                  Pemasaran (Marketing)
                </p>
                <p class="text-xs text-muted-foreground">
                  Gunakan 3, 3.1, 3.2, 3.3, dst
                </p>
              </div>
            </div>

            <div
              class="flex gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50 border border-orange-100 dark:border-orange-900"
            >
              <div
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 font-bold text-orange-700 dark:text-orange-300"
              >
                4.x
              </div>
              <div>
                <p class="font-semibold text-foreground text-sm">
                  Produksi (Production)
                </p>
                <p class="text-xs text-muted-foreground">
                  Gunakan 4, 4.1, 4.2, 4.3, dst
                </p>
              </div>
            </div>

            <div
              class="flex gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50 border border-amber-100 dark:border-amber-900"
            >
              <div
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 font-bold text-amber-700 dark:text-amber-300"
              >
                5.x
              </div>
              <div>
                <p class="font-semibold text-foreground text-sm">
                  Inventaris (Inventory)
                </p>
                <p class="text-xs text-muted-foreground">
                  Gunakan 5, 5.1, 5.2, 5.3, dst
                </p>
              </div>
            </div>

            <div
              class="flex gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50 border border-red-100 dark:border-red-900"
            >
              <div
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 font-bold text-red-700 dark:text-red-300"
              >
                6.x
              </div>
              <div>
                <p class="font-semibold text-foreground text-sm">
                  Akuntansi (Accounting)
                </p>
                <p class="text-xs text-muted-foreground">
                  Gunakan 6, 6.1, 6.2, 6.3, dst
                </p>
              </div>
            </div>

            <div
              class="flex gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 md:col-span-2"
            >
              <div
                class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300"
              >
                99
              </div>
              <div>
                <p class="font-semibold text-foreground text-sm">
                  Developer & Testing
                </p>
                <p class="text-xs text-muted-foreground">
                  Gunakan 99 untuk menu pengembang, testing, dan utility
                </p>
              </div>
            </div>
          </div>

          <div
            class="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <p class="text-xs text-muted-foreground">
              <span class="font-semibold">💡 Catatan:</span> Gunakan format
              desimal (contoh: 1.1, 2.3) untuk submenu atau menu anak di bawah
              kategori utama. Sequence membantu mengatur urutan tampilan menu di
              sidebar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ================================================================ -->
    <!-- FORM SECTION -->
    <!-- ================================================================ -->
    <form class="space-y-6" @submit.prevent>
      <Card :key="recordId || 'new'">
          <CardDescription>
            Isi data menu dengan lengkap dan benar
          </CardDescription>

        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Name Field -->
            <FieldX
              id="name"
              label="Nama Menu"
              :value="values.name"
              :errorname="errors.name ? 'failed' : ''"
              @input="(v) => (values.name = v)"
              :hints="errors.name"
              :required="!isReadOnly"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Contoh: Dashboard"
              class="w-full"
            />

            <!-- Modul Field -->
            <FieldX
              id="modul"
              label="Modul"
              :value="values.modul"
              :errorname="errors.modul ? 'failed' : ''"
              @input="(v) => (values.modul = v)"
              :hints="errors.modul"
              :required="!isReadOnly"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Contoh: Main"
              class="w-full"
            />

            <!-- Sub Modul Field -->
            <FieldX
              id="sub_modul"
              label="Sub Modul (Opsional)"
              :value="values.sub_modul"
              :errorname="errors.sub_modul ? 'failed' : ''"
              @input="(v) => (values.sub_modul = v)"
              :hints="errors.sub_modul || 'Boleh dikosongkan'"
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Contoh: Overview"
              class="w-full"
            />

            <!-- Path Field -->
            <FieldX
              id="path"
              label="Path"
              :value="values.path"
              :errorname="errors.path ? 'failed' : ''"
              @input="(v) => (values.path = v)"
              :hints="errors.path"
              :required="!isReadOnly"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Contoh: /dashboard"
              class="w-full"
            />

            <!-- Icon Field -->

              <FieldSelectIcon
                id="icon"
                label="Icon"
                v-model="values.icon"
                :errorname="errors.icon ? 'failed' : ''"
                :hints="errors.icon || 'Pilih icon lucide (opsional)'"
                :required="false"
                :disabled="loading"
                :readonly="isReadOnly"
                placeholder="Cari icon..."
                class="w-full"
              />


            <!-- Sequence Field -->
            <FieldNumber
              id="seq"
              label="Urutan (Sequence)"
              :value="values.seq"
              :errorname="errors.seq ? 'failed' : ''"
              @input="(v) => (values.seq = v)"
              :hints="
                errors.seq ||
                'Urutan tampilan menu (opsional, contoh: 1.1, 2.3)'
              "
              :required="false"
              :disabled="loading"
              :readonly="isReadOnly"
              placeholder="Contoh: 1.1"
              :min="0"
              type="decimal"
              class="w-full"
            />

            <!-- Description Field Full Width -->
            <div class="md:col-span-2">
              <FieldX
                id="desc"
                type="textarea"
                label="Deskripsi"
                :value="values.desc"
                @input="(v) => (values.desc = v)"
                :hints="errors.desc || 'Penjelasan singkat tentang menu ini'"
                :required="false"
                :disabled="loading"
                :readonly="isReadOnly"
                placeholder="Deskripsi menu (opsional)"
                :rows="3"
              />
            </div>
          </div>

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
