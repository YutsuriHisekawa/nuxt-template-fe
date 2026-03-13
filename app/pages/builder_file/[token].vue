<script setup lang="js">
import { useBuilder } from "./_useBuilder";
import {
  Settings2,
  Table2,
  Loader2,
  CheckCircle,
  ExternalLink,
  Save,
  Layers,
} from "lucide-vue-next";
import { Printer } from "lucide-vue-next";
import PrintConfigTab from "./builder/PrintConfigTab.vue";
import BuilderToolbar from "./builder/BuilderToolbar.vue";
import BuilderFormTab from "./builder/BuilderFormTab.vue";
import BuilderLandingTab from "./builder/BuilderLandingTab.vue";

definePageMeta({ layout: false });

const b = useBuilder();
provide("builder", b);

const {
  config,
  configError,
  generated,
  generatedMessage,
  generating,
  panelOpen,
  panelIndex,
  detailPanelOpen,
  detailPanelIndex,
  fields,
  details,
  docsOpen,
  printConfig,
  printableFields,
  printableDetails,
  printTokenExamples,
  closePanel,
  closeDetailPanel,
  cancelBuilder,
  generate,
  updateFieldAtIndex,
  removeField,
  updateDetailAtIndex,
  removeDetail,
  pushUndo,
} = b;
</script>

<template>
  <div class="h-screen overflow-y-auto">
    <!-- ERROR: Config not found -->
    <div
      v-if="configError"
      class="min-h-screen flex items-center justify-center bg-background p-6"
    >
      <Card class="max-w-md w-full">
        <CardHeader>
          <CardTitle class="text-destructive">Builder Tidak Aktif</CardTitle>
          <CardDescription>{{ configError }}</CardDescription>
        </CardHeader>
        <CardContent>
          <pre class="text-sm bg-muted p-3 rounded-md overflow-x-auto">node add_route.cjs setup/m_supplier</pre>
        </CardContent>
      </Card>
    </div>

    <!-- SUCCESS overlay -->
    <div
      v-else-if="generated"
      class="min-h-screen flex items-center justify-center bg-background p-6"
    >
      <Card class="max-w-md w-full text-center">
        <CardContent class="pt-8 pb-8 space-y-4">
          <CheckCircle class="h-16 w-16 mx-auto text-green-500" />
          <h2 class="text-xl font-bold text-green-600">Berhasil!</h2>
          <p class="text-sm text-muted-foreground" v-html="generatedMessage"></p>
          <p class="text-xs text-muted-foreground">
            Tab ini bisa ditutup. Nuxt akan auto-reload halaman baru.
          </p>
          <NuxtLink
            :to="config?.routePath || '/'"
            class="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink class="h-4 w-4" />
            Lihat Halaman
          </NuxtLink>
        </CardContent>
      </Card>
    </div>

    <!-- LOADING config -->
    <div
      v-else-if="!config"
      class="min-h-screen flex items-center justify-center bg-background"
    >
      <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- MAIN BUILDER -->
    <div
      v-else
      class="min-h-screen bg-background transition-[padding-right] duration-[250ms]"
      :style="
        panelOpen
          ? 'padding-right:480px'
          : detailPanelOpen
            ? 'padding-right:520px'
            : ''
      "
    >
      <BuilderToolbar />
      <BuilderDocs v-model:open="docsOpen" />

      <div class="max-w-[80%] mx-auto p-6 space-y-6">
        <Tabs default-value="form" class="w-full">
          <TabsList class="grid w-full grid-cols-3">
            <TabsTrigger value="form">
              <Settings2 class="h-4 w-4 mr-1.5" /> Form Builder
            </TabsTrigger>
            <TabsTrigger value="landing">
              <Table2 class="h-4 w-4 mr-1.5" /> Konfigurasi Landing
            </TabsTrigger>
            <TabsTrigger value="print">
              <Printer class="h-4 w-4 mr-1.5" /> Konfigurasi Print
            </TabsTrigger>
          </TabsList>

          <BuilderFormTab />
          <BuilderLandingTab />

          <TabsContent value="print" class="space-y-6 mt-4">
            <PrintConfigTab
              :printConfig="printConfig"
              :fields="fields"
              :details="details"
              :printableFields="printableFields"
              :printableDetails="printableDetails"
              :configTitle="config?.readableName || 'Dokumen'"
              :printTokenExamples="printTokenExamples"
              @update:printConfig="
                (v) => {
                  printConfig = v;
                }
              "
              @pushUndo="pushUndo"
            />
          </TabsContent>
        </Tabs>

        <!-- Action bar -->
        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="cancelBuilder">Batal</Button>
          <Button @click="generate" :disabled="generating" class="gap-2">
            <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>

      <!-- CONFIG PANEL — Field (slide from right) -->
      <Teleport to="body">
        <Transition name="slide">
          <div
            v-if="panelOpen && panelIndex >= 0 && panelIndex < fields.length"
            class="fixed top-0 right-0 z-[101] h-full w-[480px] bg-card border-l border-border shadow-xl overflow-y-auto overflow-x-hidden"
          >
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-border"
            >
              <h3 class="text-base font-semibold flex items-center gap-2">
                <Settings2 class="h-4 w-4" />
                Konfigurasi Field
              </h3>
              <button
                class="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                @click="closePanel"
              >
                &times;
              </button>
            </div>
            <div class="p-5">
              <BuilderFieldPanel
                :field="fields[panelIndex]"
                :allFields="fields"
                :allDetails="details"
                :fieldIndex="panelIndex"
                @update:field="updateFieldAtIndex"
                @remove="removeField"
                @close="closePanel"
              />
            </div>
            <div class="p-5 border-t border-border">
              <Button class="w-full" @click="closePanel">Selesai</Button>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- CONFIG PANEL — Detail Tab (slide from right) -->
      <Teleport to="body">
        <Transition name="slide">
          <div
            v-if="
              detailPanelOpen &&
              detailPanelIndex >= 0 &&
              detailPanelIndex < details.length
            "
            class="fixed top-0 right-0 z-[101] h-full w-[520px] bg-card border-l border-border shadow-xl overflow-y-auto"
          >
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-border"
            >
              <h3 class="text-base font-semibold flex items-center gap-2">
                <Layers class="h-4 w-4" />
                Konfigurasi Detail
              </h3>
              <button
                class="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                @click="closeDetailPanel"
              >
                &times;
              </button>
            </div>
            <div class="p-5">
              <BuilderDetailPanel
                :detail="details[detailPanelIndex]"
                :detailIndex="detailPanelIndex"
                :allHeaderFields="fields"
                @update:detail="updateDetailAtIndex"
                @remove="removeDetail"
                @close="closeDetailPanel"
              />
            </div>
            <div class="p-5 border-t border-border">
              <Button class="w-full" @click="closeDetailPanel">Selesai</Button>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
