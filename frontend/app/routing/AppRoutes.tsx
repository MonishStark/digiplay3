/**
 * High level router.
 *
 * Note: It's recommended to compose related routes in internal router
 * components (e.g: `src/app/modules/Auth/pages/AuthPage`, `src/app/BasePage`).
 */

import { FC } from 'react'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoutes } from './PrivateRoutes'
import { ErrorsPage } from '../modules/errors/ErrorsPage'
import { StatusPage } from '../modules/invitation-status/StatusPage'
import { Logout, AuthPage, useAuth } from '../modules/auth'
import { App } from '../App'
import SignInPage from '../pages/SignInPage'
import { VerifyUser } from '../modules/auth/components/EmailVerification'

/**
 * Base URL of the website.
 *
 * @see https://facebook.github.io/create-react-app/docs/using-the-public-folder
 */
const { PUBLIC_URL } = import.meta.env

const AppRoutes: FC = () => {
  const { currentUser, auth } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path='error/*' element={<ErrorsPage />} />
          <Route path='status/*' element={<StatusPage />} />
          <Route path='logout' element={<Logout />} />
          <Route path='auth/oauth-complete' element={<SignInPage />} />
          <Route path='auth/verify' element={<VerifyUser />} />
          
          {currentUser ? (
            <>
              <Route path='/*' element={<PrivateRoutes />} />
              {auth?.user?.role === 4 ? (
                <Route index element={<Navigate to='/admin' />} />
              ) : (
                <Route index element={<Navigate to='/teams' />} />
              )}
            </>
          ) : (
            <>
              <Route path='auth/*' element={<AuthPage />} />
              <Route path='*' element={<Navigate to='/auth' />} />
            </>
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export { AppRoutes }