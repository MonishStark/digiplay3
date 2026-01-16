import React from 'react'
import { ProfileDetails } from './cards/ProfileDetails'
import { SignInMethod } from './cards/SignInMethod'
import UserStats from './cards/UserStats'

export function Settings() {
  return (
    <>
      <ProfileDetails />
      <SignInMethod />
      <UserStats />
    </>
  )
}
