<script setup>
import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  X,
  AlertTriangle,
  Package,
  Loader2,
  Zap,
  ListChecks,
  Footprints,
} from "lucide-vue-next";
import { PRESET_TEMPLATES } from "../_presets";
import BuilderFieldCard from "./BuilderFieldCard.vue";
import BuilderDetailSection from "./BuilderDetailSection.vue";

const b = inject("builder");
</script>

<template>
  <TabsContent value="form" class="space-y-6 mt-4">
    <!-- Page header (preview) -->
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="b.goToDashboard()">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold text-foreground">
          Tambah {{ b.config.value?.readableName || "" }} Baru
        </h1>
        <p class="text-sm text-muted-foreground">
          Buat data {{ (b.config.value?.readableName || "").toLowerCase() }} baru
        </p>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <Button
          :variant="b.confirmResetForm.value ? 'destructive' : 'outline'"
          size="sm"
          class="h-7 text-xs gap-1.5"
          :title="b.confirmResetForm.value ? 'Klik sekali lagi untuk konfirmasi' : 'Reset semua field form (Undo tersedia)'"
          @click="b.resetFormBuilder"
        >
          <RefreshCw class="h-3.5 w-3.5" />
          {{ b.confirmResetForm.value ? 'Yakin Reset Form?' : 'Reset Form' }}
        </Button>
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span class="font-medium">Kolom:</span>
          <button
            v-for="n in [1, 2, 3]"
            :key="n"
            class="h-7 w-7 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors"
            :class="
              b.columnLayout.value === n
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:border-primary hover:text-primary'
            "
            @click="b.columnLayout.value = n"
          >
            {{ n }}
          </button>
        </div>
      </div>
    </div>

    <!-- Duplicate Warning Banner -->
    <div
      v-if="b.duplicateFieldNames.value.size"
      class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
    >
      <AlertTriangle class="h-4 w-4 shrink-0" />
      <span><strong>Field name duplikat:</strong> {{ [...b.duplicateFieldNames.value].join(", ") }} — perbaiki sebelum generate!</span>
    </div>

    <!-- Wizard Steps Editor -->
    <Card v-if="b.wizardSteps.value.length > 0 || true" class="border-dashed">
      <CardHeader class="py-3 px-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Footprints class="h-4 w-4 text-primary" />
            <span class="text-sm font-semibold">Form Wizard / Multi-Step</span>
            <span class="text-xs text-muted-foreground">({{ b.wizardSteps.value.length }} step)</span>
          </div>
          <Button variant="outline" size="sm" class="h-7 text-xs gap-1" @click="b.addWizardStep">
            <Plus class="h-3 w-3" /> Tambah Step
          </Button>
        </div>
      </CardHeader>
      <CardContent v-if="b.wizardSteps.value.length > 0" class="pt-0 pb-3 px-4">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(step, si) in b.wizardSteps.value"
            :key="si"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-muted text-sm"
          >
            <span class="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{{ si + 1 }}</span>
            <input
              type="text"
              :value="step.label"
              class="bg-transparent border-none outline-none text-xs w-24 focus:ring-0"
              @input="b.wizardSteps.value[si].label = $event.target.value"
            />
            <button class="text-muted-foreground hover:text-destructive" @click="b.removeWizardStep(si)">
              <X class="h-3 w-3" />
            </button>
          </div>
        </div>
        <p class="text-[10px] text-muted-foreground mt-2">
          Assign step ke tiap field via dropdown pada card field.
        </p>
      </CardContent>
    </Card>

    <!-- Form Card -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>Informasi {{ b.config.value?.readableName || "" }}</CardTitle>
            <CardDescription>
              Isi data {{ (b.config.value?.readableName || "").toLowerCase() }} dengan lengkap dan benar
            </CardDescription>
          </div>
        </div>
        <!-- Search + Preset + Bulk toolbar -->
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          <div class="relative flex-1 min-w-[200px] max-w-sm">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              v-model="b.searchQuery.value"
              placeholder="Cari field... (label, nama, tipe)"
              class="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              v-if="b.searchQuery.value"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              @click="b.searchQuery.value = ''"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
          <div class="relative">
            <Button variant="outline" size="sm" class="h-8 gap-1 text-xs" @click="b.showPresetMenu.value = !b.showPresetMenu.value">
              <Package class="h-3.5 w-3.5" /> Preset
            </Button>
            <div
              v-if="b.showPresetMenu.value"
              class="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-1 min-w-[260px] max-h-[420px] overflow-y-auto"
            >
              <div
                v-for="(group, gIdx) in [
                  { title: 'Data', items: PRESET_TEMPLATES.filter((p) => !p.desc) },
                  { title: 'Perhitungan', items: PRESET_TEMPLATES.filter((p) => p.desc) },
                ].filter((g) => g.items.length)"
                :key="gIdx"
              >
                <div
                  class="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                  :class="gIdx > 0 ? 'border-t border-border mt-1 pt-2' : ''"
                >
                  {{ group.title }}
                </div>
                <button
                  v-for="preset in group.items"
                  :key="preset.name"
                  class="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent flex items-center gap-2"
                  @click="b.addPreset(preset)"
                >
                  <span class="text-base">{{ preset.icon }}</span>
                  <div class="min-w-0">
                    <div class="font-medium text-xs">{{ preset.name }}</div>
                    <div class="text-[10px] text-muted-foreground truncate">
                      {{ preset.desc || preset.fields.length + " field" }}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1 text-xs"
            :disabled="b.autoDetecting.value"
            @click="b.autoDetectFields"
            title="Deteksi field otomatis dari response API"
          >
            <Loader2 v-if="b.autoDetecting.value" class="h-3.5 w-3.5 animate-spin" />
            <Zap v-else class="h-3.5 w-3.5" />
            Auto-Detect
          </Button>
          <Button
            :variant="b.bulkMode.value ? 'default' : 'outline'"
            size="sm"
            class="h-8 gap-1 text-xs"
            @click="b.toggleBulkMode"
          >
            <ListChecks class="h-3.5 w-3.5" /> Bulk
          </Button>
        </div>
        <!-- Bulk action bar -->
        <div
          v-if="b.bulkMode.value"
          class="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs"
        >
          <span class="text-muted-foreground font-medium">{{ b.selectedFields.value.size }} dipilih</span>
          <button class="text-primary hover:underline" @click="b.selectAllFields">Pilih Semua</button>
          <button class="text-primary hover:underline" @click="b.deselectAllFields">Batal Pilih</button>
          <div class="w-px h-4 bg-border" />
          <button class="text-destructive hover:underline" @click="b.bulkDelete" :disabled="!b.selectedFields.value.size">Hapus</button>
          <button class="hover:underline" @click="b.bulkSetReadonly(true)" :disabled="!b.selectedFields.value.size">Set Readonly</button>
          <button class="hover:underline" @click="b.bulkSetReadonly(false)" :disabled="!b.selectedFields.value.size">Set Editable</button>
          <button class="hover:underline" @click="b.bulkSetRequired(true)" :disabled="!b.selectedFields.value.size">Set Required</button>
          <button class="hover:underline" @click="b.bulkSetRequired(false)" :disabled="!b.selectedFields.value.size">Set Optional</button>
        </div>
      </CardHeader>
      <CardContent>
        <div :class="b.gridClass.value">
          <template v-for="idx in b.filteredFieldIndices.value" :key="idx">
            <BuilderFieldCard :idx="idx" />
          </template>

          <!-- Add field zone -->
          <div
            class="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center cursor-pointer text-muted-foreground hover:border-primary hover:text-primary hover:bg-accent/30 transition-all"
            :class="b.colSpanFull.value"
            @click="b.addField"
          >
            <Plus class="h-5 w-5 mr-2" />
            <span class="text-sm font-medium">Tambah Field</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Detail Section -->
    <BuilderDetailSection />
  </TabsContent>
</template>
