import { Route, Routes, Outlet } from 'react-router-dom'
import { Documents } from './components/Documents'

const WidgetsPage = () => {
  return (
    <Routes>
      <Route element={<Outlet />}>
        <Route index element={<Documents />} />
      </Route>
    </Routes>
  )
}

export default WidgetsPage
