/* eslint-disable react/jsx-no-target-blank */
import { useIntl } from 'react-intl'
import { SidebarMenuItem } from './SidebarMenuItem'
import clsx from 'clsx'
import { SelectCommunities } from '../../../../../app/modules/document-management/components/SelectCommunities'
import { useAuth } from '../../../../../app/modules/auth'

const SidebarMenuMain = () => {
  const intl = useIntl()
  const { auth, communityList, currentCommunity, setCurrentCommunity, istextEditor } = useAuth()

  return (
    <>
      {auth?.user?.role != 4 ? (
        <>
          <div className='menu-item d-lg-block d-none'>
            <div className={clsx('menu-link without-sub')} style={{ padding: 0 }}>
              <div className='menu-content col-12'>
                <SelectCommunities
                  communityList={communityList}
                  currentCommunity={currentCommunity}
                  setCurrentCommunity={setCurrentCommunity}
                />
              </div>
            </div>
          </div>

          <div className='separator separatorcontent mb-4 mt-2 d-lg-block d-none' />

          <SidebarMenuItem
            to='/chat-histories'
            icon='messages'
            title={intl.formatMessage({ id: 'DOCUMENTS.SIDEBAR.CHAT_HISTORY' })}
            fontIcon='bi-app-indicator'
            istextEditor={istextEditor}
            disable={communityList.length === 0 || !currentCommunity}
          />

          {auth?.user?.role != 3 && auth?.user?.role != 4 &&
            <SidebarMenuItem
              to='/notifications'
              icon='notification-on'
              title="Notifications"
              fontIcon='bi-app-indicator'
              istextEditor={istextEditor}
            />
          }

          <SidebarMenuItem
            to='/files'
            icon='some-files'
            title="Files"
            fontIcon='bi-app-indicator'
            istextEditor={istextEditor}
            disable={communityList.length === 0 || !currentCommunity}
          />

          {auth?.user?.role === 1 && (
            <>
              <SidebarMenuItem
                to='/collections'
                icon='element-plus'
                title="Teams"
                fontIcon='bi-app-indicator'
                istextEditor={istextEditor}
              />
            </>
          )}
        </>
      ) : (
        <>
          <SidebarMenuItem
            to='/admin/dashboard'
            icon='element-11'
            title="Dashboard"
            fontIcon='bi-app-indicator'
            istextEditor={istextEditor}
          />
          <SidebarMenuItem
            to='/admin/settings'
            icon='code'
            title="Configuration"
            fontIcon='bi-app-indicator'
            istextEditor={istextEditor}
          />
          <SidebarMenuItem
            to='/admin/clients'
            icon='user'
            title="Clients"
            fontIcon='bi-app-indicator'
            istextEditor={istextEditor}
          />
          <SidebarMenuItem
            to='/admin/email-templates'
            icon='message-text-2'
            title="Email Templates"
            fontIcon='bi-app-indicator'
            istextEditor={istextEditor}
          />
        </>
      )}
    </>
  )
}

export { SidebarMenuMain }
