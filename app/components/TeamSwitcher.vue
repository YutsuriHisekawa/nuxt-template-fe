<script setup lang="js">
import { ChevronsUpDown, Check } from 'lucide-vue-next'
import { useSidebar } from '@/components/ui/sidebar'

const authStore = useAuthStore()
const { isMobile, state } = useSidebar()
const isHydrated = ref(false)

const isCollapsed = computed(() => state.value === 'collapsed')

// List of respos from userDefault.user_details
const respos = computed(() => {
  if (authStore.isSuperAdmin) {
    return [{
      id: 'super-admin-respo',
      name: 'SUPER ADMIN',
      companyName: 'MITRA VISUAL GROUP',
      isPrimary: true,
    }]
  }

  const ud = authStore.userDefault
  if (!ud?.user_details) return []

  return ud.user_details
    .filter(d => d.is_active)
    .map(detail => ({
      id: detail.id,
      name: detail.m_respo?.nama || 'Unknown',
      companyName: detail.m_respo?.unit_bisnis?.nama_comp || 'No Company',
      isPrimary: detail.is_primary,
    }))
})

// Active respo (based on selectRespo in store)
const activeRespo = computed(() => {
  const sr = authStore.getSelectRespo()
  // Try to find in the full respos list first
  if (sr) {
    const found = respos.value.find(r => r.id === sr.respoId)
    if (found) return found
    // Fallback: use selectRespo data directly (e.g. during refresh before userDefault loads)
    return {
      id: sr.respoId,
      name: sr.respoName,
      companyName: sr.companyName || sr.respoName,
      isPrimary: sr.isPrimary,
    }
  }
  return respos.value[0] || null
})

// Keep SSR and first client render consistent to avoid hydration mismatch.
const canSwitch = computed(() => isHydrated.value && respos.value.length > 1)

const displayCompanyName = computed(() => {
  if (!isHydrated.value) return 'Loading...'
  return activeRespo.value?.companyName || 'Loading...'
})

const displayRespoName = computed(() => {
  if (!isHydrated.value) return ''
  return activeRespo.value?.name || ''
})

// Switch respo
function switchRespo(respo) {
  if (respo.id === activeRespo.value?.id) return

  // Re-initialize selectRespo with the chosen userDetailId
  authStore.initializeSelectRespo(respo.id)

  // Reset menu cache so sidebar reloads menus
  const menuCache = useState('menu-cache')
  if (menuCache.value) {
    menuCache.value.items = []
    menuCache.value.loaded = false
    menuCache.value.loading = false
  }

  // Dispatch event for other components
  window.dispatchEvent(new CustomEvent('respoChanged', { detail: respo.id }))
}

onMounted(() => {
  isHydrated.value = true
})
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <!-- If can switch: show dropdown -->
      <DropdownMenu v-if="canSwitch">
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            :class="isCollapsed ? 'justify-center px-0' : ''"
          >
            <div :class="[
              'flex items-center justify-center rounded-lg bg-sidebar-primary dark:bg-sidebar-primary/20',
              isCollapsed ? 'size-8' : 'aspect-square size-8'
            ]">
              <img src="/logo.webp" alt="MVG" class="h-5 w-5" />
            </div>
            <div v-show="!isCollapsed" class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">
                {{ displayCompanyName }}
              </span>
              <span class="truncate text-xs text-muted-foreground">{{ displayRespoName }}</span>
            </div>
            <ChevronsUpDown v-show="!isCollapsed" class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="4"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground px-2 py-1.5">
            Responsibility
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="(respo, index) in respos"
            :key="respo.id"
            class="px-3 py-2 cursor-pointer flex-col items-start"
            :class="activeRespo?.id === respo.id ? 'bg-primary/10' : ''"
            @click="switchRespo(respo)"
          >
            <div class="flex w-full items-center justify-between">
              <span :class="activeRespo?.id === respo.id ? 'font-semibold' : ''">{{ respo.companyName }}</span>
              <Check v-if="activeRespo?.id === respo.id" class="size-4 text-primary" />
              <DropdownMenuShortcut v-else>⌘{{ index + 1 }}</DropdownMenuShortcut>
            </div>
            <span class="text-xs text-muted-foreground">{{ respo.name }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- If only 1 respo: just show info, no dropdown -->
      <SidebarMenuButton v-else size="lg" as-child>
        <NuxtLink to="/">
          <div :class="[
            'flex items-center justify-center rounded-lg bg-sidebar-primary dark:bg-sidebar-primary/20',
            isCollapsed ? 'size-8' : 'aspect-square size-8'
          ]">
            <img src="/logo.webp" alt="MVG" class="h-5 w-5" />
          </div>
          <div v-show="!isCollapsed" class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-semibold">
              {{ displayCompanyName }}
            </span>
            <span class="truncate text-xs text-muted-foreground">{{ displayRespoName }}</span>
          </div>
        </NuxtLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
