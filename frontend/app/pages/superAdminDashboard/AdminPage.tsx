import React, { useEffect, useState } from 'react';
import { Route, Routes, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { Settings } from './components/settings/Settings';
import { useAuth } from '../../modules/auth';
import { getAdminRole } from './api';
import { Clients } from './components/settings/Clients';
import { Statistics } from './components/settings/Statistics';
import { Users } from './components/settings/Users';
import { Dashboard } from './components/settings/Dashboard';
import { AddUser } from './components/settings/AddUser';
import { EmailTemplates } from './components/settings/EmailTemplates';
import { EmailUpdater } from './components/settings/EmailUpdater';

const AdminPage: React.FC = () => {
  const [userRole, setUserRole] = useState<any>(null);
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!auth?.user?.id) {
          navigate('/admin');
          return;
        }

        const data: any = await getAdminRole(auth.user.id);
        setUserRole(data);

        if (data === false) {
          navigate('/error/500');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        navigate('/error/404');
      }
    };

    fetchData();
  }, [auth?.user?.id, navigate]);

  if (!auth?.user?.id || userRole === false) {
    return null;
  }

  return (
    <Routes>
      <Route
        element={<Outlet />}
      >
        <Route
          path='dashboard'
          element={<Dashboard />}
        />
        <Route
          path='clients'
          element={<Clients />}
        />
        <Route
          path='email-templates'
          element={<EmailTemplates />}
        />
        <Route
          path='update-email-template'
          element={<EmailUpdater />}
        />
        <Route
          path='settings'
          element={<Settings />}
        />
        <Route
          path='statistics'
          element={<Statistics />}
        />
        <Route
          path='users'
          element={<Users />}
        />
        <Route
          path='add-user'
          element={<AddUser />}
        />
        <Route index element={<Navigate to='/admin/dashboard' />} />
      </Route>
    </Routes>
  );
};

export default AdminPage;

