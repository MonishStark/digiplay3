import { Route, Routes, Outlet } from 'react-router-dom'
import { ManageSubscription } from './components/ManageSubscription'

const ManageSubscriptionPage = () => {
  return (
    <Routes>
      <Route element={<Outlet />}>
        <Route index element={<ManageSubscription />} />
      </Route>
    </Routes>
  )
}

export default ManageSubscriptionPage
