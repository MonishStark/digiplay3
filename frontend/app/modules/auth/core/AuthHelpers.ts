import { AuthModel } from './_models'

const AUTH_LOCAL_STORAGE_KEY = 'kt-auth-react-v'
const CURRENT_TEAM = 'current-team'
const getAuth = (): AuthModel | undefined => {
  if (!localStorage) {
    return
  }

  const lsValue: string | null = localStorage.getItem(AUTH_LOCAL_STORAGE_KEY)
  if (!lsValue) {
    return
  }

  try {
    const auth: AuthModel = JSON.parse(lsValue) as AuthModel
    if (auth) {
      // You can easily check auth_token expiration also
      return auth
    }
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error)
  }
}

const getCurrentTeam = (): any => {
  if (!localStorage) {
    return
  }

  const lsValue: string | null = localStorage.getItem(CURRENT_TEAM)
  if (!lsValue) {
    return
  }

  try {
    const team: any = lsValue
    if (team) {
      // You can easily check auth_token expiration also
      return team
    }
  } catch (error) {
    console.error('COLLECTION LOCAL STORAGE PARSE ERROR', error)
  }
}


const setAuth = (auth: AuthModel) => {
  if (!localStorage) {
    return
  }

  try {
    const lsValue = JSON.stringify(auth)
    localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, lsValue)
  } catch (error) {
    console.error('AUTH LOCAL STORAGE SAVE ERROR', error)
  }
}
 
const storeCurrentTeam = (team: any) => {
  if (!localStorage) {
    return
  }

  try {
    const lsValue = team
    localStorage.setItem(CURRENT_TEAM, lsValue)
  } catch (error) {
    console.error('COLLECTION LOCAL STORAGE SAVE ERROR', error)
  }
}

const removeAuth = () => {
  if (!localStorage) {
    return
  }

  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY)
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error)
  }
}

export function setupAxios(axios: any) {
  axios.defaults.headers.Accept = 'application/json'
  axios.interceptors.request.use(
    (config: { headers: { Authorization: string } }) => {
      const auth = getAuth()
      if (auth && auth.api_token) {
        config.headers.Authorization = `Bearer ${auth.api_token}`
      }

      return config
    },
    (err: any) => Promise.reject(err)
  ),
  axios.interceptors.response.use(
    (response: any) => response,
    async (error: any) => {
      
      const originalRequest = error.config
      // If unauthorized & not already retried
      if (
        error.response?.status === 401 && error.response?.data?.message=="Expired token provided" &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true

        try {
          const auth = getAuth()
          if (!auth) {
            removeAuth()
            window.location.href = '/login'
            return Promise.reject(error)
          }

          // 🔁 Call refresh token endpoint
          const response = await axios.post(
            `${import.meta.env.VITE_APP_BACKEND_ORIGIN_URL}/auth/refresh`,
            {
              refreshToken: auth.refresh_token, 
            },
            { withCredentials: true }
          )

          const newAuth = {
            ...auth,
            api_token: response.data.auth.accessToken,
            refresh_token:response.data.auth.refreshToken
          }
          // ✅ Save new token
          setAuth(newAuth)

          // ✅ Update header and retry original request
          originalRequest.headers.Authorization =
            `Bearer ${response.data.auth.accessToken}`

          return axios(originalRequest)
        } catch (refreshError) {
          // ❌ Refresh failed → logout
          removeAuth()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }

      return Promise.reject(error)
    }
  )
}


export { getAuth, setAuth, removeAuth, AUTH_LOCAL_STORAGE_KEY, storeCurrentTeam, getCurrentTeam }
