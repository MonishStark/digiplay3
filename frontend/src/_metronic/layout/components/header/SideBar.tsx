import React from 'react';
import { SidebarMenuItem } from '../sidebar/sidebar-menu/SidebarMenuItem';
import { AudioSummarizer } from '../../../../app/modules/document-management/components/AudioSummarizer';
import { ThemeModeSwitcher } from '../../../partials';
import { Settings } from '../../../../app/modules/document-management/components/Settings';
import { useAuth } from '../../../../app/modules/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { auth, istextEditor } = useAuth();

  return (
    <div
      style={{
        position: 'fixed',
        left: isOpen ? '0' : '-250px',
        top: '0',
        width: '225px',
        height: '100%',
        backgroundColor: 'rgb(44, 120, 188)',
        transition: 'left 0.3s ease',
        zIndex: 1000,
        boxShadow: '2px 0 5px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ padding: '1rem' }}>
      {auth?.user?.role !== 4 ? (
        <>
        <div onClick={onClose}> 
        <SidebarMenuItem
          to='/notifications'
          icon='notification-on'
          title='Notifications'
          fontIcon='bi-app-indicator'
        />
        </div>
        <div
          className='d-flex align-items-center mt-4'
          title='Record Audio'
        >
          <AudioSummarizer />
        </div>
        </>
        ):(<div onClick={onClose}>
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
          </div>)}
      </div>
      <div style={{ padding: '1rem' }}>
        <ThemeModeSwitcher  />
        <Settings />
      </div>
    </div>
  );
};