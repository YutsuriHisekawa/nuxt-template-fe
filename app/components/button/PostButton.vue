<script setup>
import { Send } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps({
  menuId: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: 'icon' },
  variant: { type: String, default: 'outline' },
  behavior: { type: String, default: 'disable' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  emit('click', e)
}
</script>

<template>
  <Button
    v-if="menuId"
    v-permission="{ menuId, action: 'update', behavior }"
    :variant="variant"
    :size="size"
    :disabled="disabled || loading"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    title="Post / Kirim"
    @click="handleClick"
  >
    <Send class="h-4 w-4" :class="{ 'animate-pulse': loading }" />
  </Button>
  <Button
    v-else
    :variant="variant"
    :size="size"
    :disabled="disabled || loading"
    :class="{ 'opacity-50 cursor-not-allowed': disabled }"
    title="Post / Kirim"
    @click="handleClick"
  >
    <Send class="h-4 w-4" :class="{ 'animate-pulse': loading }" />
  </Button>
</template>
