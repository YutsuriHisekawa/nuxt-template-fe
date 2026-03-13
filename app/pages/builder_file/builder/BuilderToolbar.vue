<script setup>
import {
  Undo2,
  Redo2,
  Download,
  Upload,
  BookOpen,
} from "lucide-vue-next";

const b = inject("builder");
</script>

<template>
  <div
    class="border-b border-border bg-card sticky top-0 z-50 px-6 py-3 flex flex-wrap items-center gap-4 text-sm"
  >
    <span
      class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium"
    >{{ b.config.value?.modulePath }}</span>
    <span
      class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium"
    >{{ b.config.value?.routePath }}</span>
    <span
      class="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-medium"
    >Endpoint: {{ b.config.value?.apiEndpoint }}</span>
    <span
      class="bg-primary text-primary-foreground px-2.5 py-1 rounded-md text-xs font-semibold"
    >{{ b.config.value?.readableName }}</span>

    <div class="ml-auto flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1 text-xs"
        :disabled="!b.undoStack.value.length"
        title="Undo (Ctrl+Z)"
        @click="b.undo"
      >
        <Undo2 class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1 text-xs"
        :disabled="!b.redoStack.value.length"
        title="Redo (Ctrl+Y)"
        @click="b.redo"
      >
        <Redo2 class="h-3.5 w-3.5" />
      </Button>
      <div class="w-px h-5 bg-border" />
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1 text-xs"
        title="Import Config"
        @click="b.importConfig"
      >
        <Download class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1 text-xs"
        title="Export Config"
        @click="b.exportConfig"
      >
        <Upload class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        title="Dokumentasi Builder"
        @click="b.docsOpen = true"
      >
        <BookOpen class="h-4 w-4" />
      </Button>
      <ThemeColorToggle />
      <ThemeToggle />
    </div>
  </div>

  <BuilderDocs v-model:open="b.docsOpen.value" />
</template>
