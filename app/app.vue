<script setup>
import { Toaster } from 'vue-sonner'

const themeCookie = useCookie('theme', {
  maxAge: 60 * 60 * 24 * 365,
  secure: true,
  sameSite: 'strict'
})

const themeColorCookie = useCookie('theme-color', {
  maxAge: 60 * 60 * 24 * 365,
  secure: true,
  sameSite: 'strict'
})

if (!themeCookie.value) {
  themeCookie.value = 'light'
}

if (!themeColorCookie.value) {
  themeColorCookie.value = 'default'
}

const isDark = computed(() => themeCookie.value === 'dark')

useHead(() => ({
  htmlAttrs: {
    class: isDark.value ? 'dark' : '',
    'data-theme': themeColorCookie.value
  }
}))
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster 
      position="top-right" 
      rich-colors 
      :theme="isDark ? 'dark' : 'light'"
      :toast-options="{
        classes: {
          toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }"
    />
  </div>
</template>


