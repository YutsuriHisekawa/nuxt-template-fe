<script setup>
import {
  Copy,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-vue-next";

const props = defineProps({
  idx: { type: Number, required: true },
});

const b = inject("builder");
</script>

<template>
  <div
    :draggable="!b.bulkMode.value"
    @dragstart="b.onDragStart(idx, $event)"
    @dragover="b.onDragOver(idx, $event)"
    @dragleave="b.onDragLeave"
    @drop="b.onDrop(idx, $event)"
    @dragend="b.onDragEnd"
    class="relative group rounded-lg pt-4 pb-3 px-3 transition-all"
    :class="[
      b.fields.value[idx].fullWidth ||
      b.getRegistryEntry(b.fields.value[idx].type)?.isSection ||
      b.getRegistryEntry(b.fields.value[idx].type)?.isFieldGroup ||
      b.getRegistryEntry(b.fields.value[idx].type)?.isFieldGroupEnd
        ? b.colSpanFull.value
        : '',
      b.panelIndex.value === idx
        ? 'ring-2 ring-ring ring-offset-2 ring-offset-background bg-accent/50'
        : 'hover:ring-2 hover:ring-ring/40 hover:ring-offset-2 hover:ring-offset-background hover:bg-accent/30',
      b.fields.value[idx].visibleWhenField &&
      String(b.previewValues[b.fields.value[idx].visibleWhenField] ?? '') !== String(b.fields.value[idx].visibleWhenValue ?? '')
        ? 'opacity-30' : '',
      b.fields.value[idx].readonlyWhenField &&
      !b.fields.value[idx].readonly &&
      String(b.previewValues[b.fields.value[idx].readonlyWhenField] ?? '') === String(b.fields.value[idx].readonlyWhenValue ?? '')
        ? 'opacity-60' : '',
      b.dragIndex.value === idx ? 'opacity-40 scale-95' : '',
      b.dragOverIndex.value === idx && b.dragIndex.value !== idx
        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '',
      b.isInsideGroup(idx) ? 'border-l-2 border-l-primary/40 ml-2' : '',
      !b.bulkMode.value ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      b.selectedFields.value.has(idx) ? 'ring-2 ring-primary bg-primary/5' : '',
    ]"
    @click="b.bulkMode.value ? b.toggleFieldSelect(idx) : null"
  >
    <!-- Bulk checkbox -->
    <div v-if="b.bulkMode.value" class="absolute top-1 left-1 z-10">
      <component
        :is="b.selectedFields.value.has(idx) ? CheckSquare : Square"
        class="h-4 w-4 text-primary"
      />
    </div>

    <!-- Action buttons -->
    <div
      v-if="!b.bulkMode.value"
      class="absolute -top-2.5 -right-1.5 hidden group-hover:flex gap-1 z-10"
    >
      <button
        class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-primary hover:border-primary flex items-center justify-center shadow-sm"
        @click.stop="b.openPanel(idx)"
        title="Edit field"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
      <button
        class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-blue-500 hover:border-blue-500 flex items-center justify-center shadow-sm"
        @click.stop="b.cloneField(idx)"
        title="Duplikasi field"
      >
        <Copy class="h-3 w-3" />
      </button>
      <button
        v-if="b.getRegistryEntry(b.fields.value[idx].type)?.isFieldGroup"
        class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-green-500 hover:border-green-500 flex items-center justify-center shadow-sm"
        @click.stop="b.addFieldInsideGroup(idx)"
        title="Tambah field di dalam group"
      >
        <Plus class="h-3 w-3" />
      </button>
      <button
        v-if="idx > 0"
        class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-primary hover:border-primary flex items-center justify-center shadow-sm"
        @click.stop="b.moveField(idx, -1)"
      >
        <ChevronUp class="h-3 w-3" />
      </button>
      <button
        v-if="idx < b.fields.value.length - 1"
        class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-primary hover:border-primary flex items-center justify-center shadow-sm"
        @click.stop="b.moveField(idx, 1)"
      >
        <ChevronDown class="h-3 w-3" />
      </button>
      <button
        class="h-6 w-6 rounded-full border bg-background text-muted-foreground hover:text-destructive hover:border-destructive flex items-center justify-center shadow-sm"
        @click.stop="b.removeField(idx)"
      >
        <Trash2 class="h-3 w-3" />
      </button>
    </div>

    <!-- Component badge -->
    <span
      class="absolute top-0 left-2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
    >
      {{ b.getComponentBadge(b.fields.value[idx].type) }}
    </span>

    <!-- Duplicate warning badge -->
    <span
      v-if="b.fields.value[idx].field && b.duplicateFieldNames.value.has(b.fields.value[idx].field)"
      class="absolute top-0 right-2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive flex items-center gap-0.5"
    >
      <AlertTriangle class="w-3 h-3" /> Duplikat
    </span>

    <!-- VisibleWhen indicator badge -->
    <span
      v-if="b.fields.value[idx].visibleWhenField"
      class="absolute top-0 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5"
      :style="{ left: `${(b.getComponentBadge(b.fields.value[idx].type)?.length || 5) * 7 + 24}px` }"
      :title="`Tampil jika ${b.fields.value[idx].visibleWhenField} = ${b.fields.value[idx].visibleWhenValue}`"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      Kondisional
    </span>

    <!-- Dynamic preview from registry -->
    <BuilderFieldPreview
      :field="b.fields.value[idx]"
      :previewValues="b.previewValues"
      @previewChange="(fieldName, val) => b.onPreviewChange(fieldName, val)"
      @previewValueFull="(fieldName, obj) => b.onPreviewValueFull(fieldName, obj)"
    />

    <!-- Footer row: badges + wizard step -->
    <div
      v-if="
        b.fields.value[idx].requiredWhenField ||
        b.fields.value[idx].readonlyWhenField ||
        (Array.isArray(b.fields.value[idx].computedFormula)
          ? b.fields.value[idx].computedFormula.length
          : b.fields.value[idx].computedFormula) ||
        b.fields.value[idx].apiUrl ||
        (Array.isArray(b.fields.value[idx].apiParams) && b.fields.value[idx].apiParams.some(p => p.key)) ||
        b.fields.value[idx].dependsOn ||
        b.fields.value[idx].defaultValueFrom?.field ||
        (b.wizardSteps.value.length > 0 &&
          !b.getRegistryEntry(b.fields.value[idx].type)?.isSpace &&
          !b.getRegistryEntry(b.fields.value[idx].type)?.isFieldGroupEnd)
      "
      class="flex items-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-border/50"
    >
      <span
        v-if="b.fields.value[idx].requiredWhenField"
        class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        :title="`Required jika ${b.fields.value[idx].requiredWhenField} = ${b.fields.value[idx].requiredWhenValue}`"
      >
        Req. Kondisional
      </span>
      <span
        v-if="b.fields.value[idx].readonlyWhenField"
        class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300 flex items-center gap-0.5"
        :title="`Readonly jika ${b.fields.value[idx].readonlyWhenField} = ${b.fields.value[idx].readonlyWhenValue}`"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Readonly Kondisional
      </span>
      <span
        v-if="Array.isArray(b.fields.value[idx].computedFormula) ? b.fields.value[idx].computedFormula.length : b.fields.value[idx].computedFormula"
        class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 font-mono truncate max-w-[60%]"
        :title="`Formula: ${Array.isArray(b.fields.value[idx].computedFormula) ? b.fields.value[idx].computedFormula.map((t) => t.value).join(' ') : b.fields.value[idx].computedFormula}`"
      >
        ƒ
        {{ Array.isArray(b.fields.value[idx].computedFormula)
          ? b.fields.value[idx].computedFormula.map((t) =>
              t.type === "field" ? t.value : t.value === "*" ? "×" : t.value === "/" ? "÷" : t.value
            ).join(" ")
          : b.fields.value[idx].computedFormula
        }}
      </span>
      <span
        v-if="b.fields.value[idx].apiUrl"
        class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 truncate max-w-[50%]"
        :title="`API: ${b.fields.value[idx].apiUrl}`"
      >
        🔗 {{ b.fields.value[idx].apiUrl }}
      </span>
      <span
        v-if="Array.isArray(b.fields.value[idx].apiParams) && b.fields.value[idx].apiParams.some(p => p.key)"
        class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
        :title="`Params: ${b.fields.value[idx].apiParams.filter(p => p.key).map(p => p.key + '=' + p.value).join(', ')}`"
      >
        ⚙ {{ b.fields.value[idx].apiParams.filter(p => p.key).map(p => p.key + '=' + p.value).join(', ') }}
      </span>
      <span
        v-if="b.fields.value[idx].dependsOn"
        class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        :title="`Tergantung: ${b.fields.value[idx].dependsOn}${b.fields.value[idx].dependsOnParam ? ' → param: ' + b.fields.value[idx].dependsOnParam : ''}`"
      >
        🔗 → {{ b.fields.value[idx].dependsOn }}
      </span>
      <span
        v-if="b.fields.value[idx].defaultValueFrom?.field"
        class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
        :title="`Auto-fill: ${b.fields.value[idx].defaultValueFrom.field} → ${b.fields.value[idx].defaultValueFrom.property}`"
      >
        ⚡ {{ b.fields.value[idx].defaultValueFrom.field }}.{{ b.fields.value[idx].defaultValueFrom.property }}
      </span>
      <div
        class="ml-auto"
        v-if="
          b.wizardSteps.value.length > 0 &&
          !b.getRegistryEntry(b.fields.value[idx].type)?.isSpace &&
          !b.getRegistryEntry(b.fields.value[idx].type)?.isFieldGroupEnd
        "
      >
        <select
          :value="b.fields.value[idx].step || 0"
          class="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 focus:ring-0 focus:border-primary cursor-pointer"
          @click.stop
          @change.stop="b.fields.value[idx].step = Number($event.target.value)"
        >
          <option
            v-for="(step, si) in b.wizardSteps.value"
            :key="si"
            :value="si"
          >
            S{{ si + 1 }}: {{ step.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Add field inside group button -->
    <div
      v-if="b.getRegistryEntry(b.fields.value[idx].type)?.isFieldGroup && !b.bulkMode.value"
      class="mt-2 border border-dashed border-primary/40 rounded-md p-1.5 flex items-center justify-center cursor-pointer text-primary/70 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
      @click.stop="b.addFieldInsideGroup(idx)"
    >
      <Plus class="h-3.5 w-3.5 mr-1" />
      <span class="text-xs font-medium">Tambah Field di Group ini</span>
    </div>
  </div>
</template>
