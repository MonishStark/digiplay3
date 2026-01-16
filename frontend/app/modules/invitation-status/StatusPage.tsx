/* eslint-disable jsx-a11y/anchor-is-valid */
import { Route, Routes } from 'react-router-dom'
import { InvalidInvitation } from './components/InvalidInvitation'
import { InvalidToken } from './components/InvalidToken'
import { ExpiredInvitation } from './components/ExpiredInvitation'
import { InvitationDeclined } from './components/InvitationDeclined'
import { InvitationRegistered } from './components/RegisteredInvitation'
import { AlreadyDeclined } from './components/AlreadyDeclined'
import { StatusLayout } from './StatusLayout'

const StatusPage = () => (
  <Routes>
    <Route element={<StatusLayout />}>
      <Route path='invalid-invitation' element={<InvalidInvitation />} />
      <Route path='invalid-token' element={<InvalidToken />} />
      <Route path='expired-invitation' element={<ExpiredInvitation />} />
      <Route path='declined-invitation' element={<AlreadyDeclined />} />
      <Route path='registered-invitation' element={<InvitationRegistered />} />
      <Route path='declined' element={<InvitationDeclined />} />
    </Route>
  </Routes>
)

export { StatusPage }
