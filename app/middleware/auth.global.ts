export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // Halaman yang boleh diakses tanpa login
  const publicPages = ['/login']
  const isPublicPage = publicPages.includes(to.path)

  // Saat page refresh (session belum di-verify), cek httpOnly cookie via backend
  if (!authStore.sessionVerified && !isPublicPage) {
    const isValid = await authStore.verifySession()
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
