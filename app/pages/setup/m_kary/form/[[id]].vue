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
const authStore = useAuthStore();

// ============================================================================
// PERMISSIONS — Cek hak akses user berdasarkan menu
// ============================================================================
const currentMenu = computed(() => {
  return authStore.selectRespo?.menus?.find(m => m.path === '/setup/m_kary');
});
const perms = computed(() => {
  if (authStore.isSuperAdmin) return { is_read: true, is_create: true, is_update: true, is_delete: true, is_print: true };
  const menuId = currentMenu.value?.id;
  if (!menuId) return { is_read: true, is_create: true, is_update: true, is_delete: true, is_print: true };
  return authStore.selectRespo?.permissions?.[menuId] || {};
});

// ============================================================================
// AUTH — Cek tipe user (Super Admin atau bukan)
// ============================================================================
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

// Nama company untuk display di field readonly (non-super-admin)
const companyNameDisplay = computed(() => {
  const ud = authStore.userDefault;
  if (!ud) return '-';
  if (ud.karyawan?.m_unit_bisni?.nama_comp) return ud.karyawan.m_unit_bisni.nama_comp;
  const primary = ud.user_details?.find((d) => d.is_primary && d.is_active) || ud.user_details?.find((d) => d.is_active);
  return primary?.m_respo?.unit_bisnis?.nama_comp || '-';
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
  if (isViewMode.value) return "Detail Master Kary";
  if (isCopyMode.value) return "Salin Master Kary";
  if (isEditMode.value) return "Edit Master Kary";
  return "Tambah Master Kary Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master kary";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master kary";
  return "Buat data master kary baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  kode_kary: "",
  m_unit_bisnis_id: "",
  nama_kary: "",
  tgl_lhr: '',
  tempat_lhr: "",
  jenis_kelamin: "",
  status_kawin: "",
  no_ktp: "",
  no_tlp: "",
  email: "",
  jabatan_id: "",
  foto_ktp: "",
  catatan: "",
  is_sales: true,
  is_active: true,
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  kode_kary: "",
  m_unit_bisnis_id: "",
  nama_kary: "",
  tgl_lhr: "",
  tempat_lhr: "",
  jenis_kelamin: "",
  status_kawin: "",
  no_ktp: "",
  no_tlp: "",
  email: "",
  jabatan_id: "",
  foto_ktp: "",
  catatan: "",
});







// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_kary";
const API_SAVE = API_BASE;

// ============================================================================
// LOAD DATA — Dipanggil saat halaman pertama kali dibuka (onBeforeMount)
// Jika ada recordId (mode Edit/View/Copy), ambil data dari server
// ============================================================================
const isRead = !!recordId.value;  // true kalau mode Edit / View / Copy

onBeforeMount(async () => {
  // Auto-fill unit bisnis untuk non-super-admin
  if (!isSuperAdmin.value) {
    const ud = authStore.userDefault;
    if (ud) {
      const companyId = ud.karyawan?.m_unit_bisnis_id
        || ud.user_details?.find((d) => d.is_primary && d.is_active)?.m_respo?.m_unit_bisnis_id
        || ud.user_details?.find((d) => d.is_active)?.m_respo?.m_unit_bisnis_id;
      if (companyId) values.m_unit_bisnis_id = companyId;
    }
  }

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
    setTimeout(() => router.push("/setup/m_kary"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    kode_kary: "",
    m_unit_bisnis_id: "",
    nama_kary: "",
    tgl_lhr: '',
    tempat_lhr: "",
    jenis_kelamin: "",
    status_kawin: "",
    no_ktp: "",
    no_tlp: "",
    email: "",
    jabatan_id: "",
    foto_ktp: "",
    catatan: "",
    is_sales: true,
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
  // 1. Bersihkan semua pesan error sebelumnya
  Object.keys(errors).forEach((key) => {
    errors[key] = "";
  });

  // 2. Validasi: cek field yang wajib diisi
  let invalid = false;
  if (!values.nama_kary?.toString().trim()) {
    errors.nama_kary = "Nama Karyawan Wajib Di isi";
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
    kode_kary: values.kode_kary?.toString().trim() || null,
    m_unit_bisnis_id: values.m_unit_bisnis_id?.toString().trim() || null,
    nama_kary: values.nama_kary?.toString().trim() || null,
    tgl_lhr: values.tgl_lhr,
    tempat_lhr: values.tempat_lhr?.toString().trim() || null,
    jenis_kelamin: values.jenis_kelamin?.toString().trim() || null,
    status_kawin: values.status_kawin?.toString().trim() || null,
    no_ktp: values.no_ktp?.toString().trim() || null,
    no_tlp: values.no_tlp?.toString().trim() || null,
    email: values.email?.toString().trim() || null,
    jabatan_id: values.jabatan_id?.toString().trim() || null,
    foto_ktp: values.foto_ktp || null,
    catatan: values.catatan?.toString().trim() || null,
    is_sales: values.is_sales,
    is_active: values.is_active,

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
    router.replace("/setup/m_kary");
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
  router.push("/setup/m_kary");
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
          <CardTitle>Informasi Master Kary</CardTitle>
          <CardDescription>
            Isi data master kary dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX
              id="kode_kary"
              label="Kode Karyawan"
              :value="values.kode_kary"
              :errorname="errors.kode_kary ? 'failed' : ''"
              @input="(v) => (values.kode_kary = v)"
              :hints="errors.kode_kary"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="true"
              
              placeholder="Auto-generated"
              class="w-full"
            />

            <FieldPopUp
              v-if="isSuperAdmin"
              id="m_unit_bisnis_id"
              label="Unit Bisnis"
              :value="values.m_unit_bisnis_id"
              :errorname="errors.m_unit_bisnis_id ? 'failed' : ''"
              @input="(v) => (values.m_unit_bisnis_id = v)"
              :hints="errors.m_unit_bisnis_id"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_unit_bisnis?filter_column_is_active=true"
              displayField="nama_comp"
              valueField="id"
              :columns="[{ field: 'kode_unit_bisnis', headerName: 'Kode' }, { field: 'nama_comp', headerName: 'Nama Unit Bisnis' }, { field: 'pic', headerName: 'PIC' }, { field: 'kota', headerName: 'Kota' }]"
              placeholder="Pilih Unit Bisnis"
              :clearable="true"
              class="w-full"
            />

            <!-- Non-super-admin: readonly, otomatis dari unit bisnis user -->
            <FieldX
              v-else
              id="m_unit_bisnis_id_display"
              label="Unit Bisnis"
              :value="companyNameDisplay"
              :disabled="true"
              :readonly="true"
              hints="Unit bisnis dari akun Anda"
              class="w-full"
            />

            <FieldX
              id="nama_kary"
              label="Nama Karyawan"
              :value="values.nama_kary"
              :errorname="errors.nama_kary ? 'failed' : ''"
              @input="(v) => (values.nama_kary = v)"
              :hints="errors.nama_kary"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Nama Karyawan"
              class="w-full"
            />

            <FieldDate
              id="tgl_lhr"
              label="Tanggal Lahir"
              :value="values.tgl_lhr"
              :errorname="errors.tgl_lhr ? 'failed' : ''"
              @input="(v) => (values.tgl_lhr = v)"
              :hints="errors.tgl_lhr"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Pilih Tanggal Lahir"
              :clearable="true"
              class="w-full"
            />

            <FieldX
              id="tempat_lhr"
              label="Tempat Lahir"
              :value="values.tempat_lhr"
              :errorname="errors.tempat_lhr ? 'failed' : ''"
              @input="(v) => (values.tempat_lhr = v)"
              :hints="errors.tempat_lhr"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Contoh: Jakarta"
              class="w-full"
            />

            <FieldSelect
              id="jenis_kelamin"
              label="Jenis Kelamin"
              :value="values.jenis_kelamin"
              :errorname="errors.jenis_kelamin ? 'failed' : ''"
              @input="(v) => (values.jenis_kelamin = v)"
              :hints="errors.jenis_kelamin"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              :options="[{ value: 'LAKI LAKI', label: 'LAKI LAKI' }, { value: 'PEREMPUAN', label: 'PEREMPUAN' }]"
              displayField="label"
              valueField="value"
              placeholder="Pilih Jenis Kelamin"
              :clearable="true"
              class="w-full"
            />

            <FieldSelect
              id="status_kawin"
              label="Status Perkawinan"
              :value="values.status_kawin"
              :errorname="errors.status_kawin ? 'failed' : ''"
              @input="(v) => (values.status_kawin = v)"
              :hints="errors.status_kawin"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              :options="[{ value: 'BELUM KAWIN', label: 'BELUM KAWIN' }, { value: 'KAWIN', label: 'KAWIN' }, { value: 'DUDA', label: 'DUDA' }, { value: 'JANDA', label: 'JANDA' }]"
              displayField="label"
              valueField="value"
              placeholder="Pilih Status Perkawinan"
              :clearable="true"
              class="w-full"
            />

            <FieldX
              id="no_ktp"
              label="Nomor KTP"
              type="number"
              :value="values.no_ktp"
              :errorname="errors.no_ktp ? 'failed' : ''"
              @input="(v) => (values.no_ktp = v)"
              :hints="errors.no_ktp"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="16 Digit Nomor KTP"
              class="w-full"
            />

            <FieldX
              id="no_tlp"
              label="Nomor Telepon"
              type="tel"
              :value="values.no_tlp"
              :errorname="errors.no_tlp ? 'failed' : ''"
              @input="(v) => (values.no_tlp = v)"
              :hints="errors.no_tlp"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Contoh: +62 838-6226-8459"
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
              
              placeholder="email@example.com"
              class="w-full"
            />

            <FieldSelect
              id="jabatan_id"
              label="Jabatan"
              :value="values.jabatan_id"
              :errorname="errors.jabatan_id ? 'failed' : ''"
              @input="(v) => (values.jabatan_id = v)"
              :hints="errors.jabatan_id"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_general?filter_column_group=JABATAN&filter_column_is_active=true"
              displayField="value1"
              valueField="id"
              placeholder="Jabatan"
              :clearable="true"
              class="w-full"
            />

            <FieldUpload
              id="foto_ktp"
              label="Foto KTP"
              :value="values.foto_ktp"
              @input="(v) => (values.foto_ktp = v)"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              accept="image/png,image/jpeg,image/webp"
              :maxSizeMB="5"
              hints="Upload file (max 5MB)"
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
              placeholder="Catatan"
              class="w-full"
            />
            </div>

            <FieldStatus
              v-model="values.is_sales"
              label="Karyawan Sales"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              active-text="Ya"
              inactive-text="Tidak"
            />

            <div></div>

            <FieldStatus
              v-model="values.is_active"
              label="Status Aktif"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              active-text="Aktif"
              inactive-text="Tidak Aktif"
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
