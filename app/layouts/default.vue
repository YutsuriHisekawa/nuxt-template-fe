<script setup lang="ts">
const route = useRoute()
const api = useApi()
const authStore = useAuthStore()

const appName = "Endfield"
type MenuItem = { name?: string; path?: string }
type MenuCache = { items: MenuItem[]; loaded: boolean; loading: boolean }
const menuCache = useState<MenuCache>("menu-label-cache", () => ({ items: [], loaded: false, loading: false }))

const toTitleCase = (value: string) => {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const loadMenuLabels = async () => {
  if (menuCache.value.loaded || menuCache.value.loading) return
  if (!authStore.isSuperAdmin) {
    const sr = authStore.getSelectRespo() as any
    if (!sr) return
    menuCache.value.items = Array.isArray(sr.menus) ? sr.menus : []
    menuCache.value.loaded = true
    menuCache.value.loading = false
    return
  }

  menuCache.value.loading = true
  try {
    const response = await api.get("/api/dynamic/m_menu?no_pagination=true")
    if (response?.status === "success" && Array.isArray(response.data)) {
      menuCache.value.items = response.data
      menuCache.value.loaded = true
    }
  } catch (error) {
    // Silent fail, fallback labels will handle
  } finally {
    menuCache.value.loading = false
  }
}

onMounted(loadMenuLabels)

watch(() => authStore.selectRespo, (newVal, oldVal) => {
  if (!newVal) return
  if (newVal !== oldVal) {
    menuCache.value.items = []
    menuCache.value.loaded = false
    menuCache.value.loading = false
    loadMenuLabels()
  }
})

const pageLabel = computed(() => {
  if (route.path.startsWith("/dashboard")) {
    return "Dashboard"
  }

  const matched = menuCache.value.items.find(
    (item) => item.path && (route.path === item.path || route.path.startsWith(item.path + "/"))
  )
  if (matched?.name) {
    return matched.name
  }

  if (route.path.startsWith("/setup/menu")) {
    return "Menu"
  }

  const lastSegment = route.path.split("/").filter(Boolean).pop()
  return lastSegment ? toTitleCase(lastSegment) : "Page"
})

useHead(() => ({
  title: `${appName} - ${pageLabel.value}`,
}))

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 60_000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const dateLabel = computed(() => {
  const d = now.value
  const day = HARI[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${day}, ${dd}/${mm}/${yyyy}`
})

const greeting = computed(() => {
  const h = now.value.getHours()
  if (h < 11) return 'Selamat Pagi'
  if (h < 15) return 'Selamat Siang'
  if (h < 18) return 'Selamat Sore'
  return 'Selamat Malam'
})

const userName = computed(() => {
  const u = authStore.user as Record<string, any> | null
  return u?.name || u?.username || 'User'
})
</script>

<template>
  <SidebarProvider>
    <AppSidebar />

    <SidebarInset class="overflow-hidden">
      <header class="bg-sidebar text-sidebar-foreground sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator
            orientation="vertical"
            class="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem class="hidden md:block">
                <BreadcrumbLink href="/">
                  {{ appName }}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{{ pageLabel }}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div class="ml-auto flex items-center gap-2 px-4">
          <ThemeColorToggle />
          <ThemeToggle />
          <RespoSwitcher />
          <Separator orientation="vertical" class="mx-1 data-[orientation=vertical]:h-8" />
          <div class="hidden sm:flex flex-col items-end text-right leading-tight max-w-48 lg:max-w-64">
            <span class="text-xs text-muted-foreground">{{ dateLabel }}</span>
            <span class="truncate w-full text-right text-sm font-medium">{{ greeting }}, {{ userName }}</span>
          </div>
        </div>
      </header>

      <div class="app-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
