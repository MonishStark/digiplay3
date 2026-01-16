import clsx from 'clsx'
import { useLayout } from '../../core'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../../../../app/pages/AppContext/AppContext'

const userAvatarClass = 'symbol-35px symbol-md-40px'

const Navbar = () => {
  const { config } = useLayout()
  const { appData } = useAppContext();
  return (
    <div className='app-navbar flex-shrink-0'>
      {config.app?.header?.default?.menu?.display && (
        <>
          <div className='app-navbar-item  ms-10 me-n3' title='Show header menu'>
            <div
              className={clsx('cursor-pointer symbol', userAvatarClass)}
              data-kt-menu-trigger="{default: 'click'}"
              data-kt-menu-attach='parent'
              data-kt-menu-placement='bottom-end'
            >
            </div>
          </div>
          <div className='app-navbar-item  ms-2' title='Show header menu'>
            <Link to='/dashboard'>
              <img
                alt='Logo'
                src={`${appData.appIcon}`}
                className='w-60px h-60px app-sidebar-logo-default appLogo'
              />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export { Navbar }
