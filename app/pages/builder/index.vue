<script setup>
import {
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  Clock,
  Folder,
  RefreshCw,
  Hammer,
  X,
} from "lucide-vue-next";
import { toast } from "vue-sonner";

definePageMeta({ layout: false });

const drafts = ref([]);
const loading = ref(true);
const creating = ref(false);
const notActive = ref(false);
const navigatingLabel = ref("");

// New draft form
const newModulePath = ref("");
const newApiEndpoint = ref("");
const showNewForm = ref(false);

async function loadDrafts() {
  loading.value = true;
  notActive.value = false;
  try {
    const res = await $fetch("/api/builder/drafts");
    drafts.value = res.drafts || [];
    if (res.expiredCount > 0) {
      toast.info(`${res.expiredCount} draft expired telah dihapus otomatis`);
    }
  } catch (e) {
    if (e?.status === 403 || e?.statusCode === 403) {
      notActive.value = true;
    } else {
      toast.error("Gagal memuat drafts: " + (e?.data?.statusMessage || e?.message || "Error"));
    }
  } finally {
    loading.value = false;
  }
}

async function createDraft() {
  const path = newModulePath.value.trim();
  if (!path) {
    toast.error("Module path wajib diisi");
    return;
  }
  creating.value = true;
  try {
    const res = await $fetch("/api/builder/drafts", {
      method: "POST",
      body: {
        modulePath: path,
        apiEndpoint: newApiEndpoint.value.trim() || undefined,
      },
    });
    if (res.success) {
      newModulePath.value = "";
      newApiEndpoint.value = "";
      showNewForm.value = false;
      navigatingLabel.value = res.config.readableName;
      await navigateTo(`/builder_file/${res.token}`);
    }
  } catch (e) {
    toast.error(e?.data?.statusMessage || e?.message || "Gagal membuat draft");
    creating.value = false;
    navigatingLabel.value = "";
  }
}

async function deleteDraft(token) {
  try {
    await $fetch("/api/builder/cancel", {
      method: "POST",
      body: { token },
    });
    drafts.value = drafts.value.filter((d) => d.token !== token);
    toast.success("Draft dihapus");
  } catch {
    toast.error("Gagal menghapus draft");
  }
}

async function closeBuilder() {
  try {
    await $fetch("/api/builder/deactivate", { method: "POST" });
  } catch {}
  toast.info("Builder ditutup");
  await navigateTo("/", { replace: true });
}

function formatAge(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function daysRemaining(ms) {
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const remaining = maxAge - ms;
  if (remaining <= 0) return "Expired";
  const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  return `${days} hari lagi`;
}

onMounted(loadDrafts);
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- NOT ACTIVE: Builder gate not activated -->
    <div
      v-if="notActive"
      class="min-h-screen flex items-center justify-center p-6"
    >
      <Card class="max-w-md w-full">
        <CardHeader>
          <CardTitle class="text-destructive">Builder Tidak Aktif</CardTitle>
          <CardDescription>
            Builder hanya bisa diakses setelah menjalankan script aktivasi dari terminal.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <pre class="text-sm bg-muted p-3 rounded-md overflow-x-auto">node add_route.cjs</pre>
          <p class="text-xs text-muted-foreground">
            Jalankan perintah di atas di terminal VS Code, lalu dashboard akan terbuka otomatis.
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- MAIN DASHBOARD -->
    <template v-else>
      <!-- Header -->
      <div
        class="border-b border-border bg-card sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <Hammer class="h-5 w-5 text-primary" />
          <h1 class="text-lg font-bold">Builder Dashboard</h1>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" @click="loadDrafts" :disabled="loading">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </Button>
          <ThemeToggle />
          <Button variant="destructive" size="sm" @click="closeBuilder" class="gap-1.5 ml-2">
            <X class="h-4 w-4" />
            Tutup Builder
          </Button>
        </div>
      </div>

    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <!-- New Build Card -->
      <Card>
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-base">Mulai Build Baru</CardTitle>
            <Button
              v-if="!showNewForm"
              size="sm"
              @click="showNewForm = true"
              class="gap-1.5"
            >
              <Plus class="h-4 w-4" /> New Build
            </Button>
          </div>
        </CardHeader>
        <CardContent v-if="showNewForm">
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-medium">Module Path <span class="text-destructive">*</span></label>
                <input
                  v-model="newModulePath"
                  type="text"
                  placeholder="setup/m_supplier"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  @keydown.enter="createDraft"
                />
                <p class="text-xs text-muted-foreground">
                  Contoh: setup/m_supplier, purchasing/t_purchase_order
                </p>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-medium">API Endpoint <span class="text-muted-foreground">(opsional)</span></label>
                <input
                  v-model="newApiEndpoint"
                  type="text"
                  placeholder="Otomatis dari module name"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  @keydown.enter="createDraft"
                />
                <p class="text-xs text-muted-foreground">
                  Default: nama modul terakhir (misal m_supplier)
                </p>
              </div>
            </div>
            <div class="flex gap-2 justify-end">
              <Button variant="outline" size="sm" @click="showNewForm = false">
                Batal
              </Button>
              <Button size="sm" @click="createDraft" :disabled="creating" class="gap-1.5">
                <Loader2 v-if="creating" class="h-4 w-4 animate-spin" />
                <Plus v-else class="h-4 w-4" />
                Buat & Mulai
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Drafts List -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Draft Aktif
          </h2>
          <span class="text-xs text-muted-foreground">
            {{ drafts.length }} draft · auto-cleanup 7 hari
          </span>
        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="flex items-center justify-center py-12 text-muted-foreground"
        >
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>

        <!-- Empty -->
        <Card
          v-else-if="!drafts.length"
          class="border-dashed"
        >
          <CardContent class="py-12 text-center">
            <Folder class="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p class="text-sm text-muted-foreground">
              Belum ada draft. Klik <strong>New Build</strong> untuk mulai.
            </p>
          </CardContent>
        </Card>

        <!-- Draft Cards -->
        <Card
          v-for="draft in drafts"
          :key="draft.token"
          class="group hover:border-primary/30 transition-colors"
        >
          <CardContent class="py-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-semibold text-sm truncate">
                    {{ draft.readableName }}
                  </h3>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span class="font-mono bg-muted px-1.5 py-0.5 rounded">
                    {{ draft.modulePath }}
                  </span>
                  <span>
                    API: <strong>{{ draft.apiEndpoint }}</strong>
                  </span>
                  <span class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {{ formatAge(draft.ageMs) }}
                  </span>
                  <span class="text-orange-500">
                    Expires: {{ daysRemaining(draft.ageMs) }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  class="gap-1.5 h-8"
                  @click="navigatingLabel = draft.readableName; navigateTo(`/builder_file/${draft.token}`)"
                >
                  <Loader2 v-if="navigatingLabel === draft.readableName" class="h-3.5 w-3.5 animate-spin" />
                  <ExternalLink v-else class="h-3.5 w-3.5" />
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  @click="deleteDraft(draft.token)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </template>

    <!-- Full-screen loading overlay during navigation -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="creating || (navigatingLabel && !creating)"
        class="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
      >
        <Loader2 class="h-10 w-10 animate-spin text-primary" />
        <div class="text-center">
          <p class="text-sm font-semibold">
            {{ creating ? 'Membuat draft...' : 'Membuka builder...' }}
          </p>
          <p v-if="navigatingLabel" class="text-xs text-muted-foreground mt-1">{{ navigatingLabel }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>
