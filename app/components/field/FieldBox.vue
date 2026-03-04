<script setup>
import { computed } from 'vue'
import { Label } from '~/components/ui/label'

const props = defineProps({
  /** Field label */
  label: String,
  /** Checked value */
  value: { type: Boolean, default: false },
  /** v-model support */
  modelValue: { type: Boolean, default: undefined },
  /** Label when checked (true) */
  labelTrue: { type: String, default: 'Ya' },
  /** Label when unchecked (false) */
  labelFalse: { type: String, default: 'Tidak' },
  /** Is field disabled */
  disabled: { type: Boolean, default: false },
  /** Is field readonly */
  readonly: { type: Boolean, default: false },
  /** Field ID */
  id: String,
  /** Custom class */
  class: String,
})

const emit = defineEmits(['input', 'update:modelValue'])

const checked = computed({
  get: () => props.modelValue !== undefined ? props.modelValue : props.value,
  set: (val) => {
    emit('input', val)
    emit('update:modelValue', val)
  },
})
</script>

<template>
  <div :class="props.class">
    <Label v-if="label" :for="id" class="block mb-1.5 text-sm font-medium text-foreground">
      {{ label }}
    </Label>
    <label :for="id" class="inline-flex items-center gap-2.5 cursor-pointer select-none" :class="{ 'opacity-50 pointer-events-none': disabled }">
      <input
        :id="id"
        v-model="checked"
        type="checkbox"
        :disabled="disabled || readonly"
        class="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
      />
      <span class="text-sm text-foreground">
        {{ checked ? labelTrue : labelFalse }}
      </span>
    </label>
  </div>
</template>
