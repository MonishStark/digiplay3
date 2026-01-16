import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { Settings } from './components/settings/Settings'
import { Integrations } from './components/settings/cards/Integrations'


const AccountPage: React.FC = () => {
  return (
    <Routes>
      <Route
        element={
          <>
            <Outlet />
          </>
        }
      >
        <Route
          path='profile'
          element={
            <>
              <Settings />
            </>
          }
        />
        <Route
          path='integration'
          element={
            <>
              <Integrations />
            </>
          }
        />
        <Route index element={<Navigate to='/user/profile' />} />
      </Route>
    </Routes>
  )
}

export default AccountPage
