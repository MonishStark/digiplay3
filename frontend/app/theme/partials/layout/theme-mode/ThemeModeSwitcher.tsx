import clsx from 'clsx'
import {KTIcon} from '../../../helpers'
import {ThemeModeComponent} from '../../../assets/ts/layout'
import {ThemeModeType, useThemeMode} from './ThemeModeProvider'
import { FormattedMessage } from 'react-intl'

/* eslint-disable jsx-a11y/anchor-is-valid */
const systemMode = ThemeModeComponent.getSystemMode() as 'light' | 'dark'

const ThemeModeSwitcher = () => {
  const {mode, menuMode, updateMode, updateMenuMode} = useThemeMode()
  const calculatedMode = mode === 'system' ? systemMode : mode
  const switchMode = (_mode: ThemeModeType) => {
    updateMenuMode(_mode)
    updateMode(_mode)
    localStorage.setItem("mode", _mode)
  }

  const handleSwitchMode = (mode: "dark" | "light") => () => {
    switchMode(mode);
  };

  return (
    <>
      {/* begin::Menu toggle */}
      <div className='menu-item'>
        {calculatedMode === 'dark' && (
          <a
            className={clsx('menu-link px-3 py-2', { active: menuMode === 'light' })}
            onClick={handleSwitchMode("light")}
          >
            <span className='menu-icon' data-kt-element='icon'>
              <KTIcon iconName='night-day' className='fs-1 text-white' />
            </span>
            <span className='menu-title text-white ms-2'><FormattedMessage id='TOPBAR.LIGHT_MODE' /></span>
          </a>
        )}

        {calculatedMode === 'light' && (
          <a
            className={clsx('menu-link px-3 py-2', { active: menuMode === 'dark' })}
            onClick={handleSwitchMode("dark")}
          >
            <span className='menu-icon' data-kt-element='icon'>
              <KTIcon iconName='moon' className='fs-1 text-white' />
            </span>
            <span className='menu-title text-white ms-2'><FormattedMessage id='TOPBAR.DARK_MODE' /></span>
          </a>
        )}
      </div>
      {/* end::Menu item */}
    </>
  )
}

export { ThemeModeSwitcher }
