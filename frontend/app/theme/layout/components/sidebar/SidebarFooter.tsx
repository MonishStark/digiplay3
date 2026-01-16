/* eslint-disable react/jsx-no-target-blank */
import { ThemeModeSwitcher } from '../../../partials'
import { Settings } from '../../../../../app/modules/document-management/components/Settings'

const SidebarFooter = () => {

  return (
    <div className='app-sidebar-footer flex-columnauto' id='kt_app_sidebar_footer'>
      <div className='app-sidebar-menu overflow-hidden flex-column-fluid'>
        <div
          className='app-sidebar-wrapper hover-scroll-overlay-y my-5'
          data-kt-scroll='true'
          data-kt-scroll-activate='true'
          data-kt-scroll-wrappers='#kt_app_sidebar_menu'
          data-kt-scroll-offset='5px'
          data-kt-scroll-save-state='true'
        >
          <div
            className='menu menu-column menu-rounded menu-sub-indention px-3'
            id='#kt_app_sidebar_menu'
            data-kt-menu='true'
            data-kt-menu-expand='false'
          >
            <ThemeModeSwitcher/>
            <Settings />
          </div>
        </div>
      </div>
    </div>
  )
}

export { SidebarFooter }
