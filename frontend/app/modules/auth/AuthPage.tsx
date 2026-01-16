/* eslint-disable jsx-a11y/anchor-is-valid */
import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Registration } from './components/Registration'
import { ForgotPassword } from './components/ForgotPassword'
import { Login } from './components/Login'
import { ResetPassword } from './components/ResetPassword'
import { CreateAccount } from '../invitations/CreateAccount'
import { DeclineInvitation } from '../invitations/DeclineInvitation'
import { StripeStatusPage } from './components/StripeStatusPage'
import "../../../styles/login.css"
import { useAppContext } from '../../pages/AppContext/AppContext'

const AuthLayout = () => {
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('bg-body')
    return () => {
      document.body.classList.remove('bg-body')
    }
  }, [])

  const getClassForPath = () => {
    const { pathname } = location;
    return pathname
  };

  return (
    <div
      className='d-flex flex-column flex-column-fluid bgi-position-y-bottom position-x-center bgi-no-repeat bgi-size-contain bgi-attachment-fixed'
    >
      {/* begin::Content */}
      <div className={`${["/auth", "/auth/login"].includes(getClassForPath()) ? "login-background-img tab-d-flex" : "p-10 pb-lg-20 d-flex flex-column"} flex-center flex-column-fluid`}>
        {/* begin::Wrapper */}
        <div className={`${["/auth", "/auth/login"].includes(getClassForPath()) ? "" : "w-lg-500px p-10 p-lg-15 rounded shadow-sm bg-body"} mx-auto`}>
          <Outlet />
        </div>
        {/* end::Wrapper */}
      </div>
      {/* end::Content */}
    </div>
  )
}

const AuthPage = () => {
  const { appData } = useAppContext();

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path='login' element={<Login />} />
        <Route path='registration' element={appData?.signUpMode ? <Registration /> : <Navigate to='/auth/login' replace />} />
        <Route path='forgot-password' element={<ForgotPassword />} />
        <Route path='reset-password' element={<ResetPassword />} />
        <Route path='invite' element={<CreateAccount />} />
        <Route path='decline-invitation' element={<DeclineInvitation />} />
        <Route path='stripe-status' element={<StripeStatusPage />} />
        <Route index element={<Login />} />
      </Route>
    </Routes>
  )
}

export { AuthPage }
