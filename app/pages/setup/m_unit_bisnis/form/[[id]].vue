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
  if (isViewMode.value) return "Detail Master Unit Bisnis";
  if (isCopyMode.value) return "Salin Master Unit Bisnis";
  if (isEditMode.value) return "Edit Master Unit Bisnis";
  return "Tambah Master Unit Bisnis Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master unit bisnis";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master unit bisnis";
  return "Buat data master unit bisnis baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  kode_unit_bisnis: "",
  nama_comp: "",
  provinsi: "",
  kota: "",
  kecamatan: "",
  kodepos: "",
  email: "",
  pic: "",
  no_telp_pic: "",
  catatan: "",
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  kode_unit_bisnis: "",
  nama_comp: "",
  provinsi: "",
  kota: "",
  kecamatan: "",
  kodepos: "",
  email: "",
  pic: "",
  no_telp_pic: "",
  catatan: "",
});




// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_unit_bisnis";
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
    setTimeout(() => router.push("/setup/m_unit_bisnis"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    kode_unit_bisnis: "",
    nama_comp: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    kodepos: "",
    email: "",
    pic: "",
    no_telp_pic: "",
    catatan: "",
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
  if (!values.provinsi?.toString().trim()) {
    errors.provinsi = "Provinsi Wajib Dipilih";
    invalid = true;
  }
  if (!values.kota?.toString().trim()) {
    errors.kota = "Kota wajib dipilih";
    invalid = true;
  }
  if (!values.kecamatan?.toString().trim()) {
    errors.kecamatan = "Kecamatan Wajib Di Isi";
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
    kode_unit_bisnis: values.kode_unit_bisnis?.toString().trim() || null,
    nama_comp: values.nama_comp?.toString().trim() || null,
    provinsi: values.provinsi?.toString().trim() || null,
    kota: values.kota?.toString().trim() || null,
    kecamatan: values.kecamatan?.toString().trim() || null,
    kodepos: values.kodepos?.toString().trim() || null,
    email: values.email?.toString().trim() || null,
    pic: values.pic?.toString().trim() || null,
    no_telp_pic: values.no_telp_pic?.toString().trim() || null,
    catatan: values.catatan?.toString().trim() || null,

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
    router.replace("/setup/m_unit_bisnis");
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
  router.push("/setup/m_unit_bisnis");
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
          <CardTitle>Informasi Master Unit Bisnis</CardTitle>
          <CardDescription>
            Isi data master unit bisnis dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX
              id="kode_unit_bisnis"
              label="Kode Unit Bisnis"
              :value="values.kode_unit_bisnis"
              :errorname="errors.kode_unit_bisnis ? 'failed' : ''"
              @input="(v) => (values.kode_unit_bisnis = v)"
              :hints="errors.kode_unit_bisnis"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Kode Unit Bisnis"
              class="w-full"
            />

            <FieldX
              id="nama_comp"
              label="Nama Unit Bisnis"
              :value="values.nama_comp"
              :errorname="errors.nama_comp ? 'failed' : ''"
              @input="(v) => (values.nama_comp = v)"
              :hints="errors.nama_comp"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Isi Nama Unit Bisnis"
              class="w-full"
            />

            <FieldSelect
              id="provinsi"
              label="Provinsi"
              :value="values.provinsi"
              :errorname="errors.provinsi ? 'failed' : ''"
              @input="(v) => { values.provinsi = v; values.kota = ''; values.kecamatan = '' }"
              :hints="errors.provinsi"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="https://backend.qqltech.com/kodepos/region/provinsi"
              displayField="name"
              valueField="name"
              placeholder="Pilih Provinsi"
              :clearable="true"
              class="w-full"
            />

            <FieldSelect
              id="kota"
              label="Kota"
              :value="values.kota"
              :errorname="errors.kota ? 'failed' : ''"
              @input="(v) => { values.kota = v; values.kecamatan = '' }"
              :hints="errors.kota"
              :required="!isReadOnly"
              :disabled="!values.provinsi || loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="https://backend.qqltech.com/kodepos/region/kabupaten-kota"
              :apiParams="{ provinsi: values.provinsi }"
              displayField="name"
              valueField="name"
              placeholder="Pilih Kota"
              :clearable="true"
              class="w-full"
            />

            <FieldSelect
              id="kecamatan"
              label="Kecamatan"
              :value="values.kecamatan"
              :errorname="errors.kecamatan ? 'failed' : ''"
              @input="(v) => (values.kecamatan = v)"
              :hints="errors.kecamatan"
              :required="!isReadOnly"
              :disabled="!values.kota || loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="https://backend.qqltech.com/kodepos/region/kecamatan"
              :apiParams="{ kota: values.kota }"
              displayField="name"
              valueField="name"
              placeholder="Pilih Kecamatan"
              :clearable="true"
              class="w-full"
            />

            <FieldX
              id="kodepos"
              label="Kode-Pos"
              :value="values.kodepos"
              :errorname="errors.kodepos ? 'failed' : ''"
              @input="(v) => (values.kodepos = v)"
              :hints="errors.kodepos"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Isi Kode Pos"
              class="w-full"
            />

            <FieldX
              id="email"
              label="Email"
              type="email"
              :value="values.email"
              :errorname="errors.email ? 'failed' : ''"
              @input="(v) => (values.email = v)"
              :hints="errors.email"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Email"
              class="w-full"
            />

            <FieldX
              id="pic"
              label="PIC"
              :value="values.pic"
              :errorname="errors.pic ? 'failed' : ''"
              @input="(v) => (values.pic = v)"
              :hints="errors.pic"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="PIC"
              class="w-full"
            />

            <FieldX
              id="no_telp_pic"
              label="No.PIC"
              type="tel"
              :value="values.no_telp_pic"
              :errorname="errors.no_telp_pic ? 'failed' : ''"
              @input="(v) => (values.no_telp_pic = v)"
              :hints="errors.no_telp_pic"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="08123456789"
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
              placeholder="Masukan Catatan"
              class="w-full"
            />
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
