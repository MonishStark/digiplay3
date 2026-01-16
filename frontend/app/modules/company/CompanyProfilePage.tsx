import React from 'react'
import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { ProfileComponents } from './ProfileComponents'


const CompanyProfilePage: React.FC = () => {
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
              <ProfileComponents />
            </>
          }
        />
        <Route index element={<Navigate to='/company/profile' />} />
      </Route>
    </Routes>
  )
}

export default CompanyProfilePage
