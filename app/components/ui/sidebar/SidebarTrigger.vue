<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { useSidebar } from "./utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { toggleSidebar, open, openMobile, isMobile } = useSidebar()

const isSidebarOpen = computed(() => isMobile.value ? openMobile.value : open.value)
</script>

<template>
  <Button
    data-sidebar="trigger"
    variant="ghost"
    size="icon"
    :class="cn('h-8 w-8 rounded-md transition-colors hover:bg-accent/70', props.class)"
    @click="toggleSidebar"
  >
    <span class="relative flex h-4 w-4 items-center justify-center">
      <span
        class="absolute h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-out"
        :class="isSidebarOpen ? 'translate-y-0 rotate-45' : '-translate-y-1.5 rotate-0'"
      />
      <span
        class="absolute h-0.5 w-4 rounded-full bg-current transition-all duration-200 ease-out"
        :class="isSidebarOpen ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'"
      />
      <span
        class="absolute h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-out"
        :class="isSidebarOpen ? 'translate-y-0 -rotate-45' : 'translate-y-1.5 rotate-0'"
      />
    </span>
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
