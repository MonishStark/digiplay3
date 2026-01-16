import React, { createContext, useContext, useState, FC, useEffect } from 'react';
import { WithChildren } from '../../../app/theme/helpers';
import { getNotifications } from '../document-management/api';
import { useAuth } from '../auth';

type Notification = {
  id: number;
  name: string;
  message: 'uploading' | 'failed' | 'successfull';
  type:string;
  isViewed:boolean;
  jobId:number;
};

type NotificationsContextProps = {
  notifications: Notification[];
  fetchNotifications:()=>void;
  removeNotification: (id: number) => void;
};



const initNotificationsContextPropsState = {
  notifications: [],
  fetchNotifications:()=>{},
  removeNotification: () => {},
};

const NotificationsContext = createContext<NotificationsContextProps>(initNotificationsContextPropsState);

const useNotifications = () => {
  return useContext(NotificationsContext);
};

const NotificationsProvider: FC<WithChildren> = ({ children }) => {
  const {currentUser} = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const fetchNotifications = async () => {
    try {
      const response = await getNotifications(); 
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };
  useEffect(() => {
    if(currentUser){
      fetchNotifications();
    }
  }, []);

  const removeNotification = () => {
    setNotifications([])
  };

  return (
    <NotificationsContext.Provider value={{ notifications, removeNotification,fetchNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export { NotificationsProvider, useNotifications };