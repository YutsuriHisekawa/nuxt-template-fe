import { defineStore } from 'pinia'

// ============================================================================
// SESSION PERSISTENCE (sessionStorage)
// Sama seperti fe-mvg-vue: simpan auth state agar survive page refresh
// sessionStorage otomatis hilang saat tab/browser ditutup (lebih aman)
// ============================================================================
const SESSION_KEY = '_auth_session'
const USER_DEFAULT_INCLUDE_QUERY = 'include=user_detail%3Em_respo%3Em_unit_bisnis%2Cuser_detail%3Em_respo%3Em_respo_d%3Em_role%3Em_role_d%3Em_menu%2Cm_general%2Cm_approval_d%3Em_general%2Cm_approval_d%3Em_approval%3Em_menu&no_pagination=true'

function saveSessionField(field, value) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    parsed[field] = value
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed))
  } catch {}
}

function getSessionData() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function clearSessionStorage() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}

function inferSubModulFromPath(path) {
  const segments = String(path || '')
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)

  if (segments.length < 3) return null

  const candidate = segments[1]
  if (!candidate || candidate.startsWith('m_') || candidate.startsWith('t_')) {
    return null
  }

  return candidate.replace(/[-_]+/g, ' ').toUpperCase()
}

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.baseUrl

  // ============================================================================
  // STATE
  // Token disimpan di same-domain cookie (useCookie) supaya survive refresh & SSR.
  // httpOnly cookie dari backend tetap dipakai sebagai primary auth,
  // tapi token di cookie Nuxt jadi fallback Authorization header saat SSR
  // (karena cross-origin httpOnly cookie tidak bisa di-forward saat SSR).
  // ============================================================================
  const tokenCookie = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 }) // 7 hari
  const token = ref(tokenCookie.value || null)       // init dari cookie (survive refresh)
  const user = ref(null)           // user data di memory
  const userDefault = ref(null)    // user default data di memory
  const selectRespo = ref(null)    // selectRespo: menus + permissions dari role user
  const sessionVerified = ref(false) // apakah sudah verify session ke backend
  const loggedOut = ref(false)     // flag: user baru saja logout (cegah re-verify via stale cookie)

  // Menu caches — harus di-init di scope setup agar useState punya akses Nuxt instance
  const sidebarMenuCache = useState('menu-cache', () => ({ items: [], loaded: false, loading: false }))
  const menuLabelCache = useState('menu-label-cache', () => ({ items: [], loaded: false, loading: false }))

  const isLoggedIn = computed(() => !!token.value)

  // Check if user is SUPER ADMIN (sama seperti fe-mvg-vue)
  const isSuperAdmin = computed(() => {
    const ud = userDefault.value
    if (!ud || !ud.tipe) return false
    return ud.tipe.value1?.toUpperCase() === 'SUPER ADMIN'
  })

  /**
   * Set session setelah login sukses
   * Token disimpan di memory sebagai fallback untuk Authorization header
   * httpOnly cookie sudah di-set otomatis oleh backend
   */
  function setSession({ token: newToken, user: newUser }) {
    token.value = newToken
    tokenCookie.value = newToken  // persist di same-domain cookie (survive refresh/SSR)
    user.value = newUser
    sessionVerified.value = true
    loggedOut.value = false
    // Persist user ke sessionStorage (tanpa password)
    if (newUser) {
      const userCopy = { ...newUser }
      delete userCopy.password
      saveSessionField('user', userCopy)
    }
  }

  function setUserDefault(data) {
    userDefault.value = data
    // Persist ke sessionStorage (tanpa password)
    if (data) {
      const copy = { ...data }
      delete copy.password
      saveSessionField('userDefault', copy)
    } else {
      saveSessionField('userDefault', null)
    }
    // Build selectRespo (menus + permissions) dari userDefault
    initializeSelectRespo()
  }

  function hasMenuSubModulField(ud) {
    let foundMenu = false

    for (const detail of ud?.user_details || []) {
      for (const respoDetail of detail?.m_respo?.m_respo_ds || []) {
        for (const roleDetail of respoDetail?.m_role?.m_role_ds || []) {
          const menu = roleDetail?.m_menu
          if (!menu) continue

          foundMenu = true
          if (!Object.prototype.hasOwnProperty.call(menu, 'sub_modul')) {
            return false
          }
        }
      }
    }

    return foundMenu
  }

  function hasExpandedRoleData(ud) {
    return !!ud?.user_details?.some(
      d => Array.isArray(d?.m_respo?.m_respo_ds) && d.m_respo.m_respo_ds.length > 0
    )
  }

  function hasCompleteRoleMenuData(ud) {
    return hasExpandedRoleData(ud) && hasMenuSubModulField(ud)
  }

  async function refreshUserDefault(force = false) {
    const userId = user.value?.id
    if (!userId) return false

    if (!force && hasCompleteRoleMenuData(userDefault.value)) {
      return true
    }

    try {
      const headers = {}
      if (token.value) {
        headers['Authorization'] = `Bearer ${token.value}`
      }

      const resp = await $fetch(
        `${baseUrl}/api/dynamic/user_default/${userId}?${USER_DEFAULT_INCLUDE_QUERY}`,
        {
          method: 'GET',
          credentials: 'include',
          headers,
        }
      )

      if (resp?.status === 'success') {
        setUserDefault(resp.data ?? null)
        return true
      }
    } catch (err) {
      console.warn('Failed to refresh user default:', err)
    }

    return false
  }

  // ============================================================================
  // SELECT RESPO — Build menu list + permission map dari user's responsibility
  // Sama seperti fe-mvg-vue: super admin lihat semua menu (dari API),
  // user biasa hanya lihat menu sesuai role di responsibility-nya
  // ============================================================================
  function initializeSelectRespo(userDetailId) {
    const ud = userDefault.value
    if (!ud) return

    // Super admin: virtual selectRespo (menu dimuat dari API di sidebar)
    if (isSuperAdmin.value) {
      selectRespo.value = {
        respoId: 'super-admin-respo',
        respoName: 'SUPER ADMIN',
        isPrimary: true,
        companyId: null,
        companyName: 'MITRA VISUAL GROUP',
        menus: [],
        permissions: {}
      }
      saveSessionField('selectRespo', selectRespo.value)
      return
    }

    // Regular user: extract menus & permissions dari user_details → m_respo → m_respo_ds → m_role → m_role_ds
    // Jika userDetailId diberikan (dari TeamSwitcher), gunakan itu. Kalau tidak, coba dari saved session, lalu primary/firstActive.
    const savedRespo = selectRespo.value
    let target = null
    if (userDetailId) {
      target = ud.user_details?.find(d => d.id === userDetailId && d.is_active)
    }
    if (!target && savedRespo?.respoId) {
      target = ud.user_details?.find(d => d.id === savedRespo.respoId && d.is_active)
    }
    if (!target) {
      target = ud.user_details?.find(d => d.is_primary && d.is_active) || ud.user_details?.find(d => d.is_active)
    }
    if (!target?.m_respo) return

    const permissions = {}
    const menuMap = new Map()

    target.m_respo.m_respo_ds?.forEach(rd => {
      if (!rd.is_active || !rd.m_role?.is_active) return
      rd.m_role.m_role_ds?.forEach(rld => {
        const menuId = rld.m_menu_id
        // Store menu data
        if (rld.m_menu && !menuMap.has(menuId)) {
          const fallbackSubModul = inferSubModulFromPath(rld.m_menu.path)
          menuMap.set(menuId, {
            id: rld.m_menu.id,
            name: rld.m_menu.name,
            path: rld.m_menu.path,
            icon: rld.m_menu.icon,
            seq: rld.m_menu.seq,
            modul: rld.m_menu.modul,
            sub_modul: rld.m_menu.sub_modul ?? fallbackSubModul,
            is_active: rld.m_menu.is_active !== false
          })
        }
        // Merge permissions (ambil yang paling permissive)
        if (permissions[menuId]) {
          permissions[menuId].is_read = permissions[menuId].is_read || rld.is_read
          permissions[menuId].is_create = permissions[menuId].is_create || rld.is_create
          permissions[menuId].is_update = permissions[menuId].is_update || rld.is_update
          permissions[menuId].is_delete = permissions[menuId].is_delete || rld.is_delete
          permissions[menuId].is_print = permissions[menuId].is_print || rld.is_print
        } else {
          permissions[menuId] = {
            is_read: rld.is_read,
            is_create: rld.is_create,
            is_update: rld.is_update,
            is_delete: rld.is_delete,
            is_print: rld.is_print
          }
        }
      })
    })

    const nextSelectRespo = {
      respoId: target.id,
      respoName: target.m_respo.nama,
      isPrimary: target.is_primary,
      companyId: target.m_respo.unit_bisnis?.id || null,
      companyName: target.m_respo.unit_bisnis?.nama_comp || null,
      menus: Array.from(menuMap.values()),
      permissions
    }

    // Jangan overwrite selectRespo valid dengan payload kosong akibat session lama yang belum expanded.
    if (
      Array.isArray(nextSelectRespo.menus) &&
      nextSelectRespo.menus.length === 0 &&
      Array.isArray(selectRespo.value?.menus) &&
      selectRespo.value.menus.length > 0
    ) {
      return
    }

    selectRespo.value = nextSelectRespo
    saveSessionField('selectRespo', selectRespo.value)
  }

  function getSelectRespo() {
    return selectRespo.value
  }

  function setSelectRespo(data) {
    selectRespo.value = data
    saveSessionField('selectRespo', data)
  }

  /**
   * Verify session ke backend
   * Dipanggil saat page refresh untuk cek apakah httpOnly cookie masih valid
   * Backend juga return fresh token untuk disimpan di memory
   */
  async function verifySession(extraHeaders = {}) {
    try {
      const headers = { ...extraHeaders }
      // Kirim token dari memory sebagai fallback (kalau httpOnly cookie tidak ada)
      if (token.value) {
        headers['Authorization'] = `Bearer ${token.value}`
      }

      const data = await $fetch(`${baseUrl}/api/auth/verify`, {
        method: 'GET',
        headers,
        credentials: 'include', // kirim httpOnly cookie (client-side)
      })

      if (data.status === 'success') {
        // Simpan fresh token di memory + cookie
        if (data.token) {
          token.value = data.token
          tokenCookie.value = data.token
        }
        // Restore minimal user info dari verify response
        user.value = {
          id: data.data.userId,
          username: data.data.username,
          name: data.data.name,
          ...user.value, // keep existing data if any
          // override with fresh data
          id: data.data.userId,
          username: data.data.username,
          name: data.data.name,
        }
        sessionVerified.value = true

        // Restore userDefault dari sessionStorage (survive page refresh)
        const session = getSessionData()
        if (session?.userDefault && !userDefault.value) {
          userDefault.value = session.userDefault
        }
        if (session?.user && !user.value?.tipe) {
          // Restore full user data jika verify hanya return minimal
          user.value = { ...session.user, ...user.value }
        }
        // Restore selectRespo dari sessionStorage
        if (session?.selectRespo && !selectRespo.value) {
          selectRespo.value = session.selectRespo
        }

        // Jika userDefault dari session lama (join lama) belum bawa role detail,
        // re-fetch user_default expanded agar menu respo tidak kosong.
        if (!isSuperAdmin.value && !hasCompleteRoleMenuData(userDefault.value)) {
          await refreshUserDefault(true)
        }

        // Pastikan selectRespo terbentuk dari data terbaru.
        if (
          !isSuperAdmin.value && (
            !selectRespo.value ||
            !Array.isArray(selectRespo.value.menus) ||
            selectRespo.value.menus.some(menu => !Object.prototype.hasOwnProperty.call(menu || {}, 'sub_modul'))
          )
        ) {
          initializeSelectRespo()
        }

        return true
      }
      return false
    } catch {
      // Token expired atau invalid
      clearSession()
      return false
    }
  }

  /**
   * Logout — clear httpOnly cookie di backend + clear memory
   */
  async function logout() {
    // Clear memory state FIRST (prevents re-verify via middleware)
    clearSession()
    try {
      await $fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (e) {
      console.warn('Logout API call failed (cookie mungkin belum di-clear oleh backend):', e)
    }
  }

  /**
   * Restore data dari sessionStorage di client-side
   * Diperlukan karena SSR tidak bisa akses sessionStorage,
   * sehingga setelah hydration data perlu di-restore manual
   */
  function restoreClientSession() {
    const session = getSessionData()
    if (!session) return
    if (session.userDefault && !userDefault.value) {
      userDefault.value = session.userDefault
    }
    if (session.user) {
      user.value = { ...session.user, ...(user.value || {}) }
    }
    if (session.selectRespo && !selectRespo.value) {
      selectRespo.value = session.selectRespo
    }
  }

  function clearMenuCaches() {
    sidebarMenuCache.value = {
      items: [],
      loaded: false,
      loading: false,
    }
    menuLabelCache.value = {
      items: [],
      loaded: false,
      loading: false,
    }
  }

  /**
   * Clear semua session data di memory
   */
  function clearSession() {
    token.value = null
    tokenCookie.value = null     // hapus cookie
    user.value = null
    userDefault.value = null
    selectRespo.value = null
    sessionVerified.value = false
    loggedOut.value = true
    clearMenuCaches()
    clearSessionStorage()
  }

  return {
    token,
    user,
    userDefault,
    isLoggedIn,
    isSuperAdmin,
    selectRespo,
    sessionVerified,
    loggedOut,
    setSession,
    setUserDefault,
    refreshUserDefault,
    initializeSelectRespo,
    getSelectRespo,
    setSelectRespo,
    restoreClientSession,
    verifySession,
    logout,
    clearSession
  }
})
