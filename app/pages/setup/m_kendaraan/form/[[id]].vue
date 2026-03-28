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
  return authStore.selectRespo?.menus?.find(m => m.path === '/setup/m_kendaraan');
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
  if (isViewMode.value) return "Detail Master Kendaraan";
  if (isCopyMode.value) return "Salin Master Kendaraan";
  if (isEditMode.value) return "Edit Master Kendaraan";
  return "Tambah Master Kendaraan Baru";
});

const pageDescription = computed(() => {
  if (isViewMode.value) return "Lihat detail data master kendaraan";
  if (isCopyMode.value) return "Buat data baru dari data yang disalin";
  if (isEditMode.value) return "Perbarui data master kendaraan";
  return "Buat data master kendaraan baru";
});

// Nilai-nilai form — setiap field punya default kosong
const values = reactive({
  kode_kendaraan: "",
  m_unit_bisnis_id: '',
  jenis_kendaraan_id: "",
  nama_kendaraan: "",
  no_polisi: "",
  no_stnk: "",
  no_mesin: "",
  no_kir: "",
  tgl_exp_stnk: '',
  tgl_exp_kir: '',
  catatan: "",
  is_active: true,
});

// Error validasi per field (string pesan error, kosong = tidak ada error)
const errors = reactive({
  kode_kendaraan: "",
  m_unit_bisnis_id: "",
  jenis_kendaraan_id: "",
  nama_kendaraan: "",
  no_polisi: "",
  no_stnk: "",
  no_mesin: "",
  no_kir: "",
  tgl_exp_stnk: "",
  tgl_exp_kir: "",
  catatan: "",
});


const normalizeDate = (val) => {
  if(!val) return '';

  // kalau format sudah YYYY-MM-DD
  if(typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)){
    return val;
  }

  // kalau format datetime, ambil tanggal
  if(typeof val === 'string'){
    return val.slice(0, 10);
  }

  return '';
}




// ============================================================================
// API ENDPOINT — sesuaikan jika endpoint berubah
// ============================================================================
const API_BASE = "/api/dynamic/m_kendaraan";
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
    // for (const key in data) {
    //   if (Object.prototype.hasOwnProperty.call(values, key)) {
    //     values[key] = data[key] ?? "";
    //   }
    // }

    for(const key in data){
      if(Object.prototype.hasOwnProperty.call(values, key)){
        if(['tgl_exp_stnk', 'tgl_exp_kir'].includes(key)){
          values[key] = normalizeDate(data[key]);
        }else{
          values[key] = data[key] ?? "";
        }
      }
    }

  } catch (err) {
    // Kalau gagal load data, tampilkan error dan kembali ke halaman list
    toast.error("Gagal memuat data", {
      description: err?.message || "Terjadi kesalahan",
    });
    setTimeout(() => router.push("/setup/m_kendaraan"), 2000);
  }
  loading.value = false;
});

// ============================================================================
// RESET FORM — Kembalikan semua field ke nilai default
// ============================================================================
const onReset = () => {
  Object.assign(values, {
    kode_kendaraan: "",
    m_unit_bisnis_id: '',
    jenis_kendaraan_id: "",
    nama_kendaraan: "",
    no_polisi: "",
    no_stnk: "",
    no_mesin: "",
    no_kir: "",
    tgl_exp_stnk: '',
    tgl_exp_kir: '',
    catatan: "",
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
  if (!values.jenis_kendaraan_id?.toString().trim()) {
    errors.jenis_kendaraan_id = "Jenis Kendaraan Wajib Di isi";
    invalid = true;
  }
  if (!values.nama_kendaraan?.toString().trim()) {
    errors.nama_kendaraan = "Nama Kendaraan Wajib Di isi";
    invalid = true;
  }
  if (!values.no_polisi?.toString().trim()) {
    errors.no_polisi = "No Polisi Wajib Di isi";
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
    kode_kendaraan: values.kode_kendaraan?.toString().trim() || null,
    m_unit_bisnis_id: values.m_unit_bisnis_id || null,
    jenis_kendaraan_id: values.jenis_kendaraan_id?.toString().trim() || null,
    nama_kendaraan: values.nama_kendaraan?.toString().trim() || null,
    no_polisi: values.no_polisi?.toString().trim() || null,
    no_stnk: values.no_stnk?.toString().trim() || null,
    no_mesin: values.no_mesin?.toString().trim() || null,
    no_kir: values.no_kir?.toString().trim() || null,
    tgl_exp_stnk: values.tgl_exp_stnk?.trim() || null,
    tgl_exp_kir: values.tgl_exp_kir?.trim() || null,
    catatan: values.catatan?.toString().trim() || null,
    is_active: values.is_active,
    // Audit trail
    ...(!isEditMode.value ? { created_by: authStore.user?.id || null } : {}),
    updated_by: authStore.user?.id || null,

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
    router.replace("/setup/m_kendaraan");
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
  router.push("/setup/m_kendaraan");
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
          <CardTitle>Informasi Master Kendaraan</CardTitle>
          <CardDescription>
            Isi data master kendaraan dengan lengkap dan benar
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldX
              id="kode_kendaraan"
              label="Kode Kendaraan"
              :value="values.kode_kendaraan"
              :errorname="errors.kode_kendaraan ? 'failed' : ''"
              @input="(v) => (values.kode_kendaraan = v)"
              :hints="errors.kode_kendaraan"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="true"
              
              placeholder="Auto-generated"
              class="w-full"
            />

            <FieldPopUp
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
              :columns="[{ field: 'kode_unit_bisnis', headerName: 'Kode' }, { field: 'nama_comp', headerName: 'Nama Company' }, { field: 'pic', headerName: 'PIC' }, { field: 'kota', headerName: 'Kota' }]"
              placeholder="Pilih unit bisnis"
              :clearable="true"
              class="w-full"
            />

            <FieldSelect
              id="jenis_kendaraan_id"
              label="Jenis Kendaraan"
              :value="values.jenis_kendaraan_id"
              :errorname="errors.jenis_kendaraan_id ? 'failed' : ''"
              @input="(v) => (values.jenis_kendaraan_id = v)"
              :hints="errors.jenis_kendaraan_id"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              apiUrl="/api/dynamic/m_general?filter_column_is_active=true&filter_column_group=JENIS KENDARAAN"
              displayField="value1"
              valueField="id"
              placeholder="Pilih jenis kendaraan"
              :clearable="true"
              class="w-full"
            />

            <FieldX
              id="nama_kendaraan"
              label="Nama Kendaraan"
              :value="values.nama_kendaraan"
              :errorname="errors.nama_kendaraan ? 'failed' : ''"
              @input="(v) => (values.nama_kendaraan = v)"
              :hints="errors.nama_kendaraan"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Contoh: Toyota Avanza Hitam"
              class="w-full"
            />

            <FieldX
              id="no_polisi"
              label="No Polisi"
              :value="values.no_polisi"
              :errorname="errors.no_polisi ? 'failed' : ''"
              @input="(v) => (values.no_polisi = v)"
              :hints="errors.no_polisi"
              :required="!isReadOnly"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Contoh: B 1234 XYZ"
              class="w-full"
            />

            <FieldX
              id="no_stnk"
              label="No STNK (Opsional)"
              :value="values.no_stnk"
              :errorname="errors.no_stnk ? 'failed' : ''"
              @input="(v) => (values.no_stnk = v)"
              :hints="errors.no_stnk"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Nomor STNK"
              class="w-full"
            />

            <FieldX
              id="no_mesin"
              label="No Mesin (Opsional)"
              :value="values.no_mesin"
              :errorname="errors.no_mesin ? 'failed' : ''"
              @input="(v) => (values.no_mesin = v)"
              :hints="errors.no_mesin"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Nomor Mesin Kendaraan"
              class="w-full"
            />

            <FieldX
              id="no_kir"
              label="No KIR (Opsional)"
              :value="values.no_kir"
              :errorname="errors.no_kir ? 'failed' : ''"
              @input="(v) => (values.no_kir = v)"
              :hints="errors.no_kir"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              
              placeholder="Nomor KIR"
              class="w-full"
            />

            <FieldDate
              id="tgl_exp_stnk"
              label="Tgl Exp STNK (Opsional)"
              :value="values.tgl_exp_stnk"
              :errorname="errors.tgl_exp_stnk ? 'failed' : ''"
              @input="(v) => (values.tgl_exp_stnk = v)"
              :hints="errors.tgl_exp_stnk"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Pilih Tanggal"
              :clearable="true"
              class="w-full"
            />

            <FieldDate
              id="tgl_exp_kir"
              label="Tgl Exp KIR (Opsional)"
              :value="values.tgl_exp_kir"
              :errorname="errors.tgl_exp_kir ? 'failed' : ''"
              @input="(v) => (values.tgl_exp_kir = v)"
              :hints="errors.tgl_exp_kir"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Pilih Tanggal"
              :clearable="true"
              class="w-full"
            />

            <div class="md:col-span-2">
            <FieldTextarea
              id="catatan"
              label="Catatan (Opsional)"
              :value="values.catatan"
              :errorname="errors.catatan ? 'failed' : ''"
              @input="(v) => (values.catatan = v)"
              :hints="errors.catatan"
              :required="false"
              :disabled="loading || isReadOnly"
              :readonly="isReadOnly"
              placeholder="Tulis catatan disini..."
              class="w-full"
            />
            </div>

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
