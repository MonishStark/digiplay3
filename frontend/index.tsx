import { createRoot } from 'react-dom/client'
// Axios
import axios from 'axios'
import { Chart, registerables } from 'chart.js'
import { QueryClient, QueryClientProvider } from 'react-query'
// Apps
import { TranslationProvider } from './app/theme/providers'
import './styles/login.css'

import './app/theme/assets/fonticon/fonticon.css'
import './app/theme/assets/keenicons/duotone/style.css'
import './app/theme/assets/keenicons/outline/style.css'
import './app/theme/assets/keenicons/solid/style.css'

/**
 * TIP: Replace this style import with rtl styles to enable rtl mode
 *
 * import './_metronic/assets/css/style.rtl.css'
 **/
import './app/theme/assets/sass/style.scss'
import './app/theme/assets/sass/plugins.scss'
import './app/theme/assets/sass/style.react.scss'
import { AppRoutes } from './app/routing/AppRoutes'
import { AuthProvider, setupAxios } from './app/modules/auth'
import { AppContextProvider } from './app/pages/AppContext/AppContext'
import {NotificationsProvider} from './app/modules/notification/Notification'
import { HelmetProvider } from 'react-helmet-async'
/**
 * Creates `axios-mock-adapter` instance for provided `axios` instance, add
 * basic Metronic mocks and returns it.
 *
 * @see https://github.com/ctimmerm/axios-mock-adapter
 */
/**
 * Inject Metronic interceptors for axios.
 *
 * @see https://github.com/axios/axios#interceptors
 */
setupAxios(axios)
Chart.register(...registerables)

const queryClient = new QueryClient()
const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <AuthProvider>
        <NotificationsProvider> 
          <AppContextProvider>
            <HelmetProvider>
            <AppRoutes />
            </HelmetProvider>
          </AppContextProvider>
        </NotificationsProvider>
        </AuthProvider>
      </TranslationProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  )
}
