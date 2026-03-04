<script setup lang="ts">
import { DialogClose } from "reka-ui"

const props = defineProps<{
  as?: string | object
  asChild?: boolean
}>()
</script>

<template>
  <DialogClose
    data-slot="sheet-close"
    v-bind="props"
  >
    <slot />
  </DialogClose>
</template>
