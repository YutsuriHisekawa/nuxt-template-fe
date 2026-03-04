<script setup lang="ts">
import { DialogTrigger } from "reka-ui"

const props = defineProps<{
  as?: string | object
  asChild?: boolean
}>()
</script>

<template>
  <DialogTrigger
    data-slot="sheet-trigger"
    v-bind="props"
  >
    <slot />
  </DialogTrigger>
</template>
