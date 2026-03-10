<script setup lang="js">
import { Building2, Check } from 'lucide-vue-next'

const authStore = useAuthStore()
const open = ref(false)

const getUserDetails = () => {
  for (const src of [authStore.userDefault, authStore.user]) {
    if (Array.isArray(src?.user_details)) return src.user_details
    if (Array.isArray(src?.user_detail)) return src.user_detail
  }
  return []
}

const userDetails = computed(() =>
  getUserDetails().filter(d => d?.is_active && d?.m_respo)
)

const respos = computed(() => {
  if (authStore.isSuperAdmin) {
    return [{
      id: 'super-admin-respo',
      name: 'SUPER ADMIN',
      companyName: 'MITRA VISUAL GROUP',
      isPrimary: true,
    }]
  }
  return userDetails.value.map(d => ({
    id: d.id,
    name: d.m_respo?.nama || 'Unknown',
    companyName: d.m_respo?.unit_bisnis?.nama_comp || 'No Company',
    isPrimary: d.is_primary,
  }))
})

const activeRespo = computed(() => {
  const sr = authStore.getSelectRespo()
  if (sr) {
    const found = respos.value.find(r => r.id === sr.respoId)
    if (found) return found
    return {
      id: sr.respoId,
      name: sr.respoName,
      companyName: sr.companyName || sr.respoName,
      isPrimary: sr.isPrimary,
    }
  }
  return respos.value[0] || null
})

async function switchRespo(respo) {
  if (respo.id === activeRespo.value?.id) {
    open.value = false
    return
  }

  authStore.initializeSelectRespo(respo.id)

  // Reset sidebar menu cache
  const menuCache = useState('menu-cache')
  if (menuCache.value) {
    menuCache.value.items = []
    menuCache.value.loaded = false
    menuCache.value.loading = false
  }

  // Reset layout menu-label cache
  const labelCache = useState('menu-label-cache')
  if (labelCache.value) {
    labelCache.value.items = []
    labelCache.value.loaded = false
    labelCache.value.loading = false
  }

  window.dispatchEvent(new CustomEvent('respoChanged', { detail: respo.id }))

  open.value = false
  await navigateTo('/dashboard', { replace: true })
}

onMounted(async () => {
  if (!authStore.isSuperAdmin && userDetails.value.length === 0 && authStore.user?.id) {
    await authStore.refreshUserDefault(true)
  }
})
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <Dialog v-model:open="open">
        <TooltipTrigger as-child>
          <DialogTrigger as-child>
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background text-foreground shadow-xs transition hover:bg-accent"
              aria-label="Change Respo Access"
            >
              <Building2 class="h-5 w-5" />
            </button>
          </DialogTrigger>
        </TooltipTrigger>

      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Respo Access</DialogTitle>
          <DialogDescription>
            Pilih responsibility untuk mengatur akses menu dan data.
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col gap-2 py-2">
          <button
            v-for="respo in respos"
            :key="respo.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
            :class="activeRespo?.id === respo.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'"
            @click="switchRespo(respo)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <Building2 class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate font-medium text-sm" :class="activeRespo?.id === respo.id ? 'text-primary' : ''">
                {{ respo.companyName }}
              </p>
              <p class="truncate text-xs text-muted-foreground">{{ respo.name }}</p>
            </div>
            <Check v-if="activeRespo?.id === respo.id" class="h-5 w-5 shrink-0 text-primary" />
          </button>
        </div>
        </DialogContent>
      </Dialog>
      <TooltipContent>Change Respo Access</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
