<script setup>
import { FileDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps({
  menuId: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'icon' },
  variant: { type: String, default: 'outline' },
  behavior: { type: String, default: 'disable' }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  emit('click', e)
}
</script>

<template>
  <Button
    v-if="menuId"
    v-permission="{ menuId, action: 'print', behavior }"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    title="Export"
    @click="handleClick"
  >
    <FileDown class="h-4 w-4" />
  </Button>
  <Button
    v-else
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    title="Export"
    @click="handleClick"
  >
    <FileDown class="h-4 w-4" />
  </Button>
</template>
