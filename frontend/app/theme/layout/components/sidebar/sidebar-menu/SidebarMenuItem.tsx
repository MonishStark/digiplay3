import { FC } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useLocation } from 'react-router'
import { checkIsActive, KTIcon, WithChildren } from '../../../../helpers'
import { useLayout } from '../../../core'
import { useAuth } from '../../../../../../app/modules/auth'
import { useNotifications } from '../../../../../../app/modules/notification/Notification'

type Props = {
  to: string
  title: string
  icon?: string
  fontIcon?: string
  hasBullet?: boolean
  disable?: boolean
  istextEditor?: boolean
}

const SidebarMenuItem: FC<Props & WithChildren> = ({
  children,
  to,
  title,
  icon,
  fontIcon,
  hasBullet = false,
  disable = false,
  istextEditor = false
}) => {
  const { pathname } = useLocation()
  const isActive = checkIsActive(pathname, to)
  const { config } = useLayout()
  const { app } = config
  const { setIstextEditor } = useAuth()
  const {notifications}=useNotifications();

  let newNotifications =0;
    notifications.forEach((noti: any)=>{
      if(!noti.isViewed){
        newNotifications++;
      }
    })

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (istextEditor) {
      const confirmation = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmation) {
        event.preventDefault();
      } else {
        setIstextEditor(false)
      }
    }
  };

  return (
    <div className='menu-item' style={disable ? { pointerEvents: 'none' } : {}}>
      <Link className={clsx('menu-link without-sub', { active: isActive })} to={to} onClick={handleClick}>
        {hasBullet && (
          <span className='menu-bullet'>
            <span className='bullet bullet-dot'></span>
          </span>
        )}
        {icon && app?.sidebar?.default?.menu?.iconType === 'svg' && (
          <span className='menu-icon'>
            <div className="d-flex flex-column align-items-center">
              {title === 'Notifications' && newNotifications > 0 && (
                <span className='bullet bullet-dot bg-success h-6px w-6px translate-middle animation-blink ms-2' />
              )}
              <KTIcon iconName={icon} className={`fs-2 ${disable ? 'text-muted' : 'text-white'}`} />
            </div>
          </span>
        )}
        {fontIcon && app?.sidebar?.default?.menu?.iconType === 'font' && (
          <i className={clsx('bi fs-3', fontIcon)}></i>
        )}
        <span className={`menu-title ${disable ? 'text-muted' : 'text-white'}`}>{title}</span>
      </Link>
      {children}
    </div>
  )
}

export { SidebarMenuItem }
