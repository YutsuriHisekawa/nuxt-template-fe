<script setup lang="ts">
import { Loader2 } from "lucide-vue-next"

definePageMeta({ layout: false })

await navigateTo("/dashboard")
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div class="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <Loader2 class="size-5 animate-spin text-primary" />
      <div>
        <p class="text-sm font-medium">Loading dashboard</p>
        <p class="text-xs text-muted-foreground">Preparing your workspace...</p>
      </div>
    </div>
  </div>
</template>
