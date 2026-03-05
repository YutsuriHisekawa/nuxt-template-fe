<script setup>
const props = defineProps({
  /** Field label */
  label: String,
  /** Input value */
  value: String,
  /** Input value (for v-model support) */
  modelValue: String,
  /** Radio options - array of { label, value } */
  options: {
    type: Array,
    required: true,
    default: () => []
  },
  /** Error message or hint */
  hints: String,
  /** Error state name */
  errorname: {
    type: String,
    default: '',
    validator: (val) => ['failed', ''].includes(val)
  },
  /** Is field required */
  required: {
    type: Boolean,
    default: false
  },
  /** Is field disabled */
  disabled: {
    type: Boolean,
    default: false
  },
  /** Is field readonly */
  readonly: {
    type: Boolean,
    default: false
  },
  /** Layout direction */
  direction: {
    type: String,
    default: 'horizontal',
    validator: (val) => ['horizontal', 'vertical'].includes(val)
  },
  /** Custom class */
  class: String,
  /** Field ID */
  id: String,
})

const emit = defineEmits(['input', 'update:modelValue'])

const hasError = computed(() => props.errorname === 'failed')

const currentValue = computed(() => props.modelValue ?? props.value ?? '')

const handleValueChange = (newValue) => {
  if (props.disabled || props.readonly) return
  emit('input', newValue)
  emit('update:modelValue', newValue)
}
</script>

<template>
  <div :class="props.class">
    <label
      v-if="label"
      :for="id"
      class="mb-2 block text-sm font-medium"
      :class="{ 'required': required }"
    >
      {{ label }}
    </label>

    <RadioGroup
      :model-value="currentValue"
      @update:model-value="handleValueChange"
      :disabled="disabled || readonly"
    >
      <div
        class="flex flex-wrap"
        :class="direction === 'vertical' ? 'flex-col gap-3' : 'flex-row gap-x-6 gap-y-2'"
      >
        <div
          v-for="option in options"
          :key="option.value"
          class="flex items-center space-x-2"
        >
          <RadioGroupItem
            :value="option.value"
            :id="`${id || 'radio'}-${option.value}`"
            :disabled="disabled || readonly"
          />
          <label
            :for="`${id || 'radio'}-${option.value}`"
            class="text-sm font-normal cursor-pointer"
            :class="{ 'cursor-not-allowed opacity-50': disabled || readonly }"
          >
            {{ option.label }}
          </label>
        </div>
      </div>
    </RadioGroup>

    <p v-if="hints" :class="hasError ? 'text-destructive' : 'text-muted-foreground'" class="text-sm mt-1">
      {{ hints }}
    </p>
  </div>
</template>

<style scoped>
.required::after {
  content: " *";
  color: #ef4444;
  font-weight: bold;
}
</style>
