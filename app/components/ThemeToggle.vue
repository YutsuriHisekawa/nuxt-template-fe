<script setup>
const themeCookie = useCookie('theme', {
  maxAge: 60 * 60 * 24 * 365,
  secure: true,
  sameSite: 'strict'
})

if (!themeCookie.value) {
  themeCookie.value = 'light'
}

const isDark = computed(() => themeCookie.value === 'dark')

function toggleTheme() {
  themeCookie.value = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <button
    type="button"
    class="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background text-foreground shadow-xs transition hover:bg-accent"
    :aria-label="isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
    :title="isDark ? 'Mode Terang' : 'Mode Gelap'"
    @click="toggleTheme"
  >
    <svg
      v-if="!isDark"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
    <svg
      v-else
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79" />
    </svg>
  </button>
</template>
