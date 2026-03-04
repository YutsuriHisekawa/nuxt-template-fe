<script setup lang="ts">
import { TooltipTrigger } from "reka-ui"

const props = defineProps<{
  as?: string | object
  asChild?: boolean
}>()
</script>

<template>
  <TooltipTrigger
    data-slot="tooltip-trigger"
    v-bind="props"
  >
    <slot />
  </TooltipTrigger>
</template>
