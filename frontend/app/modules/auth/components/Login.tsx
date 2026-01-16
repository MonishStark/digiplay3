/* eslint-disable jsx-a11y/anchor-is-valid */
import {useEffect, useRef, useState, useCallback} from 'react'
import * as Yup from 'yup'
import clsx from 'clsx'
import {Link, useLocation} from 'react-router-dom'
import {useFormik} from 'formik'
import {FormattedMessage, useIntl} from 'react-intl'
import {validateCredential, login, validateSocialCredential} from '../core/_requests'
import {toAbsoluteUrl} from '../../../theme/helpers'
import {useAuth} from '../core/Auth'
import {AlertDanger, AlertSuccess} from '../../alerts/Alerts'
import {useAppContext} from '../../../pages/AppContext/AppContext'
import {SidebarLogo} from '../../../../app/theme/layout/components/sidebar/SidebarLogo'
import {themeMenuModeLSKey, themeModelSKey} from '../../../theme/partials'
import {useLanguage} from '../../../theme/providers'
import {I18N_LANGUAGES} from '../../../theme/i18n/config'
import generatePKCE from '../core/pkce'

import unionTop from '../../../../background-images/Union.png'
import unionBottom from '../../../../background-images/Unionbottom.png'
import envelope from '../../../../background-images/envelope.png'
import lock from '../../../../background-images/lock.png'

const initialValues = {email: '', password: ''}

// --- Utilities ---

export function Login() {
  const [loading, setLoading] = useState(false)
  const [isValidated, setIsValidated] = useState<boolean>(false)
  const [loginPhase, setLoginPhase] = useState<string>('pre')
  const [otp, setOTP] = useState<string>('')
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const {saveAuth, setCurrentUser} = useAuth()
  const {changeLanguage} = useLanguage()
  const intl = useIntl()
  const location = useLocation()
  const {appData} = useAppContext()
  const sidebarRef = useRef<HTMLDivElement>(null)

  // --- Helper: Centralized Auth Logic ---
  const handleAuthSuccess = useCallback(
    (data: any) => {
      const {user, company} = data
      const auth = {
        api_token: user.auth.accessToken,
        refresh_token: user.auth.refreshToken,
        user,
        company,
      }

      const language = I18N_LANGUAGES.find((lang) => lang.code === user.language) || 'en'
      changeLanguage(language)
      saveAuth(auth)
      setCurrentUser({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        accountStatus: user.accountStatus,
        phoneNumberCountryCode: company?.phoneNumberCountryCode,
        phoneNumber: company?.phoneNumber,
        mobileCountryCode: user.mobileCountryCode,
        mobileNumber: user.mobileNumber,
        companyId: company?.companyId,
        companyName: company?.companyName,
        password: undefined,
        mailingAddress: company?.mailingAddress,
        role: user.role,
        auth: user.auth,
        billingAddress: company?.billingAddress,
        orgType: company?.orgType,
        avatarUrl: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled,
        companytwoFactorEnabled: company?.companytwoFactorEnabled,
        companyLogo: company?.companyLogo,
        accountType: user.accountType,
        language: user.language,
        companyLanguage: company?.language,
      })

      if (localStorage.getItem('mode') === 'dark') {
        localStorage.setItem(themeModelSKey, 'dark')
        localStorage.setItem('current-parent', '')
        localStorage.setItem(themeMenuModeLSKey, 'dark')
        document.documentElement.setAttribute('data-bs-theme', 'dark')
      }
    },
    [changeLanguage, saveAuth, setCurrentUser]
  )

  // --- Social Redirect Callback ---
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const status = params.get('status')
    const code = params.get('code')

    if (status === 'email_not_registered') {
      setChecked(true)
      setErrorMessage('No account found with this email address.')
      return
    }

    if (status === 'success' && code) {
      const pkceVerifier = sessionStorage.getItem('pkce_verifier') || ''
      validateSocialCredential(code, 'social', pkceVerifier).then((response) => {
        if (!response.data.success) {
          setChecked(true)
          setErrorMessage(response.data.message)
          return
        }
        if (response.data.twoFactorEnabled) {
          setIsValidated(true)
          setLoginPhase('post')
        } else {
          handleAuthSuccess(response.data)
        }
      })
    }
  }, [location.search, handleAuthSuccess])

  useEffect(() => {
    sessionStorage.removeItem('registrationFormData')
  }, [])

  const loginSchema = Yup.object().shape({
    email: Yup.string()
      .email(intl.formatMessage({id: 'PROFILE.EMAIL.WRONG_FORMAT'}))
      .min(5, intl.formatMessage({id: 'PROFILE.MIN5CHAR'}))
      .max(50, intl.formatMessage({id: 'PROFILE.MAX50CHAR'}))
      .required(intl.formatMessage({id: 'PROFILE.EMAIL.REQUIRED'})),
    password: Yup.string()
      .min(8, intl.formatMessage({id: 'PROFILE.MIN8CHAR'}))
      .max(50, intl.formatMessage({id: 'PROFILE.MAX50CHAR'}))
      .required(intl.formatMessage({id: 'PROFILE.PASSWORD.REQUIRED'})),
  })

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values, {setSubmitting}) => {
      setLoading(true)
      try {
        if (loginPhase === 'pre') {
          const res = await validateCredential(values.email, values.password, 'standard')
          if (!res.data.success) {
            setErrorMessage(res.data.message)
            setChecked(true)
          } else if (res.data.twoFactorEnabled) {
            setIsValidated(true)
            setLoginPhase('post')
            setOTP('')
          } else {
            handleAuthSuccess(res.data)
          }
        } else {
          if (!otp) {
            setErrorMessage('Enter OTP')
            setChecked(true)
          } else {
            const res = await login(values.email, otp)
            if (!res.data.success) {
              setErrorMessage(res.data.message)
              setChecked(true)
            } else {
              handleAuthSuccess(res.data)
            }
          }
        }
      } catch (err) {
        setErrorMessage('The login details are incorrect')
        setChecked(true)
        saveAuth(undefined)
      } finally {
        setLoading(false)
        setSubmitting(false)
      }
    },
  })

  const resendOTP = async () => {
    try {
      const res = await validateCredential(formik.values.email, formik.values.password, 'standard')
      setChecked(true)
      res.data.success
        ? setSuccessMessage('OTP sent to your inbox')
        : setErrorMessage('Failed to resend OTP')
    } catch {
      setChecked(true)
      setErrorMessage('Failed to resend OTP')
    }
  }

  const handleSocialSignIn = async (provider: 'google' | 'microsoft') => {
    const {codeVerifier, codeChallenge} = await generatePKCE()
    sessionStorage.setItem('pkce_verifier', codeVerifier)
    window.location.href = `${
      import.meta.env.VITE_APP_BACKEND_URL
    }/auth/providers/${provider}?flow=login&platform=web&pkce_challenge=${codeChallenge}`
  }

  return (
    <div className='container bg-transparent mob-center'>
      <div className='login-logo-shift'>
        <SidebarLogo sidebarRef={sidebarRef} />
      </div>
      <div className='row mobile-d-flex'>
        <div className='col-6 d-flex align-items-center justify-content-center'>
          <img src={appData.appIcon} alt='Logo' className='img-fluid' />
        </div>
        <div className='col-6 d-flex align-items-center justify-content-center'>
          <form
            className='form rounded shadow-sm p-10 bg-white main-form'
            onSubmit={formik.handleSubmit}
            noValidate
            id='kt_login_signin_form'
          >
            <img src={unionTop} alt='union' className='union-top' />
            <div className='text-center fw-bolder fs-1 text-nowrap'>
              <h1>
                <FormattedMessage id='AUTH.WELCOME_TO' />{' '}
                <span className='text-capitalize'>{appData.appName}</span>
              </h1>
            </div>

            <div
              className={`row mx-15 mt-8 mb-8 d-flex justify-content-center align-items-center ${
                !appData?.socialAuth ? 'margin-mobile' : ''
              }`}
            >
              <div className='col-6 border-bottom login-margin'>
                <div className='text-center'>
                  <h3 className='text-primary fw-bolder text-nowrap'>
                    <span className='border-bottom border-primary border-5 pb-2'>
                      <FormattedMessage id='AUTH.LOGIN' />
                    </span>
                  </h3>
                </div>
              </div>
              {appData?.signUpMode && (
                <div className='col-6 border-bottom signup-margin' style={{pointerEvents: 'all'}}>
                  <div className='text-center text-nowrap'>
                    <h3 className='text-dark fw-bolder'>
                      <Link to='/auth/registration' className='text-decoration-none text-dark'>
                        <FormattedMessage id='AUTH.SIGNUP' />
                      </Link>
                    </h3>
                  </div>
                </div>
              )}
            </div>

            {successMessage && <AlertSuccess message={successMessage} checked={checked} />}
            {errorMessage && <AlertDanger message={errorMessage} checked={checked} />}

            {!isValidated ? (
              <>
                <div style={{position: 'relative'}} className='fv-row mb-7'>
                  <input
                    placeholder={intl.formatMessage({id: 'AUTH.EMAIL'})}
                    {...formik.getFieldProps('email')}
                    className={clsx('form-control bg-light form-custom-input', {
                      'is-invalid': formik.touched.email && formik.errors.email,
                      'is-valid': formik.touched.email && !formik.errors.email,
                    })}
                    type='email'
                    autoComplete='off'
                  />
                  {!formik.touched.email && <img src={envelope} className='input-icon' alt='' />}
                  {formik.touched.email && formik.errors.email && (
                    <div className='login-msg-container'>
                      <div className='fv-help-block'>
                        <span>{formik.errors.email}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{position: 'relative'}} className='fv-row mb-3'>
                  <input
                    placeholder={intl.formatMessage({id: 'AUTH.PASSWORD'})}
                    type='password'
                    autoComplete='off'
                    {...formik.getFieldProps('password')}
                    className={clsx('form-control bg-light form-custom-input', {
                      'is-invalid': formik.touched.password && formik.errors.password,
                      'is-valid': formik.touched.password && !formik.errors.password,
                    })}
                  />
                  {!formik.touched.password && formik.values.password.length === 0 && (
                    <img src={lock} className='input-icon' alt='' />
                  )}
                  {formik.touched.password && formik.errors.password && (
                    <div className='login-msg-container'>
                      <div className='fv-help-block'>
                        <span>{formik.errors.password}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className='d-flex flex-stack flex-wrap gap-3 fs-base fw-semibold mb-7'>
                  <div />
                  <Link
                    to='/auth/forgot-password'
                    className='text-decoration-none text-dark fw-bold'
                  >
                    <FormattedMessage id='AUTH.FORGOT_PASSWORD' /> ?
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className='fv-row mb-3'>
                  <label className='form-label fw-bolder text-dark fs-6 mb-0'>
                    <FormattedMessage id='AUTH.ENTER_OTP' />
                  </label>
                  <input
                    type='text'
                    className='form-control bg-transparent'
                    value={otp}
                    onChange={(e) => setOTP(e.target.value)}
                  />
                </div>
                <div className='d-flex flex-stack flex-wrap gap-3 fs-base fw-semibold mb-8'>
                  <span onClick={resendOTP} className='cursor-pointer link-primary'>
                    <FormattedMessage id='AUTH.RESEND_OTP' />
                  </span>
                </div>
              </>
            )}

            <div className='text-gray-500 text-center fw-semibold fs-6 mt-7'>
              <button
                type='submit'
                className='btn btn-primary rounded-pill border'
                disabled={formik.isSubmitting || !formik.isValid || loading}
              >
                {!loading ? (
                  <span className='indicator-label fs-4 d-flex align-items-center justify-content-center'>
                    <FormattedMessage id='AUTH.LOGIN_NOW' />
                    <i className='fa-solid fa-circle-arrow-right fs-1 ms-4'></i>
                  </span>
                ) : (
                  <span className='indicator-progress' style={{display: 'block'}}>
                    <FormattedMessage id='PROFILE.PLEASE_WAIT' />
                    ...
                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                  </span>
                )}
              </button>
            </div>

            {appData?.socialAuth && (
              <div className='text-gray-500 text-center fw-semibold fs-6 mt-7'>
                <div className='container d-flex align-items-center'>
                  <div className='line flex-grow-1 border-top border-dark mx-2'></div>
                  <div className='text-nowrap'>
                    <FormattedMessage id='AUTH.CONTINUE' />
                  </div>
                  <div className='line flex-grow-1 border-top border-dark mx-2'></div>
                </div>
                <div className='d-flex justify-content-center align-items-center gap-2'>
                  {['google', 'microsoft'].map((provider) => (
                    <div className='fv-row mt-5' key={provider}>
                      <button
                        type='button'
                        className='btn btn-flex btn-outline btn-text-gray-700 btn-active-color-primary bg-state-light flex-center text-nowrap custom-btn google-btn rounded-pill border'
                        onClick={() => handleSocialSignIn(provider as any)}
                      >
                        <img
                          alt='Logo'
                          src={toAbsoluteUrl(
                            `/media/svg/brand-logos/${
                              provider === 'google' ? 'google-icon' : 'microsoft-5'
                            }.svg`
                          )}
                          className='h-15px me-3'
                        />
                        <FormattedMessage
                          id={
                            loginPhase === 'post'
                              ? `AUTH.LOGIN.SUBMIT_${provider.toUpperCase()}_OTP`
                              : `AUTH.LOGIN.${provider.toUpperCase()}`
                          }
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className='text-primary pt-4 fs-5 text-justify'>
              <FormattedMessage id='AUTH.LOGIN.TERMS' />
            </p>
            <img src={unionBottom} alt='union' className='union-bottom' />
          </form>
        </div>
      </div>
    </div>
  )
}
