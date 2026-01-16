/* eslint-disable jsx-a11y/anchor-is-valid */
import { FC } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../app/modules/auth'

const HeaderUserMenu: FC = () => {
  const { auth, logout, currentUser } = useAuth()
  return (
    <div
      className='menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg menu-state-primary fw-bold py-4 fs-6 w-275px'
      data-kt-menu='true'
    >
      <div className='menu-item px-3'>
        <div className='menu-content d-flex align-items-center px-3'>
          <div className='symbol symbol-50px me-5'>
            <img alt='Logo' src={`${currentUser?.avatarUrl}`} />
          </div>

          <div className='d-flex flex-column'>
            <div className='fw-bolder d-flex align-items-center fs-5'>
              {auth?.user?.firstname} {' '} {auth?.user?.lastname}
              {/* <span className='badge badge-light-success fw-bolder fs-8 px-2 py-1 ms-2'>Pro</span> */}
            </div>
            <div
              className='fw-bold box text-muted text-hover-primary fs-7'
              style={{ inlineSize: '185px' }}
            >
              {auth?.user?.email}
            </div>
          </div>
        </div>
      </div>

      <div className='separator my-2'></div>

      <div className='menu-item px-5 my-1'>
        <Link to='/user/profile' className='menu-link px-5'>
          User Profile
        </Link>
      </div>

      {auth?.user?.role == 1 &&
        ['solo'].includes(auth?.user?.accountType) ? (
        <div className='menu-item px-5 my-1'>
          <Link to='/collections' className='menu-link px-5'>
            Manage Teams
          </Link>
        </div>
      ) : (
        <>
          <div className='menu-item px-5 my-1'>
            <Link to='/company/profile' className='menu-link px-5'>
              Organization Profile
            </Link>
          </div>

          <div className='menu-item px-5 my-1'>
            <Link to='/manage-users' className='menu-link px-5'>
              Manage Users
            </Link>
          </div>

          <div className='menu-item px-5 my-1'>
            <Link to='/collections' className='menu-link px-5'>
              Manage Teams
            </Link>
          </div>
        </>
      )}

      <div className='menu-item px-5'>
        <a onClick={logout} className='menu-link px-5'>
          Sign Out
        </a>
      </div>
    </div>
  )
}

export { HeaderUserMenu }