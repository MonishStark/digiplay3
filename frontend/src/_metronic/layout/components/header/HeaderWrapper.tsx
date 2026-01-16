/* eslint-disable react-hooks/exhaustive-deps */
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { KTIcon } from '../../../helpers'
import { useLayout } from '../../core'
import { Header } from './Header'
import { Navbar } from './Navbar'
import { useAuth } from '../../../../app/modules/auth'
import { SelectCommunities } from '../../../../app/modules/document-management/components/SelectCommunities'
import { useAppContext } from '../../../../app/pages/AppContext/AppContext'

export function HeaderWrapper() {
  const { communityList, currentCommunity, setCurrentCommunity, auth } = useAuth()
  const { config, classes } = useLayout()
  const { appData } = useAppContext();
  if (!config.app?.header?.display) {
    return null
  }

  return (
    <div id='kt_app_header' className='app-header d-lg-none'>
      <div
        id='kt_app_header_container'
        className={clsx(
          'app-container flex-lg-grow-1 flex-row-reverse col-12 flexsm-row px-2',
          classes.headerContainer.join(' '),
          config.app?.header?.default?.containerClass
        )}
      >
        {config.app.sidebar?.display && (
          <>
            <div
              className='d-flex align-items-center d-lg-none ms-n2 me-2 justify-content-between'
              title='Show sidebar menu'
            >
              <div
                className='btn btn-icon btn-active-color-primary w-35px h-35px'
                id='kt_app_sidebar_mobile_toggle'
              >
                <KTIcon iconName='abstract-14' className='text-primary fs-1' />
              </div>
            </div>

            {auth?.user?.role != 4 && (
              <div
                className='d-flex align-items-center d-lg-none justify-content-between'
                title='Show select teams'
              >
                <div className='col-11'>
                  <SelectCommunities
                    communityList={communityList}
                    currentCommunity={currentCommunity}
                    setCurrentCommunity={setCurrentCommunity}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!(config.layoutType === 'dark-sidebar' || config.layoutType === 'light-sidebar') && (
          <div className='d-flex align-items-center flex-grow-1 flex-lg-grow-0 me-lg-15'>
            <Link to='/dashboard'>
              {config.layoutType !== 'dark-header' ? (
                <img
                  alt='Logo'
                  src={`${appData.appLogo}`}
                  className='h-20px h-lg-30px app-sidebar-logo-default'
                />
              ) : (
                <>
                  <img
                    alt='Logo'
                    src={`${appData.appLogo}`}
                    className='h-20px h-lg-30px app-sidebar-logo-default theme-light-show'
                  />
                  <img
                    alt='Logo'
                    src={`${appData.appLogo}`}
                    className='h-20px h-lg-30px app-sidebar-logo-default theme-dark-show'
                  />
                </>
              )}
            </Link>
          </div>
        )}

        <div
          id='kt_app_header_wrapper'
          className='d-flex align-items-stretch justify-content-between flex-lg-grow-1'
        >
          {config.app.header.default?.content === 'menu' &&
            config.app.header.default.menu?.display && (
              <div
                className='app-header-menu app-header-mobile-drawer align-items-stretch my-auto'
                data-kt-drawer='true'
                data-kt-drawer-name='app-header-menu'
                data-kt-drawer-activate='{default: true, lg: false}'
                data-kt-drawer-overlay='true'
                data-kt-drawer-width='225px'
                data-kt-drawer-direction='end'
                data-kt-drawer-toggle='#kt_app_header_menu_toggle'
                data-kt-swapper='true'
                data-kt-swapper-mode="{default: 'append', lg: 'prepend'}"
                data-kt-swapper-parent="{default: '#kt_app_body', lg: '#kt_app_header_wrapper'}"
              >
                <Header />
              </div>
            )}
          <Navbar />
        </div>
      </div>
    </div>
  )
}
