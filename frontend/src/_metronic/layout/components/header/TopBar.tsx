import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useLayout } from '../../core';
import { useAuth } from '../../../../app/modules/auth';
import { useAppContext } from '../../../../app/pages/AppContext/AppContext';
import { AudioSummarizer } from '../../../../app/modules/document-management/components/AudioSummarizer';
import { SidebarMenuItem } from '../sidebar/sidebar-menu/SidebarMenuItem';
import { ThemeModeSwitcher } from '../../../partials';
import { Settings } from '../../../../app/modules/document-management/components/Settings';
import { KTIcon } from '../../../helpers';
import { Sidebar } from './SideBar';

export const TopBar: React.FC = () => {
  const { auth, istextEditor, communityList } = useAuth();
  const { config, classes } = useLayout();
  const { appData } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false); // State for sidebar visibility
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen); // Toggle sidebar visibility
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  if (!config.app?.header?.display) {
    return null;
  }

  return (
    <div id='kt_app_header' className='app-header'>
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} /> 
      <div
        id='kt_app_header_container'
        className={clsx(
          'app-container flex-lg-grow-1 flex-row-reverse col-12 flexsm-row px-2 ',
          classes.headerContainer.join(' '),
          config.app?.header?.default?.containerClass
        )}
        style={{ backgroundColor: '#2c78bc' }}
      >
        {config.app.sidebar?.display && (
          <>
            <div className='d-lg-flex px-4 align-items-center '>
              <div className=' align-items-center  d-none d-lg-flex'>
                {auth?.user?.role !== 4 ? (
                  <>
                  <div
                    className='py-4'
                    title='Record Audio'
                  >
                    <AudioSummarizer />
                  </div>
                  <SidebarMenuItem
                    to='/notifications'
                    icon='notification-on'
                    title='Notifications'
                    fontIcon='bi-app-indicator'
                    istextEditor={istextEditor}
                  />
                  </>
                ):(
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
                <ThemeModeSwitcher />
                <Settings />
              </div>
              <div
                className='d-flex align-items-center d-lg-none ms-n2 me-2 justify-content-between mt-4'
                title='Show sidebar menu'
                onClick={toggleSidebar} // Toggle sidebar on icon click
              >
                <KTIcon iconName='abstract-14' className='text-primary fs-1 mt-2' />
              </div>
            </div>
          </>
        )}
        <Link to={`${auth?.user?.role === 4 ? '/admin/dashboard': communityList.length === 0 ? "/dashboard" : '/collections'}`}>
          <div className={`app-sidebar-logo overflow-hidden`}>
            <span className='px-8'>
              <img alt='Logo' src={`${appData.appLogo}`} className='w-175px' />
            </span>
          </div>
        </Link>
        <div className='app-navbar-item  ms-2 d-lg-none' title='Show header menu'>
            <Link to={`${auth?.user?.role === 4 ? '/admin/dashboard': communityList.length === 0 ? "/dashboard" : '/collections'}`}>
              <img
                alt='Logo'
                src={`${appData.appIcon}`}
                className='w-60px h-60px app-sidebar-logo-default appLogo'
              />
            </Link>
          </div>
      </div>
    </div>
  );
};