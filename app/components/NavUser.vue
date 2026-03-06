<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'

const props = defineProps<{
  user: {
    name: string
    email: string
    avatar: string
  }
}>()

const authStore = useAuthStore()
const showLogoutDialog = ref(false)

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

async function logout() {
  await authStore.logout()
  toast.success('Logout berhasil')
  navigateTo('/login', { replace: true })
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <div class="flex items-center gap-2 px-2 py-2">
        <Avatar class="h-8 w-8 rounded-lg">
          <AvatarImage :src="user.avatar" :alt="user.name" />
          <AvatarFallback class="rounded-lg">
            {{ getInitials(user.name) }}
          </AvatarFallback>
        </Avatar>
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="truncate font-medium">{{ user.name }}</span>
          <span class="truncate text-xs text-muted-foreground">{{ user.email }}</span>
        </div>
        <button
          class="ml-auto inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Logout"
          @click="showLogoutDialog = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </SidebarMenuItem>
  </SidebarMenu>

  <AlertDialog :open="showLogoutDialog" @update:open="showLogoutDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Konfirmasi Logout</AlertDialogTitle>
        <AlertDialogDescription>
          Apakah Anda yakin ingin logout?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="showLogoutDialog = false">Batal</AlertDialogCancel>
        <AlertDialogAction @click="logout">Ya, Logout</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
