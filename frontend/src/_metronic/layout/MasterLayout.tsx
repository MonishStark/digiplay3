import {useEffect, useState} from 'react'
import {Outlet, useLocation} from 'react-router-dom'
import {ScrollTop} from './components/scroll-top'
import {Content} from './components/content'
import {
  ThemeModeProvider,
} from '../partials'
import {PageDataProvider} from './core'
import {reInitMenu} from '../helpers'
import {useAuth} from '../../app/modules/auth/core/Auth'
import {AlertDanger, AlertSuccess} from '../../app/modules/alerts/Alerts'
import {resendVerificationEmail} from '../../app/modules/auth/core/_requests'
import { TopBar } from './components/header/TopBar'

const MasterLayout = () => {
  const location = useLocation()
  const {currentUser, errMsg, successMsg, setSuccessMsg, setErrMsg, onHomePage} = useAuth()
  const [sendingEmail, setSendingStatus] = useState<boolean>(false)
  const [checked, setChecked] = useState<boolean>(false)
  const [_checked, _setChecked] = useState<boolean>(successMsg != "" || errMsg != "")
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

  if(successMessage !== "") {
    setTimeout(() => {
      setChecked(false);
      setTimeout(() => {
        setSuccessMessage("");
      }, 200);
    }, 5000);
  }

  if(errorMessage !== "") {
    setTimeout(() => {
      _setChecked(false);
      setTimeout(() => {
        setErrorMessage("");
      }, 200);
    }, 5000);
  }

  if(successMsg !== "") {
    setTimeout(() => {
      _setChecked(false);
      setTimeout(() => {
        setSuccessMsg("");
      }, 200);
    }, 5000);
  }

  if(errMsg !== "") {
    setTimeout(() => {
      setChecked(false);
      setTimeout(() => {
        setErrMsg("");
      }, 200);
    }, 5000);
  }

  useEffect(() => {
    reInitMenu()
  }, [location.key])

  const resendVerificationLink = () => {
    if(currentUser) {
      setSendingStatus(true)
      resendVerificationEmail(currentUser.id, currentUser.auth?.api_token)
      .then((response) => {
        if(response.data.success) {
          setSuccessMessage(response.data.message)
          setChecked(true)
          setSendingStatus(false)
        } else {
          setErrorMessage(response.data.message)
          setChecked(true)
          setSendingStatus(false)
        }
      })
    }
  }

  return (
    <PageDataProvider>
      <ThemeModeProvider>
        <div className='d-flex flex-column flex-root app-root' id='kt_app_root'>
          <div className='app-page flex-column flex-column-fluid' id='kt_app_page'>
            <TopBar />
            <div className='app-wrapper flex-column flex-row-fluid' id='kt_app_wrapper'>
              <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
                <div className='d-flex flex-column flex-column-fluid'>
                  {/* <ToolbarWrapper /> */}
                  <div className={`mt-4`}>
                    {successMsg !== "" ? (
                      <AlertSuccess message={successMsg} checked={_checked} />
                    ) : null }

                    {errMsg !== "" ? (
                      <AlertDanger message={errMsg} checked={_checked} />
                    ) : null }
                    
                    {successMessage !== "" ? (
                      <AlertSuccess message={successMessage} checked={checked} />
                    ) : null }

                    {errorMessage !== "" ? (
                      <AlertDanger message={errorMessage} checked={checked} />
                    ) : null }
                  </div>
                  {!currentUser?.accountStatus && 
                    <div className={`alert alert-warning show ${onHomePage ? 'add-homepage-margin' : 'reset-homepage-margin'}`} >
                      <div className='d-flex justify-content-center'>
                        <p className='my-auto me-3'>Verify your email address. Didn't receive verification email?</p>
                        <button 
                          className='btn btn-primary'
                          onClick={resendVerificationLink}
                        >
                          Resend

                          {sendingEmail && 
                              <span className='spinner-border spinner-border-sm align-middle ms-3'></span>
                          }
                        </button>
                      </div>
                    </div>
                  }
                  <Content>
                    <Outlet />
                  </Content>
                </div>
                {/* <FooterWrapper /> */}
              </div>
            </div>
          </div>
        </div>

        {/* begin:: Modals */}
        {/* <InviteUsers />
        <UpgradePlan /> */}
        {/* end:: Modals */}
        <ScrollTop />
      </ThemeModeProvider>
    </PageDataProvider>
  )
}

export {MasterLayout}
