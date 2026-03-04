<script setup>
import { toast } from 'vue-sonner'

definePageMeta({
  layout: false
})

useHead({
  title: 'Login'
})

const router = useRouter()
const authStore = useAuthStore()
const config = useRuntimeConfig()

const form = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = 'Username dan password harus diisi'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Login dengan credentials: 'include' agar browser menerima httpOnly cookie dari backend
    const response = await $fetch(`${config.public.baseUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: {
        username: form.value.username,
        password: form.value.password
      }
    })

    if (response.status === 'success') {
      // Simpan token di memory (httpOnly cookie sudah di-set oleh backend)
      authStore.setSession({
        token: response.token,
        user: response.data?.user ?? null
      })

      // Fetch user default data dengan credentials: 'include'
      const userId = response.data?.user?.id
      if (userId) {
        try {
          const userDefault = await $fetch(
            `${config.public.baseUrl}/api/dynamic/user_default/${userId}?join=subhead%2Cdetail%2Csub`,
            {
              method: 'GET',
              credentials: 'include',
              headers: {
                Authorization: `Bearer ${response.token}`
              }
            }
          )

          if (userDefault?.status === 'success') {
            authStore.setUserDefault(userDefault.data ?? null)
          }
        } catch (fetchError) {
          console.error('Failed to fetch user default data:', fetchError)
        }
      }

      toast.success('Login berhasil!')
      router.push('/')
    } else {
      error.value = response.message || 'Login gagal'
      toast.error(error.value)
    }
  } catch (err) {
    error.value = err.data?.message || err.message || 'Terjadi kesalahan saat login'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>
    <Card class="w-full max-w-md">
      <CardHeader class="text-center">
        <img
          src="/logo.webp"
          alt="Endfield"
          class="mx-auto h-12 w-auto mb-3"
        />
        <CardTitle class="text-2xl">Login</CardTitle>
        <CardDescription>Masukkan username dan password untuk melanjutkan</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <Label for="username">Username</Label>
            <Input
              id="username"
              v-model="form.username"
              placeholder="Masukkan username"
              required
            />
          </div>
          
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Masukkan password"
              required
            />
          </div>

          <p v-if="error" class="text-sm text-destructive">
            {{ error }}
          </p>

          <Button 
            type="submit" 
            class="w-full" 
            :disabled="loading"
          >
            <span v-if="loading">Loading...</span>
            <span v-else>Login</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
