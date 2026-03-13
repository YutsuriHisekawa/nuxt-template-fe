<script setup>
import {
  Table2,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  RefreshCw,
  Database,
  Search,
  Loader2,
  Copy,
} from "lucide-vue-next";
import { AgGridVue } from "ag-grid-vue3";

const b = inject("builder");
</script>

<template>
  <TabsContent value="landing" class="space-y-6 mt-4">
    <Card v-if="b.landingConfig.value.length > 0">
      <CardHeader>
        <div class="flex items-center gap-3">
          <Table2 class="h-5 w-5 text-primary shrink-0" />
          <div>
            <CardTitle class="text-base">Konfigurasi Landing</CardTitle>
            <CardDescription>Atur kolom tabel & tampilan di halaman daftar</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Quick hint for Display Field -->
        <div class="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <BookOpen class="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>
            Untuk data nested/relasi, isi <strong>Display Field</strong> dengan dot-notation
            (misal: <code class="bg-muted px-1 py-0.5 rounded font-mono text-[11px]">unit_bisnis.nama_comp</code>).
            <button class="text-primary hover:underline font-medium" @click="b.docsOpen.value = true">
              Lihat dokumentasi lengkap &rarr;
            </button>
          </span>
        </div>

        <div class="border border-border rounded-lg overflow-hidden text-xs">
          <!-- Table Header -->
          <div class="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_52px_52px_28px] gap-1.5 px-2.5 py-2 bg-muted font-semibold text-muted-foreground items-center">
            <span class="text-center">#</span>
            <span>Field</span>
            <span>Label Kolom</span>
            <span title="Field yang ditampilkan (kosong = field asli, misal: unit_bisnis.nama_comp)">Display Field</span>
            <span class="text-center" title="Tampil di tabel desktop">Tampil</span>
            <span class="text-center" title="Min Width (px)">Width</span>
            <span></span>
          </div>
          <!-- Rows -->
          <div
            v-for="(col, i) in b.landingConfig.value"
            :key="col.field"
            class="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_52px_52px_28px] gap-1.5 px-2.5 py-1.5 border-t border-border items-center transition-opacity"
            :class="!col.visible ? 'opacity-40' : ''"
          >
            <span class="text-center text-muted-foreground">{{ i + 1 }}</span>
            <span class="font-mono text-[11px] truncate" :title="col.field">{{ col.field }}</span>
            <input
              type="text"
              :value="col.label"
              class="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-0.5 py-0.5 text-xs"
              @input="b.updateLandingCol(i, 'label', $event.target.value)"
            />
            <input
              type="text"
              :value="col.displayField"
              :placeholder="col.field"
              class="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-0.5 py-0.5 text-xs font-mono text-[11px]"
              @input="b.updateLandingCol(i, 'displayField', $event.target.value)"
            />
            <div class="flex justify-center">
              <input
                type="checkbox"
                :checked="col.visible"
                class="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                @change="b.updateLandingCol(i, 'visible', $event.target.checked)"
              />
            </div>
            <input
              type="number"
              :value="col.minWidth"
              min="50"
              max="500"
              class="w-full bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-center px-0 py-0.5 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              @input="b.updateLandingCol(i, 'minWidth', parseInt($event.target.value) || 140)"
            />
            <div class="flex flex-col items-center -space-y-1">
              <button
                v-if="i > 0"
                class="text-muted-foreground hover:text-foreground transition-colors p-0"
                @click="b.moveLandingCol(i, -1)"
              >
                <ChevronUp class="h-3.5 w-3.5" />
              </button>
              <button
                v-if="i < b.landingConfig.value.length - 1"
                class="text-muted-foreground hover:text-foreground transition-colors p-0"
                @click="b.moveLandingCol(i, 1)"
              >
                <ChevronDown class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Landing Preview (DataTable style) -->
        <div class="mt-5">
          <p class="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Preview Tabel Landing
          </p>

          <!-- Toolbar: Refresh + Try API -->
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <Button variant="outline" size="sm" @click="b.useRealApi.value = false; b.realApiRows.value = [];">
              <RefreshCw class="h-3.5 w-3.5 mr-1" /> Sample Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="b.useRealApi.value ? 'border-primary text-primary' : ''"
              @click="b.useRealApi.value = !b.useRealApi.value"
            >
              <Database class="h-3.5 w-3.5 mr-1" />
              {{ b.useRealApi.value ? 'Mode: Real API' : 'Coba dengan Real API' }}
            </Button>
            <span v-if="b.useRealApi.value && b.config.value" class="text-[10px] text-muted-foreground font-mono">
              /api/dynamic/{{ b.config.value.apiEndpoint }}
            </span>
          </div>

          <!-- API Params (shown when real API mode) -->
          <div v-if="b.useRealApi.value" class="rounded-lg border border-border bg-muted/50 p-3 mb-2 space-y-2">
            <p class="text-[11px] font-medium text-muted-foreground">Parameter API</p>
            <div v-for="(p, pi) in b.apiParams.value" :key="pi" class="flex items-center gap-2">
              <input
                v-model="p.key"
                placeholder="key (misal: filter_column_nama)"
                class="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                v-model="p.value"
                placeholder="value"
                class="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button class="text-muted-foreground hover:text-destructive p-0.5" @click="b.removeApiParam(pi)">
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm" class="h-7 text-xs" @click="b.addApiParam">
                <Plus class="h-3 w-3 mr-1" /> Tambah Param
              </Button>
              <Button size="sm" class="h-7 text-xs" :disabled="b.realApiLoading.value" @click="b.fetchRealApiData">
                <Loader2 v-if="b.realApiLoading.value" class="h-3 w-3 mr-1 animate-spin" />
                <Search v-else class="h-3 w-3 mr-1" />
                Fetch Data
              </Button>
              <span v-if="b.realApiRows.value.length" class="text-[10px] text-muted-foreground">
                {{ b.realApiRows.value.length }} baris
              </span>
            </div>
          </div>

          <!-- API Response Structure Viewer -->
          <div v-if="b.realApiRows.value.length" class="rounded-lg border border-border bg-muted/30 mb-2 overflow-hidden">
            <button
              class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              @click="b.showApiResponse.value = !b.showApiResponse.value"
            >
              <span class="flex items-center gap-1.5">
                <Database class="h-3.5 w-3.5 text-primary" />
                Struktur Respon API
                <span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">{{ b.apiResponsePaths.value.length }} fields</span>
              </span>
              <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="b.showApiResponse.value ? 'rotate-180' : ''" />
            </button>
            <div v-if="b.showApiResponse.value" class="border-t border-border">
              <!-- Field paths table -->
              <div class="max-h-[280px] overflow-y-auto">
                <table class="w-full text-xs">
                  <thead class="sticky top-0 bg-muted">
                    <tr class="text-muted-foreground">
                      <th class="text-left px-3 py-1.5 font-semibold">Path (klik untuk copy)</th>
                      <th class="text-left px-3 py-1.5 font-semibold w-[70px]">Type</th>
                      <th class="text-left px-3 py-1.5 font-semibold">Sample Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in b.apiResponsePaths.value"
                      :key="item.path"
                      class="border-t border-border/50 hover:bg-muted/50 cursor-pointer group"
                      @click="b.copyPath(item.path)"
                    >
                      <td class="px-3 py-1 font-mono text-[11px]">
                        <span
                          class="group-hover:text-primary transition-colors"
                          :class="item.type === 'object' ? 'text-muted-foreground/60 italic' : 'text-foreground'"
                        >
                          {{ item.path }}
                        </span>
                        <Copy class="h-3 w-3 inline ml-1 opacity-0 group-hover:opacity-60 text-primary transition-opacity" />
                      </td>
                      <td class="px-3 py-1">
                        <span
                          class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          :class="{
                            'bg-blue-500/10 text-blue-600': item.type === 'string',
                            'bg-green-500/10 text-green-600': item.type === 'number',
                            'bg-yellow-500/10 text-yellow-600': item.type === 'object',
                            'bg-purple-500/10 text-purple-600': item.type === 'array',
                            'bg-orange-500/10 text-orange-600': item.type === 'boolean',
                            'bg-red-500/10 text-red-500': item.type === 'null',
                            'bg-muted text-muted-foreground': !['string','number','object','array','boolean','null'].includes(item.type),
                          }"
                        >{{ item.type }}</span>
                      </td>
                      <td class="px-3 py-1 text-muted-foreground font-mono text-[10px] truncate max-w-[300px]">
                        <template v-if="item.type === 'object'">{ ... }</template>
                        <template v-else-if="item.type === 'array'">[{{ item.sample?.length || 0 }} items]</template>
                        <template v-else>{{ item.sample === null ? 'null' : String(item.sample).substring(0, 80) }}</template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- Raw JSON (first row) -->
              <details class="border-t border-border">
                <summary class="px-3 py-1.5 text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none">
                  Raw JSON (row pertama)
                </summary>
                <pre class="px-3 py-2 text-[10px] font-mono text-muted-foreground bg-muted/50 max-h-[200px] overflow-auto whitespace-pre-wrap break-all">{{ JSON.stringify(b.realApiRows.value[0], null, 2) }}</pre>
              </details>
            </div>
          </div>

          <!-- AG Grid preview -->
          <div class="rounded-lg border border-border bg-card overflow-hidden">
            <ClientOnly>
              <div
                :class="b.isDark.value ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'"
                class="w-full"
                style="height: 220px"
              >
                <AgGridVue
                  class="w-full h-full"
                  :columnDefs="b.landingPreviewCols.value"
                  :rowData="b.landingPreviewRows.value"
                  :defaultColDef="{ sortable: true, resizable: true, flex: 1 }"
                  :animateRows="true"
                  :overlayNoRowsTemplate="'<span class=&quot;text-muted-foreground text-sm&quot;>Belum ada kolom yang ditampilkan</span>'"
                />
              </div>
            </ClientOnly>
          </div>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</template>
