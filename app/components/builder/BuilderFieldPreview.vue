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
}

const props = defineProps({
  field: { type: Object, required: true },
})

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

const handlePreviewInput = (v) => {
  previewValue.value = v
}

const previewProps = computed(() => {
  const base = entry.value?.previewProps ? entry.value.previewProps(props.field) : {}
  return {
    ...base,
    value: previewValue.value,
    readonly: !!props.field.readonly,
  }
})

const isSwitch = computed(() => entry.value?.isSwitch === true)
const isFieldBox = computed(() => entry.value?.isFieldBox === true)
const isSpace = computed(() => entry.value?.isSpace === true)

// Interactive switch state
const switchValue = ref(props.field.defaultValue !== 'false')
</script>

<template>
  <!-- Space: empty placeholder -->
  <div v-if="isSpace" class="w-full h-10 rounded border border-dashed border-muted-foreground/30 flex items-center justify-center">
    <span class="text-xs text-muted-foreground/50 select-none">Space</span>
  </div>

  <!-- Switch memerlukan layout khusus -->
  <div v-if="isSwitch" class="flex items-center gap-3 pt-2">
    <Switch :id="field.field || 'switch-preview'" v-model="switchValue" />
    <Label :for="field.field || 'switch-preview'" class="cursor-pointer">
      {{ switchValue ? (field.labelTrue || 'Aktif') : (field.labelFalse || 'Tidak Aktif') }}
    </Label>
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
    class="w-full"
  />
</template>
