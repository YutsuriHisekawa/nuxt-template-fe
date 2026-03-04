export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.baseUrl

  async function request(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    }

    // Tambah Authorization header dari token di memory (fallback untuk httpOnly cookie)
    const authStore = useAuthStore()
    if (authStore.token) {
      defaultHeaders['Authorization'] = `Bearer ${authStore.token}`
    }

    const fetchOptions = {
      ...options,
      credentials: 'include', // PENTING: kirim & terima httpOnly cookie otomatis
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    // Handle token expired / unauthorized
    if (response.status === 401) {
      // Token expired, clear session dan redirect ke login
      authStore.clearSession()
      const router = useRouter()
      router.push('/login')
      throw new Error(data.message || 'Session expired')
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }

    return data
  }

  function get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' })
  }

  function post(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'POST', body })
  }

  function put(endpoint, body, options = {}) {
    return request(endpoint, { ...options, method: 'PUT', body })
  }

  function del(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' })
  }

  return {
    request,
    get,
    post,
    put,
    del
  }
}
