<script setup lang="ts">
import {
  Command,
  Bell,
  LayoutDashboard,
  Logs,
} from "lucide-vue-next"
import * as LucideIcons from "lucide-vue-next"

const props = withDefaults(defineProps<{
  variant?: "inset" | "sidebar" | "floating"
  side?: "left" | "right"
  collapsible?: "none" | "icon" | "offcanvas"
}>(), {
  variant: "inset",
  side: "left",
  collapsible: "offcanvas",
})

const authStore = useAuthStore()
const route = useRoute()
const searchQuery = ref("")
type MenuCache = { items: any[]; loaded: boolean; loading: boolean }
const menuCache = useState<MenuCache>("menu-cache", () => ({ items: [], loaded: false, loading: false }))
const loading = computed(() => !menuCache.value.loaded)

type NavItem = {
  title: string
  url: string
  icon: any
  isActive?: boolean
  items?: NavItem[]
}

// Helper function to get icon component from string name
const getIconComponent = (iconName: string) => {
  if (!iconName) return LucideIcons.FileText
  const icon = (LucideIcons as any)[iconName]
  return icon || LucideIcons.FileText
}

// Helper function to get module icon
const getModuleIcon = (moduleName: string): any => {
  const iconMap: Record<string, any> = {
    'SETUP': LucideIcons.Settings,
    'PURCHASING': LucideIcons.ShoppingCart,
    'MARKETING': LucideIcons.Megaphone,
    'INVENTORY': LucideIcons.Package,
    'DEV': LucideIcons.Code2,
    'PRODUCTION': LucideIcons.Factory,
    'SALES': LucideIcons.TrendingUp,
    'FINANCE': LucideIcons.DollarSign,
    'HR': LucideIcons.Users,
    'LOGISTICS': LucideIcons.Truck,
  }
  
  return iconMap[moduleName.toUpperCase()] || LucideIcons.Box
}

const resetMenuCache = () => {
  menuCache.value.items = []
  menuCache.value.loaded = false
  menuCache.value.loading = false
}

const inferSubModulFromPath = (path: string) => {
  const segments = String(path || '')
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)

  if (segments.length < 3) return ''

  const candidate = segments[1]
  if (!candidate || candidate.startsWith('m_') || candidate.startsWith('t_')) {
    return ''
  }

  return candidate.replace(/[-_]+/g, ' ').toUpperCase()
}

const normalizeMenuItem = (menu: any) => ({
  ...menu,
  sub_modul: menu?.sub_modul?.trim?.() || inferSubModulFromPath(menu?.path) || null,
})

const hasStaleSubModulCache = (menus: any[] = []) => {
  return menus.some((menu: any) => !menu?.sub_modul && !!inferSubModulFromPath(menu?.path))
}

// Load menus from cache source (role-based or API)
const loadMenus = async (force = false) => {
  if (!force && menuCache.value.loading) return
  if (!force && menuCache.value.loaded && !hasStaleSubModulCache(menuCache.value.items)) return

  // Non-super-admin menus come from selectRespo; if not ready yet, wait.
  if (!authStore.isSuperAdmin) {
    let sr = authStore.getSelectRespo() as any
    if (!sr) return

    if ((!Array.isArray(sr.menus) || sr.menus.length === 0) && authStore.userDefault) {
      authStore.initializeSelectRespo()
      sr = authStore.getSelectRespo() as any
    }

    menuCache.value.items = Array.isArray(sr.menus) ? sr.menus.map(normalizeMenuItem) : []
    menuCache.value.loaded = true
    menuCache.value.loading = false
    logSidebarMenus('selectRespo', menuCache.value.items)
    return
  }

  menuCache.value.loading = true
  try {
    const api = useApi()
    const response = await api.get('/api/dynamic/m_menu?no_pagination=true')
    if (response.status === 'success' && Array.isArray(response.data)) {
      menuCache.value.items = response.data.map(normalizeMenuItem)
      menuCache.value.loaded = true
      logSidebarMenus('super-admin-api', menuCache.value.items)
    }
  } catch (error) {
    console.error('Failed to load menus:', error)
  } finally {
    menuCache.value.loading = false
  }
}

const dynamicMenus = computed(() => {
  return menuCache.value.items
    .filter((m: any) => m.is_active)
    .sort((a: any, b: any) => {
      const seqA = a.seq.split('.').map((n: string) => parseInt(n) || 0)
      const seqB = b.seq.split('.').map((n: string) => parseInt(n) || 0)
      for (let i = 0; i < Math.max(seqA.length, seqB.length); i++) {
        const partA = seqA[i] || 0
        const partB = seqB[i] || 0
        if (partA !== partB) {
          return partA - partB
        }
      }
      return 0
    })
})

const normalizePath = (value: string) => {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash.replace(/\/+$/, '')
}

const getRawSubModul = (menu: any) => menu?.sub_modul?.trim?.() || inferSubModulFromPath(menu?.path)

const logSidebarMenus = (source: string, menus: any[]) => {
  if (!import.meta.client) return

  const sample = (menus || []).slice(0, 20).map((menu: any) => ({
    name: menu?.name,
    path: menu?.path,
    modul: menu?.modul,
    rawSubModul: menu?.sub_modul ?? null,
    seq: menu?.seq,
    is_active: menu?.is_active,
  }))

  const groupedSummary = (menus || []).reduce((acc: Record<string, number>, menu: any) => {
    const modul = String(menu?.modul || 'OTHER').trim() || 'OTHER'
    const subModul = getRawSubModul(menu) || '_root'
    const key = `${modul} > ${subModul}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  console.log('[DEBUG-SIDEBAR] source=', source)
  console.log('[DEBUG-SIDEBAR] groupedSummary=', groupedSummary)
  console.table(sample)
}

// Check if a menu item should be active
// Checks both direct path match and route meta.parentMenu for related routes
const isMenuItemActive = (itemPath: string, itemName?: string): boolean => {
  const current = normalizePath(route.path)
  const target = normalizePath(itemPath)
  if (!current || !target) return false

  const pathMatch = current === target || current.startsWith(target + '/')

  // Also check if current route has parentMenu meta that matches this item
  const parentMenuMeta = ((route.meta?.parentMenu as string) || '').trim()
  const parentMatch = !!itemName && !!parentMenuMeta && parentMenuMeta.toLowerCase() === itemName.toLowerCase()

  return pathMatch || parentMatch
}

// Build hierarchical menu structure from flat dynamic menus
const buildMenuStructure = computed(() => {
  // Group by modul
  const modulesMap = new Map<string, any[]>()
  
  dynamicMenus.value.forEach((menu: any) => {
    const modul = menu.modul || 'OTHER'
    if (!modulesMap.has(modul)) {
      modulesMap.set(modul, [])
    }
    modulesMap.get(modul)!.push(menu)
  })

  const result: NavItem[] = []

  // Build menu items per module
  modulesMap.forEach((menus, modulName) => {
    // Group by sub_modul within each modul
    const subModulMap = new Map<string, any[]>()
    
    menus.forEach(menu => {
      const subModul = getRawSubModul(menu) || '_root'
      if (!subModulMap.has(subModul)) {
        subModulMap.set(subModul, [])
      }
      subModulMap.get(subModul)!.push(menu)
    })

    const moduleItems: NavItem[] = []

    subModulMap.forEach((items, subModul) => {
      if (subModul === '_root' || subModul === '') {
        // No sub-modul, add directly
        items.forEach(item => {
          moduleItems.push({
            title: item.name,
            url: item.path,
            icon: getIconComponent(item.icon?.trim()),
            isActive: isMenuItemActive(item.path, item.name),
          })
        })
      } else {
        // Has sub-modul, create nested structure
        moduleItems.push({
          title: subModul,
          url: '#',
          icon: LucideIcons.Folder,
          isActive: items.some((i: any) => isMenuItemActive(i.path, i.name)),
          items: items.map(item => ({
            title: item.name,
            url: item.path,
            icon: getIconComponent(item.icon?.trim()),
            isActive: isMenuItemActive(item.path, item.name),
          }))
        })
      }
    })

    if (modulName === 'SETUP' && authStore.isSuperAdmin) {
      moduleItems.unshift({
        title: 'Menu',
        url: '/setup/menu',
        icon: Logs,
        isActive: isMenuItemActive('/setup/menu', 'Menu'),
      })
    }

    result.push({
      title: modulName,
      url: '#',
      icon: getModuleIcon(modulName),
      isActive: moduleItems.some(i => i.isActive || (i.items && i.items.some(sub => sub.isActive))),
      items: moduleItems,
    })
  })

  return result
})

// All menu items for search (flattened)
const allMenuItems = computed(() => {
  const items: any[] = []
  
  // Check if user has SETUP access
  const hasSetupAccess = authStore.isSuperAdmin || dynamicMenus.value.some(m => m.modul === 'SETUP')

  // Add all dynamic menus flattened
  dynamicMenus.value.forEach(menu => {
    const rawSubModul = getRawSubModul(menu)
    items.push({
      title: menu.name,
      url: menu.path,
      icon: getIconComponent(menu.icon?.trim()),
      parent: rawSubModul ? `${menu.modul} > ${rawSubModul}` : menu.modul
    })
  })

  // Add static SETUP menu only if user has SETUP access
  if (hasSetupAccess && authStore.isSuperAdmin) {
    items.push({
      title: 'Menu',
      url: '/setup/menu',
      icon: Logs,
      parent: 'SETUP'
    })
  }

  return items
})

const filteredMenuItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return allMenuItems.value
  }

  const query = searchQuery.value.toLowerCase()
  return allMenuItems.value.filter((item: any) =>
    item.title.toLowerCase().includes(query) ||
    (item.parent && item.parent.toLowerCase().includes(query))
  )
})

const data = computed(() => {
  const u = authStore.user as Record<string, any> | null
  return {
    user: {
      name: u?.username ?? "User",
      email: u?.email ?? "",
      avatar: "",
    },
    navMain: searchQuery.value.trim()
      ? (() => {
          // Group filtered items by their parent (Module > SubModule)
          const grouped: Record<string, any[]> = {}
          
          const query = searchQuery.value.toLowerCase()
          const matchedItems = filteredMenuItems.value.filter((item: any) => 
            item.title.toLowerCase().includes(query)
          )
          
          matchedItems.forEach((item: any) => {
            const parentKey = item.parent || 'OTHER'
            if (!grouped[parentKey]) {
              grouped[parentKey] = []
            }
            grouped[parentKey].push({
              title: item.title,
              url: item.url,
              icon: item.icon,
              isActive: isMenuItemActive(item.url, item.title),
            })
          })
          
          // Convert grouped to menu structure — merge same modules
          const moduleMap: Record<string, NavItem> = {}
          
          Object.entries(grouped).forEach(([parent, items]) => {
            const parts = parent.split(' > ')
            const moduleName = parts[0] || 'OTHER'
            const subModuleName = parts[1]
            
            if (!moduleMap[moduleName]) {
              moduleMap[moduleName] = {
                title: moduleName,
                url: '#',
                icon: getModuleIcon(moduleName),
                isActive: false,
                items: []
              }
            }
            
            if (subModuleName) {
              // Check if submodule already exists
              let subModule = moduleMap[moduleName].items!.find((s: NavItem) => s.title === subModuleName)
              if (!subModule) {
                subModule = {
                  title: subModuleName,
                  url: '#',
                  icon: LucideIcons.FolderOpen,
                  isActive: false,
                  items: []
                } as NavItem
                moduleMap[moduleName].items!.push(subModule)
              }
              subModule.items!.push(...items)
              subModule.isActive = subModule.items!.some((i: NavItem) => i.isActive)
            } else {
              moduleMap[moduleName].items!.push(...items)
            }
            
            moduleMap[moduleName].isActive = moduleMap[moduleName].items!.some((i: NavItem) => i.isActive)
          })
          
          return Object.values(moduleMap)
        })()
      : buildMenuStructure.value,
    navSecondary: [],
  }
})

// Reload menus whenever selected responsibility changes or gets restored.
watch(() => authStore.selectRespo, (newVal, oldVal) => {
  if (!newVal) return
  if (newVal !== oldVal) {
    resetMenuCache()
    loadMenus(true)
  }
})

// Load menus on mount + listen for respo changes (TeamSwitcher)
const handleRespoChanged = () => {
  // Force reload menus after explicit respo switch event.
  resetMenuCache()
  loadMenus(true)
}

const handleMenuUpdated = () => {
  if (!authStore.isSuperAdmin) return

  resetMenuCache()
  loadMenus(true)
}

onMounted(() => {
  loadMenus()
  if (import.meta.client) {
    window.addEventListener('respoChanged', handleRespoChanged)
    window.addEventListener('menuUpdated', handleMenuUpdated)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('respoChanged', handleRespoChanged)
    window.removeEventListener('menuUpdated', handleMenuUpdated)
  }
})
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <NuxtLink to="/" class="flex items-center gap-2">
              <div class="flex items-center justify-center rounded-lg bg-sidebar-primary dark:bg-sidebar-primary/20 aspect-square size-8">
                <img src="/logo.webp" alt="MVG" class="h-5 w-5" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">Endfield</span>
                <span class="truncate text-xs text-muted-foreground">ERP System</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <div class="px-2 pt-2">
        <SidebarInput v-model="searchQuery" placeholder="Search menu..." />
      </div>
    </SidebarHeader>
    <SidebarContent>
      <!-- Loading State -->
      <div v-if="loading" class="px-3 space-y-2">
        <div class="space-y-1">
          <div class="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div class="h-9 w-full bg-gray-200 rounded animate-pulse"></div>
          <div class="h-9 w-full bg-gray-200 rounded animate-pulse"></div>
          <div class="h-9 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      <!-- Actual Menu -->
      <template v-else>
        <!-- Static Menu Items (No Label) -->
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton :tooltip="'Notifikasi'" :is-active="route.path === '/notifikasi'" as-child>
                <NuxtLink to="/notifikasi" class="flex items-center gap-2">
                  <Bell class="h-4 w-4 shrink-0" />
                  <span>Notifikasi</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton :tooltip="'Dashboard'" :is-active="route.path === '/dashboard' || route.path === '/'" as-child>
                <NuxtLink to="/dashboard" class="flex items-center gap-2">
                  <LayoutDashboard class="h-4 w-4 shrink-0" />
                  <span>Dashboard</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        
        <!-- Dynamic Menu -->
        <NavMain class="-mt-3" :items="data.navMain" />
        <NavSecondary :items="data.navSecondary" class="mt-auto" />
      </template>
    </SidebarContent>
    <SidebarFooter>
      <NavUser :user="data.user" />
    </SidebarFooter>
  </Sidebar>
</template>
