export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // Halaman yang boleh diakses tanpa login
  const publicPages = ['/login']
  const isPublicPage = publicPages.includes(to.path)

  // Kalau user baru saja logout, langsung redirect ke login (jangan re-verify)
  if (authStore.loggedOut && !isPublicPage) {
    return navigateTo('/login', { replace: true })
  }

  // Saat page refresh (session belum di-verify), cek httpOnly cookie via backend
  if (!authStore.sessionVerified && !isPublicPage) {
    // Saat SSR, browser cookie tidak otomatis dikirim oleh $fetch
    // Kita harus forward cookie dari incoming request secara manual
    const ssrHeaders = import.meta.server ? useRequestHeaders(['cookie']) : {}
    const isValid = await authStore.verifySession(ssrHeaders)
    if (!isValid) {
      return navigateTo('/login', { replace: true })
    }
  }

  if (!authStore.isLoggedIn && !isPublicPage) {
    // Belum login & bukan halaman publik → redirect ke login
    return navigateTo('/login', { replace: true })
  }

  if (authStore.isLoggedIn && isPublicPage) {
    // Sudah login & akses halaman publik (login) → redirect ke home
    return navigateTo('/', { replace: true })
  }
})
