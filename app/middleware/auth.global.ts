export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()
  const isBuilderRoute = to.path === '/builder' || to.path.startsWith('/builder_file/')

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

  // Client-side: restore data dari sessionStorage setelah SSR hydration
  // SSR tidak bisa akses sessionStorage, jadi userDefault & selectRespo bisa null setelah hydration
  if (import.meta.client && authStore.sessionVerified && !authStore.selectRespo) {
    authStore.restoreClientSession()
  }

  // Ensure selectRespo is initialized before menu-based guard checks.
  if (!authStore.isSuperAdmin && authStore.userDefault && !authStore.selectRespo) {
    authStore.initializeSelectRespo()
  }

  if (!authStore.isLoggedIn && !isPublicPage) {
    // Belum login & bukan halaman publik → redirect ke login
    return navigateTo('/login', { replace: true })
  }

  if (authStore.isLoggedIn && isPublicPage) {
    // Sudah login & akses halaman publik (login) → redirect ke home
    return navigateTo('/', { replace: true })
  }

  // ============================================================================
  // ROUTE GUARD — Cek apakah user punya akses ke halaman ini
  // Super admin bisa akses semua. Non-super-admin hanya bisa akses menu yang ada di respo-nya.
  // ============================================================================
  if (authStore.isLoggedIn && !isPublicPage && !authStore.isSuperAdmin) {
    const alwaysAllowed = ['/', '/dashboard', '/notifikasi']
    const currentPath = to.path

    // Skip guard untuk halaman yang selalu boleh diakses
    if (!(isBuilderRoute || alwaysAllowed.some(p => currentPath === p))) {
      let sr = authStore.getSelectRespo() as any
      if (!sr && authStore.userDefault) {
        authStore.initializeSelectRespo()
        sr = authStore.getSelectRespo() as any
      }

      if (!sr) {
        return navigateTo('/dashboard', { replace: true })
      }

      const srAny = sr as any
      const menuPaths: string[] = srAny?.menus?.map((m: any) => m.path)?.filter(Boolean) || []

      // Cek apakah current path match dengan salah satu menu path
      const hasAccess = menuPaths.some((menuPath: string) => {
        const normalized = menuPath.startsWith('/') ? menuPath : `/${menuPath}`
        return currentPath === normalized || currentPath.startsWith(normalized + '/')
      })

      if (!hasAccess) {
        return navigateTo('/dashboard', { replace: true })
      }
    }
  }
})
