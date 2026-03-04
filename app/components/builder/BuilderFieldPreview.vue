<script setup>
import { computed, ref } from 'vue'
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

const COMPONENT_MAP = {
  FieldX,
  FieldNumber,
  FieldTextarea,
  FieldSelect,
  FieldSelectCreatable,
  FieldBox,
}

const props = defineProps({
  field: { type: Object, required: true },
})

const entry = computed(() => getRegistryEntry(props.field.type))

const resolvedComponent = computed(() => {
  const name = entry.value?.component || 'FieldX'
  return COMPONENT_MAP[name] || COMPONENT_MAP.FieldX
})

const previewProps = computed(() => {
  const base = entry.value?.previewProps ? entry.value.previewProps(props.field) : {}
  return {
    ...base,
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
    class="w-full"
  />

  <!-- Semua field lain: interactive preview -->
  <component
    v-else
    :is="resolvedComponent"
    v-bind="previewProps"
    class="w-full"
  />
</template>
