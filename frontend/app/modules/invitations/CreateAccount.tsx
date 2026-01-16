/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import clsx from 'clsx'
import { useLocation, useNavigate } from 'react-router-dom'
import { getInvitationDataByEmail, createAccountForInvitedUsers, createAccountForSuperInvitedUsers } from './api'
import { useAuth } from '../auth'
import { PasswordMeterComponent } from '../../../app/theme/assets/ts/components'
import { AlertSuccess, AlertDanger } from '../alerts/Alerts'
import { KTIcon, toAbsoluteUrl } from '../../../app/theme/helpers'
import { useAppContext } from '../../pages/AppContext/AppContext'
import PhoneInput, { CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, useIntl } from 'react-intl'
import generatePKCE from '../auth/core/pkce'

const params = new URLSearchParams(window.location.search);
const token: string | null = params.get("token");
const email: string | null = params.get("email")
const registrationSchema = Yup.object().shape({
  firstname: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('First Name is required'),
  lastname: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Last Name is required'),
  mobileCountryCode: Yup.string()
    .test('not-only-plus','Invalid Country code', 
    (value) => !!value && /^\+\d+$/.test(value))
    .required('Country code is required'),
  mobileNumber: Yup.string()
    .min(10, 'Minimum 10 numbers')
    .max(14, 'Maximum 10 numbers')
    .required('Mobile number is required'),
  password: Yup.string()
    .min(8, 'Minimum 8 characters')
    .max(50, 'Maximum 50 characters')
    .required('Password is required'),
  changepassword: Yup.string()
    .min(8, 'Minimum 8 characters')
    .max(50, 'Maximum 50 characters')
    .required('Password confirmation is required')
    .oneOf([Yup.ref('password')], "Password and Confirm Password didn't match"),
})

export function CreateAccount() {
  const [loading, setLoading] = useState(false)
  const [fetchingInv, setFetchingInv] = useState<boolean>(true)
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [invitationData, setInvitationData] = useState<any>({})
  const navigate = useNavigate()
  const { saveAuth, setCurrentUser } = useAuth()
  const { appData } = useAppContext();
  const [signUpMethod, setSignUpMethod] = useState<any>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const intl = useIntl();
  const onSignUpMethodChange = (value: string) => {
    setSignUpMethod(value);
  };
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const status = params.get('status')
  useEffect(() => {
    const code = params.get('code')
    const pkceVerifier = sessionStorage.getItem('pkce_verifier') || ''
    const avatar = params.get('avatar')
    const firstname = params.get('firstname')
    const lastname = params.get('lastname')
    const email = params.get('email')
    const provider = params.get('provider')

     if (status == 'email_already_registered') {
      setChecked(true)
      setErrorMessage(intl.formatMessage({id: 'PROFILE.ERROR.EMAIL_EXISTS'}))
    }
    else if (status == 'success') {
      if(invitationData.email){
        setLoading(true)
            createAccountForInvitedUsers(
              firstname || '',
              lastname || '',
              email || invitationData.email,
              "",
              "",
              "",
              invitationData.companyId,
              invitationData.role,
              token,
              'social',
              'invited',
              avatar || '',
              code,
              pkceVerifier
            )
              .then((response) => {
                if (response.data.success) {
                  const auth = {
                    api_token: response.data.user.auth.accessToken,
                    user: response.data.user,
                    refresh_token:response.data.user.auth.refreshToken,
                    company:response.data.company
                  }
                  saveAuth(auth)
                  setCurrentUser(response.data.user)
                } else {
                  setErrorMessage(response.data.message)
                  setChecked(true)
                  setLoading(false)
                }
              })
            }
          } else if (status == "email_mismatch") {
            setErrorMessage('Wrong Email Selected.')
            setChecked(true)
            setTimeout(() => {
              window.location.reload();
            }, 4000);
          }
  }, [invitationData,status])
  useEffect(() => {
    getInvitationDataByEmail(email, token)
      .then((response) => {
        if (response.data.success && response.data.status == 'valid' ||"pending") {
          setInvitationData(response.data.invitationData)
          setFetchingInv(false)
        } else {
          if (response.data.status == 'invalid') {
            navigate('/status/invalid-invitation')
          } else if (response.data.status == 'expired') {
            navigate('/status/expired-invitation')
          } else if (response.data.status == 'declined') {
            navigate('/status/declined-invitation')
          } else if (response.data.status == 'registered') {
            navigate('/status/registered-invitation')
          } else if (response.data.status == 'invalid-token') {
            navigate('/status/invalid-token')
          }
        }
      })
      .catch((err) => console.log(err))
  }, [])

  if (successMessage !== "") {
    setTimeout(() => {
      setChecked(false);
      setTimeout(() => {
        setSuccessMessage("");
      }, 200);
    }, 5000);
  }

  if (errorMessage !== "") {
    setTimeout(() => {
      setChecked(false);
      setTimeout(() => {
        setErrorMessage("");
      }, 200);
    }, 5000);
  }

  const initialValues = {
    firstname: '',
    lastname: '',
    mobileNumber: '',
    mobileCountryCode: '+1',
    password: '',
    changepassword: '',
  }

  const formik = useFormik({
    initialValues,
    validationSchema: registrationSchema,
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setLoading(true)
      createAccountForInvitedUsers(
        values.firstname,
        values.lastname,
        invitationData.email,
        values.mobileCountryCode,
        values.mobileNumber,
        values.password,
        invitationData.companyId,
        invitationData.role,
        token,
        'email',
        'invited'
      )
        .then((response) => {
          if (response.data.success) {
            const auth = {
              api_token: response.data.user.auth.accessToken,
              refresh_token:response.data.user.auth.refreshToken,
              user: response.data.user
            }
            saveAuth(auth)
            setCurrentUser(response.data.user)
          } else {
            setErrorMessage(response.data.message)
            setChecked(true)
            setSubmitting(false)
            setLoading(false)
          }
        })
    }
  })

  useEffect(() => {
    PasswordMeterComponent.bootstrap()
  }, [])

  const openGoogleSignInWindow = async() => {
    onSignUpMethodChange('social')
    const {codeVerifier, codeChallenge} = await generatePKCE()
    sessionStorage.setItem('pkce_verifier', codeVerifier)
    window.location.href = `${
      import.meta.env.VITE_APP_BACKEND_URL
    }/auth/providers/google?flow=invited&invite_email=${email}&invite_token=${token}&pkce_challenge=${codeChallenge}`
  };

  const openMicrosoftSignInWindow = () => {
    onSignUpMethodChange('social')
    window.location.href = `${
        import.meta.env.VITE_APP_BACKEND_URL
      }/auth/providers/microsoft?flow=invited&invite_email=${email}&invite_token=${token}&platform=web&pkce_challenge=${codeChallenge}`

  };

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Keep only digits
    formik.setFieldValue('mobileNumber', val);
  };

  const handleCountryChange = (
    _value: string,
    countryData: CountryData
  ): void => {
    formik.setFieldValue('mobileCountryCode', `+${countryData.dialCode}`);
    formik.setFieldTouched('mobileCountryCode', true, false);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSignUpMethodEmail = () => {
    onSignUpMethodChange('social');
  };

  const handleSignUpMethodGoogle = () => {
    onSignUpMethodChange('social');
  };

  return (
    <>
      {!fetchingInv &&
        <form
          className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
          noValidate
          id='kt_login_signup_form'
          onSubmit={formik.handleSubmit}
        >
          {/* begin::Heading */}
          <div className='text-center mb-11'>
            {/* begin::Title */}
            <h1 className='text-dark fw-bolder mb-3'><FormattedMessage id="SUPERADMIN.CREATE" /></h1>
            {/* end::Title */}
          </div>
          {/* end::Heading */}

          {successMessage !== "" ? (
            <AlertSuccess message={successMessage} checked={checked} />
          ) : null}

          {errorMessage !== "" ? (
            <AlertDanger message={errorMessage} checked={checked} />
          ) : null}

          {appData?.socialAuth  && (
            <>
              <div className='d-flex justify-content-center align-items-center gap-2'>
                <div className="mb6">
                  <input
                    type="radio"
                    className="btn-check"
                    name="signUpMethod"
                    value="social"
                    id="google"
                    checked={signUpMethod === 'social'}
                    onChange={handleSignUpMethodGoogle}
                  />
                  <button
                    type='button'
                    className={`btn btn-flex btn-outline btn-text-gray-700 btn-active-color-primary flex-center text-nowrap w-100 ${signUpMethod === 'social' ? '' : 'bg-state-light'}`}
                    onClick={openGoogleSignInWindow}
                  >
                    <img
                      alt="Logo"
                      src={toAbsoluteUrl('/media/svg/brand-logos/google-icon.svg')}
                      className="h-15px me-3"
                    />
                    <FormattedMessage id="AUTH.REGISTER.GOOGLE" />
                  </button>
                </div>

                <div className="mb6">
                  <input
                    type="radio"
                    className="btn-check"
                    name="signUpMethod"
                    value="social"
                    id="microsoft"
                    checked={signUpMethod === 'social'}
                    onChange={handleSignUpMethodGoogle}
                  />
                  <button
                    type='button'
                    className={`btn btn-flex btn-outline btn-text-gray-700 btn-active-color-primary flex-center text-nowrap w-100 ${signUpMethod === 'social' ? '' : 'bg-state-light'}`}
                    onClick={openMicrosoftSignInWindow}
                  >
                    <img
                      alt="Logo"
                      src={toAbsoluteUrl('/media/svg/brand-logos/microsoft-5.svg')}
                      className="h-15px me-3"
                    />
                    <FormattedMessage id="AUTH.REGISTER.MICROSOFT" />
                  </button>
                </div>
              </div>

              {/* begin::Separator */}
              <div className='separator separator-content my8 mt-8'>
                <span className='w-125px fw-semibold fs-7'><FormattedMessage id="AUTH.REGISTER.EMAIL" />
                </span>
              </div>
              {/* end::Separator */}
            </>
          )}

          <input
            type="radio"
            className="btn-check"
            name="signUpMethod"
            value="email"
            id="email"
            checked={signUpMethod === 'email'}
            onChange={handleSignUpMethodEmail}
          />
          <label
            className={`btn p7 px-0 d-flex align-items-center ${formik.isValid ? 'btnoutline btn-success-light' : 'btn-outlinedashed'}`}
            htmlFor='email'
          >
            <span className='w-100 fw-bold text-start'>

              {/* begin::Form group First Name */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="PROFILE.FIRSTNAME" />
                </label>
                <input
                  placeholder={intl.formatMessage({ id: 'PROFILE.FIRSTNAME' })}
                  type='text'
                  autoComplete='off'
                  {...formik.getFieldProps('firstname')}
                  className={clsx(
                    'form-control bg-transparent',
                    {
                      'is-invalid': formik.touched.firstname && formik.errors.firstname,
                    },
                    {
                      'is-valid': formik.touched.firstname && !formik.errors.firstname,
                    }
                  )}
                />
                {formik.touched.firstname && formik.errors.firstname && (
                  <div className='fv-plugins-message-container'>
                    <div className='fv-help-block'>
                      <span role='alert'>{formik.errors.firstname}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* end::Form group */}

              {/* begin::Form group First Name */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="PROFILE.LASTNAME" /></label>
                <input
                  placeholder={intl.formatMessage({ id: 'PROFILE.LASTNAME' })}
                  type='text'
                  autoComplete='off'
                  {...formik.getFieldProps('lastname')}
                  className={clsx(
                    'form-control bg-transparent',
                    {
                      'is-invalid': formik.touched.lastname && formik.errors.lastname,
                    },
                    {
                      'is-valid': formik.touched.lastname && !formik.errors.lastname,
                    }
                  )}
                />
                {formik.touched.lastname && formik.errors.lastname && (
                  <div className='fv-plugins-message-container'>
                    <div className='fv-help-block'>
                      <span role='alert'>{formik.errors.lastname}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* end::Form group */}

              {/* begin::Form group Email */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'>Email</label>
                <input
                  placeholder={intl.formatMessage({ id: "AUTH.EMAIL" })}
                  type='email'
                  autoComplete='off'
                  value={invitationData.email}
                  className='form-control bg-transparent'
                  disabled={true}
                />
              </div>
              {/* end::Form group */}

              {/* begin::Form group Phone number */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="PROFILE.MOBILENUM" /> </label>
                <div className='d-flex gap-3 align-items-center'>
                  
                  <div className='w-50'>
                    <div className='col-lg-14 fv-row d-flex align-items-center'>
                      <PhoneInput
                        country={formik.values.mobileCountryCode === '+1' ? 'us' : undefined}
                        value={formik.values.mobileCountryCode}
                        onChange={handleCountryChange}
                        inputProps={{
                          name: 'mobileCountryCode',
                          readOnly: true,
                        }}
                        inputStyle={{
                          width: '110px',
                          paddingLeft: '55px',  // spacing between flag and code
                          height: '38px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                        buttonStyle={{
                          marginLeft: '0px',
                          border: 'none',
                          background: 'transparent',
                        }}
                        containerStyle={{
                          width: '110px',
                          position: 'relative',
                        }}
                        dropdownStyle={{
                          zIndex: 1000,
                        }}
                      />
                    </div>
                  </div>

                  {/* Mobile number input */}
                  <div className='flex-grow-1 position-relative'>
                    <input
                      placeholder={intl.formatMessage({ id: 'PROFILE.MOBILENUM' })}
                      type='text'
                          value={formik.values.mobileNumber}
                          onChange={handleMobileNumberChange}
                          onBlur={formik.handleBlur}
                          name='mobileNumber'
                      className={clsx(
                        'form-control bg-transparent',
                        { 'is-invalid': formik.touched.mobileNumber && formik.errors.mobileNumber, },
                        { 'is-valid': formik.touched.mobileNumber && !formik.errors.mobileNumber, }
                      )}
                    />
                  </div>
                </div>
                {formik.touched.mobileCountryCode && formik.errors.mobileCountryCode && (
                  <div className='fv-help-block text-danger mt-1 fw-normal'>
                      {formik.errors.mobileCountryCode}
                  </div>
                )}
                {formik.touched.mobileNumber && formik.errors.mobileNumber && (
                  <div className='fv-plugins-message-container'>
                    <div className='fv-help-block'>
                      <span role='alert'>{formik.errors.mobileNumber}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* end::Form group */}

              {/* begin::Form group Password */}
              <div className='fv-row mb-8' data-kt-password-meter='true'>
                <div className='mb-1'>
                  <label className='form-label fw-bolder text-dark fs-6'>Password</label>
                  <div className='position-relative mb-3'>
                    <div className='position-relative mb-3'>
                      <div className='d-flex align-items-center justify-content-end position-relative my-1'>
                        <span
                          className={clsx(
                            'position-absolute me-3',
                            { 'me-10': formik.touched.password && formik.errors.password, },
                            { 'me-10': formik.touched.password && !formik.errors.password, }
                          )}
                          onClick={handleTogglePassword}
                        >
                          {showPassword ? (
                            <KTIcon iconName='eye-slash' className='fs-1' />
                          ) : (
                            <KTIcon iconName='eye' className='fs-1' />
                          )}
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='Password'
                          autoComplete='off'
                          maxLength={50}
                          {...formik.getFieldProps('password')}
                          className={clsx(
                            'form-control bg-transparent pe-12',
                            { 'is-invalid pe-20': formik.touched.password && formik.errors.password, },
                            { 'is-valid pe-20': formik.touched.password && !formik.errors.password, },
                          )}
                        />
                      </div>
                      {formik.touched.password && formik.errors.password && (
                        <div className='fv-plugins-message-container'>
                          <div className='fv-help-block'>
                            <span role='alert'>{formik.errors.password}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* begin::Meter */}
                  <div
                    className='d-flex align-items-center mb-3'
                    data-kt-password-meter-control='highlight'
                  >
                    <div className='flex-grow-1 bg-secondary bg-active-success rounded h-5px me-2'></div>
                    <div className='flex-grow-1 bg-secondary bg-active-success rounded h-5px me-2'></div>
                    <div className='flex-grow-1 bg-secondary bg-active-success rounded h-5px me-2'></div>
                    <div className='flex-grow-1 bg-secondary bg-active-success rounded h-5px'></div>
                  </div>
                  {/* end::Meter */}
                </div>
                <div className='text-muted'>
                  <FormattedMessage id="AUTH.REGISTER.PASS_RULE" />
                </div>
              </div>
              {/* end::Form group */}

              {/* begin::Form group Confirm password */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'>Confirm Password</label>
                <div className='d-flex align-items-center justify-content-end position-relative my-1'>
                  <span
                    className={clsx(
                      'position-absolute me-3',
                      { 'me-10': formik.touched.changepassword && formik.errors.changepassword, },
                      { 'me-10': formik.touched.changepassword && !formik.errors.changepassword, }
                    )}
                    onClick={handleToggleConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <KTIcon iconName='eye-slash' className='fs-1' />
                    ) : (
                      <KTIcon iconName='eye' className='fs-1' />
                    )}
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder='Password confirmation'
                    autoComplete='off'
                    maxLength={50}
                    {...formik.getFieldProps('changepassword')}
                    className={clsx(
                      'form-control bg-transparent pe-12',
                      { 'is-invalid pe-20': formik.touched.changepassword && formik.errors.changepassword, },
                      { 'is-valid pe-20': formik.touched.changepassword && !formik.errors.changepassword, }
                    )}
                  />
                </div>
                {formik.touched.changepassword && formik.errors.changepassword && (
                  <div className='fv-plugins-message-container'>
                    <div className='fv-help-block'>
                      <span role='alert'>{formik.errors.changepassword}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* end::Form group */}

              {/* begin::Form group */}
              <div className='text-center'>
                <button
                  type='submit'
                  id='kt_sign_up_submit'
                  className='btn btn-lg btn-primary w-100 mb-5'
                //   disabled={formik.isSubmitting || !formik.isValid || loading}
                >
                  {!loading && <span className='indicator-label'>Join Organization</span>}
                  {loading && (
                    <span className='indicator-progress' style={{ display: 'block' }}>
                      <FormattedMessage id="BUTTON.WAIT" />{' '}
                      <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                    </span>
                  )}
                </button>
              </div>
              {/* end::Form group */}

            </span>
          </label>
        </form>
      }
      {fetchingInv &&
        <div className='d-flex justify-content-center mx-auto my-auto'>
          <div className='w-50px h-50px'>
            <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
          </div>
        </div>
      }
    </>
  )
}