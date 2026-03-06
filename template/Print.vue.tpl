<script setup lang="js">
// @ts-nocheck — Template builder, bukan runtime code
import { Printer, ArrowLeft, Loader2 } from "lucide-vue-next";

definePageMeta({ layout: false });

const api = useApi();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const record = ref(null);
const errorMessage = ref("");

const recordId = computed(() => route.params.id);

const API_BASE = "/api/dynamic/__API_ENDPOINT__";

onMounted(async () => {
  if (!recordId.value) {
    errorMessage.value = "ID tidak ditemukan";
    loading.value = false;
    return;
  }
  try {
    const params = new URLSearchParams({ join: "true" });
    const res = await api.get(`${API_BASE}/${recordId.value}?${params}`);
    const data = res?.data ?? res;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Data tidak ditemukan");
    }
    record.value = data;
  } catch (err) {
    errorMessage.value = err?.message || "Gagal memuat data";
  }
  loading.value = false;
});

const handlePrint = () => {
  window.print();
};

const handleBack = () => {
  router.back();
};
</script>

<template>
  <div class="print-page min-h-screen bg-white text-black">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <Loader2 class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="flex items-center justify-center min-h-screen">
      <div class="text-center text-red-500">
        <p class="text-lg font-semibold">Gagal</p>
        <p class="text-sm">{{ errorMessage }}</p>
      </div>
    </div>

    <!-- Print Content -->
    <div v-else-if="record" class="max-w-[210mm] mx-auto p-8">
      <!-- Print toolbar (hidden during print) -->
      <div class="print:hidden flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          @click="handleBack"
        >
          <ArrowLeft class="h-4 w-4" />
          Kembali
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          @click="handlePrint"
        >
          <Printer class="h-4 w-4" />
          Cetak
        </button>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- DOCUMENT HEADER -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="text-center mb-8">
        <h1 class="text-xl font-bold uppercase tracking-wide">__READABLE_NAME__</h1>
        <div class="mt-1 text-sm text-gray-500">
          Dicetak pada: {{ new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) }}
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- FORM DATA TABLE -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <table class="w-full text-sm border-collapse mb-8">
        <tbody>
__PRINT_FIELDS__
        </tbody>
      </table>
__PRINT_DETAIL_TABLES__

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SIGNATURE SECTION -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="mt-16 grid grid-cols-3 gap-8 text-center text-sm">
        <div>
          <p class="font-semibold mb-16">Dibuat Oleh</p>
          <div class="border-t border-black pt-1 mx-4">
            <p class="text-gray-500">Nama / Tanggal</p>
          </div>
        </div>
        <div>
          <p class="font-semibold mb-16">Diperiksa Oleh</p>
          <div class="border-t border-black pt-1 mx-4">
            <p class="text-gray-500">Nama / Tanggal</p>
          </div>
        </div>
        <div>
          <p class="font-semibold mb-16">Disetujui Oleh</p>
          <div class="border-t border-black pt-1 mx-4">
            <p class="text-gray-500">Nama / Tanggal</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .print-page {
    margin: 0;
    padding: 0;
  }
  @page {
    size: A4;
    margin: 15mm;
  }
}
</style>
