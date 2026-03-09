<script setup>
import { computed, ref, watch } from 'vue'
import { getRegistryEntry } from '~/utils/builder/fieldRegistry'

// Nuxt auto-import TIDAK mendaftarkan component secara global,
// jadi <component :is="'FieldX'"> / resolveComponent('FieldX') tidak bekerja.
// Kita harus import explicit lalu pakai object reference.
import FieldX from '~/components/field/FieldX.vue'
import FieldNumber from '~/components/field/FieldNumber.vue'
import FieldTextarea from '~/components/field/FieldTextarea.vue'
import FieldSelect from '~/components/field/FieldSelect.vue'
import FieldSelectCreatable from '~/components/field/FieldSelectCreatable.vue'
import FieldBox from '~/components/field/FieldBox.vue'
import FieldDate from '~/components/field/FieldDate.vue'
import FieldDateTime from '~/components/field/FieldDateTime.vue'
import FieldRadio from '~/components/field/FieldRadio.vue'
import FieldPopUp from '~/components/field/FieldPopUp.vue'
import FieldCurrency from '~/components/field/FieldCurrency.vue'
import FieldSlider from '~/components/field/FieldSlider.vue'
import FieldUpload from '~/components/field/FieldUpload.vue'
import FieldMultiUpload from '~/components/field/FieldMultiUpload.vue'

const COMPONENT_MAP = {
  FieldX,
  FieldNumber,
  FieldTextarea,
  FieldSelect,
  FieldSelectCreatable,
  FieldBox,
  FieldDate,
  FieldDateTime,
  FieldRadio,
  FieldPopUp,
  FieldCurrency,
  FieldSlider,
  FieldUpload,
  FieldMultiUpload,
}

const props = defineProps({
  field: { type: Object, required: true },
  previewValues: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['previewChange', 'previewValueFull'])

const entry = computed(() => getRegistryEntry(props.field.type))

const resolvedComponent = computed(() => {
  const name = entry.value?.component || 'FieldX'
  return COMPONENT_MAP[name] || COMPONENT_MAP.FieldX
})

// ── Reactive preview value for interactive preview ─────────────────────
function getTodayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function getNowDateTime() {
  const d = new Date()
  return `${getTodayDate()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const previewValue = ref('')

const resolveDefaultValue = () => {
  const f = props.field
  if (f.defaultValue === 'NOW') {
    if (f.type === 'datetime') return getNowDateTime()
    if (f.type === 'date') return getTodayDate()
  }
  return f.defaultValue || ''
}

// Re-init preview value when field type or defaultValue changes
watch(
  () => [props.field.type, props.field.defaultValue],
  () => { previewValue.value = resolveDefaultValue() },
  { immediate: true }
)

// Sync from parent's previewValues (e.g. when parent clears this child via cascade)
watch(
  () => props.field.field ? props.previewValues[props.field.field] : undefined,
  (newVal) => {
    if (newVal !== undefined && newVal !== previewValue.value) {
      previewValue.value = newVal
    }
  }
)

const handlePreviewInput = (v) => {
  previewValue.value = v
  // Emit so parent can track this field's preview value (for cascading)
  if (props.field.field) {
    emit('previewChange', props.field.field, v)
  }
}

const handlePreviewValueFull = (obj) => {
  if (props.field.field) {
    emit('previewValueFull', props.field.field, obj)
  }
}

const previewProps = computed(() => {
  const base = entry.value?.previewProps ? entry.value.previewProps(props.field, props.previewValues) : {}
  const result = {
    ...base,
    value: previewValue.value,
    readonly: !!props.field.readonly,
  }
  // Centralized dependsOn: disable field if parent has no value
  if (props.field.dependsOn && props.previewValues && !props.previewValues[props.field.dependsOn]) {
    result.disabled = true
  }
  // Computed formula field: always disabled (auto-calculated)
  const hasFormula = Array.isArray(props.field.computedFormula) ? props.field.computedFormula.length > 0 : false
  if (hasFormula) {
    result.disabled = true
  }
  return result
})

const isSwitch = computed(() => entry.value?.isSwitch === true)
const isFieldBox = computed(() => entry.value?.isFieldBox === true)
const isSpace = computed(() => entry.value?.isSpace === true)
const isSection = computed(() => entry.value?.isSection === true)
const isFieldGroup = computed(() => entry.value?.isFieldGroup === true)
const isFieldGroupEnd = computed(() => entry.value?.isFieldGroupEnd === true)

// Interactive switch state
const switchValue = ref(props.field.defaultValue !== 'false')
const switchDisabled = computed(() => {
  if (props.field.readonly) return true
  return props.field.dependsOn && props.previewValues && !props.previewValues[props.field.dependsOn]
})
function toggleSwitch(e) {
  e.stopPropagation()
  e.preventDefault()
  if (switchDisabled.value) return
  switchValue.value = !switchValue.value
}
</script>

<template>
  <!-- Space: empty placeholder -->
  <div v-if="isSpace" class="w-full h-10 rounded border border-dashed border-muted-foreground/30 flex items-center justify-center">
    <span class="text-xs text-muted-foreground/50 select-none">Space</span>
  </div>

  <!-- Section Divider -->
  <div v-else-if="isSection" class="w-full border-b border-border pb-2 pt-1">
    <h3 class="text-base font-semibold text-foreground">{{ field.label || 'Section Title' }}</h3>
  </div>

  <!-- Field Group Start -->
  <div v-else-if="isFieldGroup" class="w-full rounded-lg border-2 border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
    <span class="text-sm font-semibold text-primary">{{ field.label || 'Group Title' }}</span>
    <span class="text-[10px] text-primary/60 ml-auto">▼ GROUP START</span>
  </div>

  <!-- Field Group End -->
  <div v-else-if="isFieldGroupEnd" class="w-full rounded-lg border-2 border-primary/30 bg-primary/5 p-2 flex items-center justify-center">
    <span class="text-[10px] text-primary/60">▲ GROUP END</span>
  </div>

  <!-- Switch preview (inline native button) -->
  <div v-else-if="isSwitch" class="pt-1" draggable="false" @mousedown.stop>
    <label v-if="field.label" class="block text-sm font-medium mb-1">{{ field.label }}</label>
    <div class="flex items-center gap-3 cursor-pointer select-none" @click="toggleSwitch">
    <button
      type="button"
      role="switch"
      :aria-checked="switchValue"
      tabindex="-1"
      :class="[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-sm border-2 border-transparent',
        switchValue ? 'bg-primary' : 'bg-input',
        switchDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
    >
      <span
        :class="[
          'inline-block h-5 w-5 transform rounded-full bg-background shadow-lg transition-transform',
          switchValue ? 'translate-x-5' : 'translate-x-0'
        ]"
      />
    </button>
    <span class="text-sm font-semibold" :class="switchValue ? 'text-green-600' : 'text-red-600'">
      {{ switchValue ? (field.labelTrue || 'Aktif') : (field.labelFalse || 'Tidak Aktif') }}
    </span>
    </div>
  </div>

  <!-- FieldBox uses its own component -->
  <component
    v-else-if="isFieldBox"
    :is="resolvedComponent"
    v-bind="previewProps"
    @input="handlePreviewInput"
    class="w-full"
  />

  <!-- Semua field lain: interactive preview -->
  <component
    v-else
    :is="resolvedComponent"
    v-bind="previewProps"
    @input="handlePreviewInput"
    @update:valueFull="handlePreviewValueFull"
    class="w-full"
  />
</template>
