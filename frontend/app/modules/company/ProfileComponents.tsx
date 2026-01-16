import React, { useEffect } from 'react'
import { CompanyProfile } from './components/CompanyProfile'
import { ApplicationUsage } from './components/ApplicationUsage'
import { TwoFactorAuthentication } from './components/TwoFactorAuth'
import { useAuth } from '../auth'
import { useNavigate } from 'react-router-dom'
import CompanyStats from './components/CompanyStats'

export function ProfileComponents() {
  const { auth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (auth?.user?.role != 1) {
      navigate('/error/404')
    }
  }, [])

  return (
    <>
      {auth?.user?.role == 1 &&
        <>
          <CompanyProfile />
          <TwoFactorAuthentication />
          <ApplicationUsage />
        </>
      }
    </>
  )
}
