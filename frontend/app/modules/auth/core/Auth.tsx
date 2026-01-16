import {
  FC,
  useState,
  useEffect,
  createContext,
  useContext,
  Dispatch,
  SetStateAction,
} from 'react'
import { LayoutSplashScreen } from '../../../../app/theme/layout/core'
import { AuthModel, UserModel } from './_models'
import * as authHelper from './AuthHelpers'
import { WithChildren } from '../../../../app/theme/helpers'
import { themeMenuModeLSKey, themeModelSKey } from '../../../../app/theme/partials'
import { getUserData } from './_requests'
import { useLanguage } from '../../../theme/providers'
import { I18N_LANGUAGES} from '../../../theme/i18n'

type AuthContextProps = {
  auth: AuthModel | undefined
  saveAuth: (auth: AuthModel | undefined) => void
  currentUser: UserModel | undefined
  teamList: Array<any>
  currentTeam: any
  isSharedTeam:boolean
  setCurrentUser: Dispatch<SetStateAction<UserModel | undefined>>
  setCurrentTeam: Dispatch<SetStateAction<any>>
  setTeamList: Dispatch<SetStateAction<any>>
  setIsSharedTeam: Dispatch<SetStateAction<any>>
  isBackFromPages: boolean
  onHomePage: boolean
  setIsBackFromPages: Dispatch<SetStateAction<any>>
  setOnHomePage: Dispatch<SetStateAction<any>>
  logout: () => void
  successMsg: string
  setSuccessMsg: any
  errMsg: string
  setErrMsg: any
  uploadStatusMessage: string
  setUploadStatusMessage: any
  responseCount: number
  setResponseCount: any
  istextEditor: any
  setIstextEditor: any
  currentParent: any
  setCurrentParent: any
  historyIds: any
  setHistoryIds: any
}

const initAuthContextPropsState = {
  auth: authHelper.getAuth(),
  saveAuth: () => { },
  currentUser: undefined,
  teamList: [],
  currentTeam: undefined,
  isSharedTeam:false,
  setCurrentUser: () => { },
  setCurrentTeam: () => { },
  setIsSharedTeam:()=>{},
  setTeamList: () => { },
  isBackFromPages: false,
  onHomePage: false,
  setOnHomePage: () => { },
  setIsBackFromPages: () => { },
  logout: () => { },
  successMsg: '',
  setSuccessMsg: () => { },
  errMsg: '',
  setErrMsg: () => { },
  uploadStatusMessage: '',
  setUploadStatusMessage: () => { },
  responseCount: 0,
  setResponseCount: () => { },
  istextEditor: false,
  setIstextEditor: () => { },
  currentParent: false,
  setCurrentParent: () => { },
  historyIds: false,
  setHistoryIds: () => { }
}

const AuthContext = createContext<AuthContextProps>(initAuthContextPropsState)

const useAuth = () => {
  return useContext(AuthContext)
}

const AuthProvider: FC<WithChildren> = ({ children }) => {
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth())
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>()
  const [currentTeam, setCurrentTeam] = useState<any>(authHelper.getCurrentTeam())
  const [isSharedTeam,setIsSharedTeam] = useState<boolean>(false);
  const [teamList, setTeamList] = useState<Array<any>>([])
  const [isBackFromPages, setIsBackFromPages] = useState<boolean>(false)
  const [onHomePage, setOnHomePage] = useState<boolean>(false)
  const [successMsg, setSuccessMsg] = useState<string>('')
  const [errMsg, setErrMsg] = useState<string>('')
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>('')
  const [responseCount, setResponseCount] = useState<number>(0)
  const [istextEditor, setIstextEditor] = useState<boolean>(false)
  const [currentParent, setCurrentParent] = useState<any>(localStorage.getItem('current-parent') ? localStorage.getItem('current-parent') : 4)
  const [historyIds, setHistoryIds] = useState<any>([4]);
  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth)
    if (auth) {
      authHelper.setAuth(auth)
    } else {
      authHelper.removeAuth()
    }
  }


  const logout = () => {
    saveAuth(undefined)
    setCurrentUser(undefined)
    setCurrentTeam("")
    setIsSharedTeam(false)
    setTeamList([])
    localStorage.setItem(themeModelSKey, 'light')
    localStorage.setItem(themeMenuModeLSKey, 'light')
    document.documentElement.setAttribute('data-bs-theme', 'light')
    localStorage.removeItem("current-team")
    localStorage.removeItem('current-parent')
  }
  
  return (
    <AuthContext.Provider value={{
      auth,
      saveAuth,
      currentUser,
      currentTeam,
      isSharedTeam,
      teamList,
      setCurrentUser,
      setCurrentTeam,
      setIsSharedTeam,
      setTeamList,
      isBackFromPages,
      onHomePage,
      setIsBackFromPages,
      setOnHomePage,
      logout,
      successMsg,
      setSuccessMsg,
      errMsg,
      setErrMsg,
      uploadStatusMessage,
      setUploadStatusMessage,
      responseCount,
      setResponseCount,
      istextEditor,
      setIstextEditor,
      currentParent,
      setCurrentParent,
      historyIds,
      setHistoryIds
    }}>
      {children}
    </AuthContext.Provider>
  )
}

const AuthInit: FC<WithChildren> = ({ children }) => {
  const { auth, logout, setCurrentUser, teamList,currentUser } = useAuth()
  const [showSplashScreen, setShowSplashScreen] = useState(true)
    const changeLanguage = useLanguage().changeLanguage;

  useEffect(() => {
    if (auth && auth.api_token) {
      setCurrentUser(auth.user)
      let timeout: number
      if (teamList.length === 0) {
        timeout = window.setTimeout(() => {
          setShowSplashScreen(false)
        }, 3000)
      } else {
        setShowSplashScreen(false)
      }

      return () => {
        clearTimeout(timeout)
      }
    } else {
      logout()
      setShowSplashScreen(false)
    }
  }, [])

 useEffect(() => {
  const loadUser = async () => {
    if (auth?.user?.id) {
      try {
        const response = await getUserData();
        if (response.data.success) {
          setCurrentUser({...auth.company, ...response.data.user} as UserModel);
          changeLanguage(I18N_LANGUAGES.find(lang => lang.code === response.data.userData.language));
        }
      } catch (error) {
      } finally {
        setShowSplashScreen(false);
      }
    } else {
      setShowSplashScreen(false);
    }
  };

  loadUser();
}, []);

  return showSplashScreen ? <LayoutSplashScreen /> : <>{children}</>
}

export { AuthProvider, AuthInit, useAuth }