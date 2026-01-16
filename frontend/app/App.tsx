import { Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TranslationProvider } from '../app/theme/providers'
import { LayoutProvider, LayoutSplashScreen } from '../app/theme/layout/core'
import { MasterInit } from '../app/theme/layout/MasterInit'
import { AuthInit, useAuth } from './modules/auth'
import { getActiveTeams } from './modules/document-management/api'
import { useAppContext } from './pages/AppContext/AppContext'
import { PathnameProvider } from './theme/providers';
import {AuthProvider} from './theme/auth/providers/JWTProvider';

const App = () => {
  const { currentUser, setTeamList, setCurrentTeam, teamList, currentTeam } = useAuth()
  const [loading, setLoading] = useState(false);
  const { appData } = useAppContext();

  useEffect(() => {
    const isCurrentTeam = teamList.some(team => team.id === currentTeam);

    if(localStorage.getItem('current-team') || isCurrentTeam) {
      setCurrentTeam(localStorage.getItem('current-team'))
    } else {
      setCurrentTeam(teamList[0]?.id)
    }
  }, [currentUser])

  useEffect(() => {
    if (appData) {
      const pageTitleElement = document.getElementById('pageTitle');
      if (pageTitleElement) {
        pageTitleElement.innerText = `${appData.appName} - ${appData.appTagline}`;
      }
      const faviconElement = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null;
      if (faviconElement) {
        faviconElement.href = `${appData.appIcon}`;
      }
    }
  }, [appData]);


  useEffect(() => {
    if (currentUser) {
      getActiveTeams(currentUser.companyId || '')
        .then((response) => {
          if (response.data.success) {
            setTeamList(response.data.teamList)
          }
        }).finally(() => {
          setLoading(false);
        });
    }
  }, [currentUser])
  return (
    <Suspense fallback={<LayoutSplashScreen />}>
      <TranslationProvider>
        <LayoutProvider>
          <PathnameProvider>
            <AuthProvider>
          <AuthInit>
            {loading ? (
              <div className='text-center'>Loading...</div>
            ) : (
              <>
                <Outlet />
                <MasterInit />
              </>
            )}
          </AuthInit>
          </AuthProvider>
          </PathnameProvider>
        </LayoutProvider>
      </TranslationProvider>
    </Suspense>
  )
}

export { App }