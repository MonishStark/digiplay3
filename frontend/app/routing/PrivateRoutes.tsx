import { lazy, FC, Suspense } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import {MasterLayout} from '../theme/layout/MasterLayout'
import TopBarProgress from 'react-topbar-progress-indicator'
import { getCSSVariableValue } from '../../app/theme/assets/ts/_utils'
import { WithChildren } from '../../app/theme/helpers'
import { VerifyUser } from '../modules/auth/components/EmailVerification'
import { DocumentMangement } from '../modules/document-management/DocumentManagement'
import { DragDropFile } from '../modules/document-management/components/DragAndDrop'
import { TextEditor } from '../modules/document-management/components/TextEditor'
import { DocumentUpdater } from '../modules/document-management/components/DocumentUpdater'
import { useAuth } from '../modules/auth'
import AdminPage from '../pages/superAdminDashboard/AdminPage'
import { useAppContext } from '../pages/AppContext/AppContext'
import { Documents } from '../modules/widgets/components/Documents'
import { DocumentSummarizer } from '../modules/document-management/components/DocumentSummarizer'
import NotificationsPage from '../modules/apps/notifications/NotificationPage'

const PrivateRoutes = () => {
  const AccountPage = lazy(() => import('../modules/accounts/AccountPage'))
  const CompanyProfilePage = lazy(() => import('../modules/company/CompanyProfilePage'))
  const InvitationList = lazy(() => import('../modules/invitations/InvitationList'))
  const InviteUsers = lazy(() => import('../modules/invitations/InviteUsers'))
  const ShareTeam= lazy(() => import('../modules/invitations/ShareTeam'))
  const ChatPage = lazy(() => import('../modules/apps/chat/ChatPage'))
  const TeamList = lazy(() => import('../modules/teams/TeamsList'))
  const UserDetailPage = lazy(() => import('../modules/invitations/UserDetailPage'))
  const ManageSubscription = lazy(() => import('../modules/manage-subscription/ManageSubscriptionPage'))

  const { auth, teamList } = useAuth()
  const { appData } = useAppContext();

  return (
    <Routes>
      <Route element={<MasterLayout />}>
        {/* Redirect to Dashboard after success login/registartion */}
        <Route path='auth/*' element={auth?.user?.role == 4 ? <Navigate to='/admin'/> : teamList.length === 0 ? <Navigate to="/dashboard" /> : <Navigate to='/teams' />}/>
        {/* Pages */}
        <Route path='dashboard'  element={
            <SuspensedView>
              <DocumentMangement />
            </SuspensedView>
          } />
        <Route path='upload-document' element={<DragDropFile />} />
        <Route path='create-document' element={<TextEditor />} />
        <Route path='update-document' element={<DocumentUpdater />} />
        <Route path='summarize-document' element={<DocumentSummarizer />} />
        {/* <Route path='view-document' element={<DocumentViewer />} /> */}
        <Route path='auth/verify' element={<VerifyUser />} />

        <Route
          path='share-team'
          element={
            <SuspensedView>
              <ShareTeam/>
            </SuspensedView>
          }
        />

        {/* Lazy Modules */}

        <Route
          path='admin/*'
          element={
            <SuspensedView>
              <AdminPage />
            </SuspensedView>
          }
        />

        {appData?.paymentMode &&
          auth?.user?.role == 1 && (
            <Route
              path='manage-subscription'
              element={
                <SuspensedView>
                  <ManageSubscription />
                </SuspensedView>
              }
            />
          )}

        <Route
          path='chat-histories/*'
          element={
            <SuspensedView>
              <ChatPage />
            </SuspensedView>
          }
        />

        <Route
          path='notifications'
          element={
            <SuspensedView>
              <NotificationsPage />
            </SuspensedView>
          }
        />

        <Route
          path='files/*'
          element={
            <SuspensedView>
              <Documents />
            </SuspensedView>
          }
        />

        <Route
          path='user/*'
          element={
            <SuspensedView>
              <AccountPage />
            </SuspensedView>
          }
        />
        <Route
          path='company/*'
          element={
            <SuspensedView>
              <CompanyProfilePage />
            </SuspensedView>
          }
        />
        <Route
          path='manage-users'
          element={
            <SuspensedView>
              <InvitationList />
            </SuspensedView>
          }
        />
        <Route
          path='invite-users'
          element={
            <SuspensedView>
              <InviteUsers />
            </SuspensedView>
          }
        />
        <Route
          path='teams'
          element={
            <SuspensedView>
              <TeamList />
            </SuspensedView>
          }
        />
        <Route
          path='user-detail'
          element={
            <SuspensedView>
              <UserDetailPage />
            </SuspensedView>
          }
        />

        {/* Page Not Found */}
        <Route path='*' element={<Navigate to='/error/404' />} />
      </Route>
    </Routes>
  )
}

const SuspensedView: FC<WithChildren> = ({ children }) => {
   const baseColor = getCSSVariableValue('--bs-primary') || '#29d'
  TopBarProgress.config({
    barColors: {
      '0': baseColor,
    },
    barThickness: 1,
    shadowBlur: 5,
  })
  return <Suspense fallback={<TopBarProgress />}>{children}</Suspense>
}

export { PrivateRoutes }
