<script setup lang="ts">
import { Palette } from "lucide-vue-next"

const themeColorCookie = useCookie("theme-color", {
  maxAge: 60 * 60 * 24 * 365,
  secure: true,
  sameSite: "strict",
})

if (!themeColorCookie.value) {
  themeColorCookie.value = "default"
}

const themes = [
  { label: "Default", value: "default", swatch: "hsl(240 5.9% 10%)" },
  { label: "Red", value: "red", swatch: "hsl(0 84% 60%)" },
  { label: "Rose", value: "rose", swatch: "hsl(346 77% 49%)" },
  { label: "Orange", value: "orange", swatch: "hsl(24 94% 50%)" },
  { label: "Green", value: "green", swatch: "hsl(142 76% 36%)" },
  { label: "Blue", value: "blue", swatch: "hsl(221 83% 53%)" },
  { label: "Yellow", value: "yellow", swatch: "hsl(45 93% 47%)" },
  { label: "Violet", value: "violet", swatch: "hsl(262 83% 58%)" },
]

const selectedTheme = computed({
  get: () => themeColorCookie.value ?? "default",
  set: (value) => {
    themeColorCookie.value = value
  },
})
</script>

<template>
  <Tooltip>
    <DropdownMenu>
      <TooltipTrigger as-child>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background text-foreground shadow-xs transition hover:bg-accent"
            aria-label="Pilih tema warna"
          >
            <Palette class="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
      </TooltipTrigger>
    <DropdownMenuContent align="end" class="w-44">
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup v-model="selectedTheme">
        <DropdownMenuRadioItem
          v-for="theme in themes"
          :key="theme.value"
          :value="theme.value"
          class="flex items-center gap-2"
        >
          <span
            class="h-3 w-3 rounded-full border"
            :style="{ backgroundColor: theme.swatch }"
          />
          {{ theme.label }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
    </DropdownMenu>
    <TooltipContent>Tema Warna</TooltipContent>
  </Tooltip>
</template>
