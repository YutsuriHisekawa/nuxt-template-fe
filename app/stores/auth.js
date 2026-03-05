import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.baseUrl

  // ============================================================================
  // STATE — semua data di MEMORY saja (bukan cookie/localStorage)
  // Token auth disimpan oleh backend sebagai httpOnly cookie (tidak bisa diakses JS)
  // ============================================================================
  const token = ref(null)          // token di memory (untuk Authorization header fallback)
  const user = ref(null)           // user data di memory
  const userDefault = ref(null)    // user default data di memory
  const sessionVerified = ref(false) // apakah sudah verify session ke backend
  const loggedOut = ref(false)     // flag: user baru saja logout (cegah re-verify via stale cookie)

  const isLoggedIn = computed(() => !!token.value)

  /**
   * Set session setelah login sukses
   * Token disimpan di memory sebagai fallback untuk Authorization header
   * httpOnly cookie sudah di-set otomatis oleh backend
   */
  function setSession({ token: newToken, user: newUser }) {
    token.value = newToken
    user.value = newUser
    sessionVerified.value = true
    loggedOut.value = false
  }

  function setUserDefault(data) {
    userDefault.value = data
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
        // Simpan fresh token di memory
        if (data.token) {
          token.value = data.token
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
   * Clear semua session data di memory
   */
  function clearSession() {
    token.value = null
    user.value = null
    userDefault.value = null
    sessionVerified.value = false
    loggedOut.value = true
  }

  return {
    token,
    user,
    userDefault,
    isLoggedIn,
    sessionVerified,
    loggedOut,
    setSession,
    setUserDefault,
    verifySession,
    logout,
    clearSession
  }
})
