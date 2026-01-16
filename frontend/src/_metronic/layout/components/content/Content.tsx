import { useEffect } from 'react'
import { useLocation } from 'react-router'
import clsx from 'clsx'
import { useLayout } from '../../core'
import { DrawerComponent } from '../../../assets/ts/components'
import { WithChildren } from '../../../helpers'
import { useAuth } from '../../../../app/modules/auth'

const Content = ({ children }: WithChildren) => {
  const { config, classes } = useLayout()
  const location = useLocation()
  const { onHomePage } = useAuth()
  useEffect(() => {
    DrawerComponent.hideAll()
  }, [location])

  const appContentContainer = config.app?.content?.container
  return (
    <div
      id='kt_app_content'
      className={clsx(
        'app-content flex-column-fluid',
        classes.content.join(' '),
        config?.app?.content?.class
      )}
    >
      {appContentContainer ? (
        <div
          id='kt_app_content_container'
          className={clsx('app-container', onHomePage ? 'pad-right-imp' : 'pad-right-imp', classes.contentContainer.join(' '), {
            'container-xxl': appContentContainer === 'fixed',
            'container-fluid': appContentContainer === 'fluid',
          })}
          style={{ height: '100%' }}
        >
          {children}
        </div>
      ) : (
        <>{children}</>
      )}
    </div>
  )
}

export { Content }
