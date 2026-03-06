<script setup lang="js">
// @ts-nocheck — Template builder, bukan runtime code
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

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  kode_supplier: "",
  nama_supp: "",
  alamat_supp: "",
  negara_supp: "",
  kota_supp: "",
  data_tampung: "",
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  kode_supplier: "",
  nama_supp: "",
  alamat_supp: "",
  negara_supp: "",
  kota_supp: "",
  data_tampung: "",
});
const wizardStep = ref(0);





// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_supplier";
const API_SAVE = API_BASE;

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

  } catch (err) {
    // Kalau gagal load data, tampilkan error dan kembali ke halaman list
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/purchasing/master/m_supplier"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    kode_supplier: "",
    nama_supp: "",
    alamat_supp: "",
    negara_supp: "",
    kota_supp: "",
    data_tampung: "",
  });
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

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
  if (!values.kode_supplier?.toString().trim()) {
    errors.kode_supplier = "Harus diisi!!";
    invalid = true;
  }
  if (!values.nama_supp?.toString().trim()) {
    errors.nama_supp = "Wajib diisi!!!";
    invalid = true;
  }
  if (!values.alamat_supp?.toString().trim()) {
    errors.alamat_supp = "Alamat Vendor Wajib Di isi";
    invalid = true;
  }
  if (!values.negara_supp?.toString().trim()) {
    errors.negara_supp = "Harus dipilih!!!";
    invalid = true;
  }
  if (!values.kota_supp?.toString().trim()) {
    errors.kota_supp = "Harus diisi!!";
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
    kode_supplier: values.kode_supplier?.toString().trim() || null,
    nama_supp: values.nama_supp?.toString().trim() || null,
    alamat_supp: values.alamat_supp?.toString().trim() || null,
    negara_supp: values.negara_supp?.toString().trim() || null,
    kota_supp: values.kota_supp?.toString().trim() || null,
    data_tampung: values.data_tampung?.toString().trim() || null,

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
    router.replace("/purchasing/master/m_supplier");
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
          <!-- Wizard Steps -->
          <div class="flex gap-2 mb-6 flex-wrap">
              <button
                @click="wizardStep = 0"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="wizardStep === 0 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'"
              >
                <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="wizardStep === 0 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'">1</span>
                Steady
              </button>
              <button
                @click="wizardStep = 1"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="wizardStep === 1 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'"
              >
                <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="wizardStep === 1 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'">2</span>
                Ready
              </button>
              <button
                @click="wizardStep = 2"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="wizardStep === 2 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:text-foreground'"
              >
                <span class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="wizardStep === 2 ? 'bg-primary-foreground text-primary' : 'bg-muted-foreground/20'">3</span>
                Go
              </button>
          </div>

          <div v-show="wizardStep === 0" class="grid grid-cols-1 gap-6">
            <FieldX
              id="kode_supplier"
              label="Kode Vendor"
              :value="values.kode_supplier"
              :errorname="errors.kode_supplier ? 'failed' : ''"
              @input="(v) => (values.kode_supplier = v)"
              :hints="errors.kode_supplier"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Isi kode untuk vendor"
              class="w-full"
            />

            <div class="md:col-span-2">
            <div class="col-span-full border-b border-border pb-2 pt-4">
              <h3 class="text-base font-semibold text-foreground">Section Title</h3>
            </div>
            </div>

            <div></div>

            <div class="md:col-span-2 rounded-lg border border-border bg-card/50 p-5 space-y-1">
              <h3 class="text-sm font-semibold text-foreground mb-3">Wilayah Vendor</h3>
              <div class="grid grid-cols-1 gap-6">

              </div>
            </div>
          </div>

          <div v-show="wizardStep === 1" class="grid grid-cols-1 gap-6">
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
              placeholder="Isi nama untuk vendor"
              class="w-full"
            />

            <FieldX
              id="alamat_supp"
              label="Alamat Vendor"
              :value="values.alamat_supp"
              :errorname="errors.alamat_supp ? 'failed' : ''"
              @input="(v) => (values.alamat_supp = v)"
              :hints="errors.alamat_supp"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Isi alamat untuk vendor"
              class="w-full"
            />

            <div class="md:col-span-2">
            <div class="col-span-full border-b border-border pb-2 pt-4">
              <h3 class="text-base font-semibold text-foreground">Section Title</h3>
            </div>
            </div>
          </div>

          <div v-show="wizardStep === 2" class="grid grid-cols-1 gap-6">
            <FieldSelect
              id="negara_supp"
              label="Negara Vendor"
              :value="values.negara_supp"
              :errorname="errors.negara_supp ? 'failed' : ''"
              @input="(v) => { values.negara_supp = v; values.kota_supp = '' }"
              :hints="errors.negara_supp"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_negoro"
              displayField="nama_negoro"
              valueField="id"
              placeholder="Negara Vendor"
              :clearable="true"
              class="w-full"
            />

            <FieldSelect
              id="kota_supp"
              label="Kota Vendor"
              :value="values.kota_supp"
              :errorname="errors.kota_supp ? 'failed' : ''"
              @input="(v) => (values.kota_supp = v)"
              :hints="errors.kota_supp"
              :required="!isReadOnly"
              :disabled="!values.negara_supp || loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_kuto?join=true"
              :apiParams="{ 'filter_column_m_negoro.id': values.negara_supp }"
              displayField="nama_kuto"
              valueField="id"
              placeholder="Kota Vendor"
              :clearable="true"
              class="w-full"
            />

            <FieldX
              id="data_tampung"
              label="Data Tampungan"
              :value="values.data_tampung"
              :errorname="errors.data_tampung ? 'failed' : ''"
              @input="(v) => (values.data_tampung = v)"
              :hints="errors.data_tampung"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Data Tampungan"
              class="w-full"
            />
          </div>

          <div class="flex justify-between mt-4">
            <Button variant="outline" v-if="wizardStep > 0" @click="wizardStep--">Sebelumnya</Button>
            <div v-else />
            <Button v-if="wizardStep < 2" @click="wizardStep++">Selanjutnya</Button>
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
