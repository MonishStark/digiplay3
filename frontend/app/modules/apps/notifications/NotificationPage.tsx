import { Route, Routes, Outlet } from 'react-router-dom'
import { Notifications } from './components/Notifications'

const NotificationsPage = () => {
  return (
    <Routes>
      <Route element={<Outlet />}>
        <Route index element={<Notifications />} />
      </Route>  
    </Routes>
  )
}

export default NotificationsPage