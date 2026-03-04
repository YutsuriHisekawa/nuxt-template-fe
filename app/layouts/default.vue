<script setup lang="ts">
const route = useRoute()
const api = useApi()

const appName = "Endfield"
type MenuItem = { name?: string; path?: string }
type MenuCache = { items: MenuItem[]; loaded: boolean; loading: boolean }
const menuCache = useState<MenuCache>("menu-cache", () => ({ items: [], loaded: false, loading: false }))

const toTitleCase = (value: string) => {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const loadMenuLabels = async () => {
  if (menuCache.value.loaded || menuCache.value.loading) return
  menuCache.value.loading = true
  try {
    const response = await api.get("/api/dynamic/m_menu?no_pagination=true")
    if (response?.status === "success" && Array.isArray(response.data)) {
      menuCache.value.items = response.data
    }
  } catch (error) {
    // Silent fail, fallback labels will handle
  } finally {
    menuCache.value.loaded = true
    menuCache.value.loading = false
  }
}

onMounted(loadMenuLabels)

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
        </div>
      </header>

      <div class="app-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">

        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
