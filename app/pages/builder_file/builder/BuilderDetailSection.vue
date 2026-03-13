<script setup>
import {
  Plus,
  Trash2,
  Settings2,
  Layers,
  List,
  X,
} from "lucide-vue-next";
import { $resolveDotPath } from "../_useBuilder";

const b = inject("builder");
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div v-if="b.detailTabs.value.length > 0" class="min-w-0 flex-1">
        <Tabs v-model="b.activeDetailTab.value">
          <TabsList class="w-full overflow-x-auto flex justify-start">
            <TabsTrigger
              v-for="tab in b.detailTabs.value"
              :key="tab.id"
              :value="tab.id"
            >
              {{ tab.label || "Tab" }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div
        v-else
        class="flex-1 border-2 border-dashed border-border rounded-lg p-4 text-sm text-muted-foreground"
      >
        Belum ada tab detail. Tambah tab dulu, lalu isi detail di dalam tab tersebut.
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <Button variant="outline" class="gap-1.5" @click="b.addDetailTab">
          <Layers class="h-4 w-4" />
          Tambah Tab
        </Button>
        <Button
          variant="outline"
          class="gap-1.5"
          :disabled="!b.activeDetailTabConfig.value"
          @click="b.addDetailToActiveTab"
        >
          <Plus class="h-4 w-4" />
          Tambah Detail
        </Button>
      </div>
    </div>

    <Card v-if="b.activeDetailTabConfig.value">
      <CardHeader class="pb-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <CardTitle class="text-base">Pengaturan Tab Aktif</CardTitle>
            <CardDescription>
              Tab tetap ada walau belum punya detail. Tambah detail akan masuk ke tab yang sedang aktif.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="text-destructive"
            @click="b.removeActiveDetailTab"
          >
            <Trash2 class="h-4 w-4 mr-1" />
            Hapus Tab
          </Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label class="block mb-1 text-sm font-medium text-muted-foreground">Label Tab</label>
            <input
              type="text"
              :value="b.activeDetailTabConfig.value.label"
              class="w-full rounded bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Tab 1"
              @input="b.updateActiveDetailTab('label', $event.target.value)"
            />
          </div>
          <div>
            <label class="block mb-1 text-sm font-medium text-muted-foreground">Susunan Detail</label>
            <div class="flex rounded-lg border border-border overflow-hidden">
              <button
                class="flex-1 py-2 px-3 text-xs font-medium transition-colors"
                :class="b.activeDetailTabConfig.value.layout !== 'horizontal' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'"
                @click="b.updateActiveDetailTab('layout', 'vertical')"
              >
                Kebawah
              </button>
              <button
                class="flex-1 py-2 px-3 text-xs font-medium transition-colors border-l border-border"
                :class="b.activeDetailTabConfig.value.layout === 'horizontal' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'"
                @click="b.updateActiveDetailTab('layout', 'horizontal')"
              >
                Kesamping
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <div
      v-if="b.activeDetailTabConfig.value && b.activeTabDetails.value.length === 0"
      class="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground"
    >
      <p class="text-sm font-medium">Tab {{ b.activeDetailTabConfig.value.label || "Tab" }} masih kosong</p>
      <p class="text-xs mt-1">Tambah detail sebanyak yang dibutuhkan ke tab aktif ini.</p>
    </div>

    <div v-if="b.activeTabDetails.value.length > 0" :class="b.activeDetailLayoutClass.value">
      <div v-for="detail in b.activeTabDetails.value" :key="detail._origIdx">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Layers class="h-4 w-4 text-primary" />
                <CardTitle class="text-base">{{ detail.tabLabel || "Detail" }}</CardTitle>
                <span class="text-xs text-muted-foreground">
                  {{ detail.responseKey || "?" }} → {{ detail.payloadKey || "?" }}
                </span>
                <span
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  :class="
                    detail.mode === 'add_to_list'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                  "
                >
                  {{ detail.mode === "add_to_list" ? "Add To List" : "ButtonMultiSelect" }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="b.openDetailPanel(detail._origIdx)"
                >
                  <Settings2 class="h-3.5 w-3.5 mr-1" />
                  Konfigurasi
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-destructive"
                  @click="b.removeDetail(detail._origIdx)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              <template v-if="detail.mode !== 'add_to_list'">
                API: {{ detail.apiUrl || "-" }} · FK:
                {{ detail.foreignKey || "-" }} ·
                {{ (detail.detailFields || []).length }} field per baris
              </template>
              <template v-else>
                {{ (detail.detailFields || []).length }} field per baris (manual add)
              </template>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <!-- Action button: ButtonMultiSelect or Tambah -->
            <div class="flex justify-end mb-3">
              <ButtonMultiSelect
                v-if="detail.mode !== 'add_to_list' && detail.apiUrl"
                :title="detail.buttonLabel || 'Pilih Item'"
                :api="{ url: (detail.apiUrl || '').split('?')[0], params: (detail.apiParams || []).filter(p => p.key).reduce((o, p) => { o[p.key] = p.value || ''; return o }, {}) }"
                :columns="
                  (detail.columns || [])
                    .filter((c) => c.key)
                    .map((c) => ({
                      key: c.key,
                      label: c.label,
                      sortable: true,
                      ...(c.width ? { width: c.width } : {}),
                    }))
                "
                :searchKey="detail.searchKey || 'name'"
                :antiDuplicate="!!detail.antiDuplicate"
                :excludeKeys="b.getPreviewExcludeKeys(detail._origIdx)"
                @add="
                  (items) => { b.handlePreviewMultiSelectAdd(detail._origIdx, items); nextTick(() => b.getPreviewArr(detail._origIdx).forEach((_, rIdx) => b.computeDetailRowFormulas(detail._origIdx, rIdx))) }
                "
              />
              <Button
                v-else-if="detail.mode === 'add_to_list'"
                variant="outline"
                size="sm"
                class="gap-1.5"
                @click="b.handlePreviewAddRow(detail._origIdx)"
              >
                <Plus class="h-4 w-4" />
                {{ detail.buttonLabel || "Tambah" }}
              </Button>
              <span v-else class="text-xs text-muted-foreground italic">
                Isi API Endpoint dulu untuk test ButtonMultiSelect
              </span>
            </div>

            <!-- Detail Table -->
            <div class="w-full border border-border rounded-lg overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-muted/60">
                  <tr>
                    <th class="px-2 py-2 text-center font-medium text-xs w-12">No</th>
                    <th
                      v-if="detail.mode !== 'add_to_list'"
                      v-for="dc in detail.displayColumns || []"
                      :key="'dch-' + dc.key"
                      class="px-2 py-2 text-left font-medium text-xs"
                    >
                      {{ dc.label || dc.key }}
                    </th>
                    <th
                      v-for="df in detail.detailFields || []"
                      :key="'dfh-' + df.key"
                      :class="b.getDetailFieldHeaderClass(df)"
                      :style="b.getDetailFieldCellStyle(df)"
                    >
                      {{ df.label || df.key }}
                    </th>
                    <th class="px-2 py-2 text-center font-medium text-xs w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!b.getPreviewArr(detail._origIdx).length">
                    <td
                      :colspan="
                        1 +
                        (detail.mode !== 'add_to_list' ? (detail.displayColumns || []).length : 0) +
                        (detail.detailFields || []).length +
                        1
                      "
                      class="px-4 py-6 text-center text-muted-foreground text-sm"
                    >
                      Belum ada item ditambahkan
                    </td>
                  </tr>
                  <tr
                    v-for="(row, rIdx) in b.getPreviewArr(detail._origIdx)"
                    :key="rIdx"
                    class="border-t border-border hover:bg-muted/30"
                  >
                    <td class="px-2 py-2 text-center text-muted-foreground text-xs">{{ rIdx + 1 }}</td>
                    <td
                      v-if="detail.mode !== 'add_to_list'"
                      v-for="dc in detail.displayColumns || []"
                      :key="'dcv-' + dc.key"
                      class="px-2 py-2 text-sm text-muted-foreground"
                    >
                      {{
                        detail.foreignDisplay
                          ? $resolveDotPath(row[detail.foreignDisplay], dc.key) || "-"
                          : $resolveDotPath(row, dc.key) || "-"
                      }}
                    </td>
                    <td
                      v-for="df in detail.detailFields || []"
                      :key="'dfv-' + df.key"
                      :class="b.getDetailFieldCellClass(df)"
                      :style="b.getDetailFieldCellStyle(df)"
                    >
                      <FieldBox
                        v-if="df.type === 'checkbox'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :readonly="b.isDetailFieldReadonly(df)"
                        :labelTrue="df.labelTrue || 'Ya'"
                        :labelFalse="df.labelFalse || 'Tidak'"
                      />
                      <FieldStatus
                        v-else-if="df.type === 'status'"
                        :modelValue="row[df.key]"
                        @update:modelValue="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :readonly="b.isDetailFieldReadonly(df)"
                        :activeText="df.labelTrue || 'Aktif'"
                        :inactiveText="df.labelFalse || 'Tidak Aktif'"
                      />
                      <FieldSelect
                        v-else-if="df.type === 'select'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        @update:valueFull="(obj) => b.onDetailPreviewValueFull(detail._origIdx, rIdx, df.key, obj)"
                        :sourceType="df.sourceType || 'api'"
                        :apiUrl="df.apiUrl || ''"
                        :displayField="df.displayField || 'name'"
                        :valueField="df.valueField || 'id'"
                        :staticOptions="df.staticOptions || []"
                        :apiParams="(df.apiParams || []).filter(p => p.key).reduce((o, p) => { o[p.key] = p.value || ''; return o }, {})"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldPopUp
                        v-else-if="df.type === 'popup'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        @update:valueFull="(obj) => b.onDetailPreviewValueFull(detail._origIdx, rIdx, df.key, obj)"
                        :apiUrl="df.apiUrl || ''"
                        :displayField="df.displayField || 'name'"
                        :valueField="df.valueField || 'id'"
                        :columns="df.popupColumns || []"
                        :searchFields="df.searchFields || ''"
                        :dialogTitle="df.dialogTitle || ''"
                        :apiParams="(df.apiParams || []).filter(p => p.key).reduce((o, p) => { o[p.key] = p.value || ''; return o }, {})"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldNumber
                        v-else-if="df.type === 'fieldnumber' || df.type === 'fieldnumber_decimal'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :type="df.type === 'fieldnumber_decimal' ? 'decimal' : 'integer'"
                        :decimalPlaces="df.decimalPlaces ?? 2"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldX
                        v-else-if="df.type === 'number'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        type="number"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldDate
                        v-else-if="df.type === 'date'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldDateTime
                        v-else-if="df.type === 'datetime'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldRadio
                        v-else-if="df.type === 'radio'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :options="(df.radioOptions || []).map((o) => ({ value: o.value, label: o.label || o.value }))"
                        :readonly="b.isDetailFieldReadonly(df)"
                      />
                      <FieldCurrency
                        v-else-if="df.type === 'currency'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :readonly="b.isDetailFieldReadonly(df)"
                        :decimalPlaces="df.decimalPlaces ?? 2"
                        class="w-full"
                      />
                      <FieldSlider
                        v-else-if="df.type === 'slider'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldTextarea
                        v-else-if="df.type === 'textarea'"
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                      <FieldX
                        v-else
                        :value="row[df.key]"
                        @input="(v) => b.updateCellAndCompute(detail._origIdx, rIdx, df.key, v)"
                        :placeholder="df.label || df.key"
                        :readonly="b.isDetailFieldReadonly(df)"
                        class="w-full"
                      />
                    </td>
                    <td class="px-2 py-2 text-center">
                      <button
                        class="text-destructive hover:text-destructive/80 text-xs font-medium"
                        @click="b.removePreviewRow(detail._origIdx, rIdx)"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                </tbody>
                <!-- Footer SUM/AVG/COUNT row -->
                <tfoot
                  v-if="(detail.detailFields || []).some(df => df.summaryType)"
                  class="border-t-2 border-border"
                >
                  <tr class="bg-muted/40 font-semibold text-xs">
                    <td class="px-2 py-2 text-center text-muted-foreground">Σ</td>
                    <td
                      v-if="detail.mode !== 'add_to_list'"
                      v-for="dc in detail.displayColumns || []"
                      :key="'dcf-' + dc.key"
                      class="px-2 py-2"
                    ></td>
                    <td
                      v-for="df in detail.detailFields || []"
                      :key="'dft-' + df.key"
                      class="px-2 py-2 text-right"
                    >
                      <template v-if="df.summaryType === 'SUM'">
                        {{ b.formatDetailPreviewNumber(b.getPreviewArr(detail._origIdx).reduce((acc, row) => acc + (Number(row[df.key]) || 0), 0), df) }}
                      </template>
                      <template v-else-if="df.summaryType === 'AVG'">
                        {{ b.getPreviewArr(detail._origIdx).length
                          ? b.formatDetailPreviewNumber(b.getPreviewArr(detail._origIdx).reduce((acc, row) => acc + (Number(row[df.key]) || 0), 0) / b.getPreviewArr(detail._origIdx).length, df)
                          : 0 }}
                      </template>
                      <template v-else-if="df.summaryType === 'COUNT'">
                        {{ b.getPreviewArr(detail._origIdx).filter(row => row[df.key] !== undefined && row[df.key] !== null && row[df.key] !== '').length }}
                      </template>
                    </td>
                    <td class="px-2 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <div
      v-if="b.activeDetailTabConfig.value"
      class="border-2 border-dashed border-border rounded-lg p-4 flex items-center justify-center cursor-pointer text-muted-foreground hover:border-primary hover:text-primary hover:bg-accent/30 transition-all"
      @click="b.addDetailToActiveTab"
    >
      <List class="h-5 w-5 mr-2" />
      <span class="text-sm font-medium">Tambah Detail ke Tab Aktif</span>
    </div>
  </div>
</template>
