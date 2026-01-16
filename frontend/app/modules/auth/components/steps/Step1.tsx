import React, {useEffect, useState} from 'react'
import clsx from 'clsx'
import * as Yup from 'yup'
import {useFormik} from 'formik'
import {PasswordMeterComponent} from '../../../../theme/assets/ts/components/_PasswordMeterComponent'
import {KTIcon, toAbsoluteUrl} from '../../../../theme/helpers'
import {useAppContext} from '../../../../pages/AppContext/AppContext'
import PhoneInput, {CountryData} from 'react-phone-input-2'
import 'react-phone-input-2/lib/bootstrap.css'
import {FormattedMessage, useIntl} from 'react-intl'
import {useLocation} from 'react-router-dom'
import generatePKCE from '../../core/pkce'

interface Step1Props {
  userDetails: {
    firstname?: string
    lastname?: string
    email?: string
    mobileCountryCode: string
    mobileNumber?: string
    password?: string
  }
  signUpMethod: string
  onSignUpMethodChange: (value: string) => void
  onUserDetailsChange: (details: {[key: string]: string}) => void
  setSuccessGoogleLogin: (value: boolean) => void
  setAvatarUrl: (value: string) => void
  setErrorMessage: any
  setChecked: any
}

const initialValues = {
  firstname: '',
  lastname: '',
  email: '',
  mobileCountryCode: '+1',
  mobileNumber: '',
  password: '',
  changepassword: '',
}

const Step1: React.FC<Step1Props> = ({
  userDetails,
  signUpMethod,
  onSignUpMethodChange,
  onUserDetailsChange,
  setSuccessGoogleLogin,
  setAvatarUrl,
  setErrorMessage,
  setChecked,
}) => {
  const isSelected = (type: string) => signUpMethod === type
  const [userMobNumb, setUserMobNumb] = useState<any>('')
  const {appData} = useAppContext()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const intl = useIntl()

  const registrationSchema = () => {
    return Yup.object().shape({
      firstname: Yup.string()
        .trim()
        .min(3, intl.formatMessage({id: 'PROFILE.ERROR.MIN_FIRSTNAME'}))
        .max(50, intl.formatMessage({id: 'PROFILE.ERROR.MAX_FIRSTNAME'}))
        .required(intl.formatMessage({id: 'PROFILE.ERROR.REQUIRED_FIRSTNAME'})),

      lastname: Yup.string()
        .trim()
        .min(3, intl.formatMessage({id: 'PROFILE.ERROR.MIN_LASTNAME'}))
        .max(50, intl.formatMessage({id: 'PROFILE.ERROR.MAX_LASTNAME'}))
        .required(intl.formatMessage({id: 'PROFILE.ERROR.REQUIRED_LASTNAME'})),

      email: Yup.string()
        .trim()
        .email(intl.formatMessage({id: 'PROFILE.ERROR.INVALID_EMAIL'}))
        .min(5, intl.formatMessage({id: 'PROFILE.ERROR.MIN_EMAIL'}))
        .max(50, intl.formatMessage({id: 'PROFILE.ERROR.MAX_EMAIL'}))
        .required(intl.formatMessage({id: 'PROFILE.ERROR.REQUIRED_EMAIL'})),

      mobileNumber: Yup.string()
        .trim()
        .min(10, intl.formatMessage({id: 'PROFILE.ERROR.MIN_MOBILE'}))
        .max(15, intl.formatMessage({id: 'PROFILE.ERROR.MAX_MOBILE'}))
        .required(intl.formatMessage({id: 'PROFILE.ERROR.REQUIRED_MOBILE'})),

      password: Yup.string()
        .trim()
        .min(8, intl.formatMessage({id: 'PROFILE.ERROR.MIN_PASSWORD'}))
        .max(50, intl.formatMessage({id: 'PROFILE.ERROR.MAX_PASSWORD'}))
        .matches(/[A-Z]/, intl.formatMessage({id: 'PROFILE.ERROR.PASSWORD_UPPERCASE'}))
        .matches(/[a-z]/, intl.formatMessage({id: 'PROFILE.ERROR.PASSWORD_LOWERCASE'}))
        .matches(/[0-9]/, intl.formatMessage({id: 'PROFILE.ERROR.PASSWORD_NUMBER'}))
        .matches(/[^A-Za-z0-9]/, intl.formatMessage({id: 'PROFILE.ERROR.PASSWORD_SYMBOL'}))
        .required(intl.formatMessage({id: 'PROFILE.ERROR.REQUIRED_PASSWORD'})),

      changepassword: Yup.string()
        .trim()
        .min(8, intl.formatMessage({id: 'PROFILE.ERROR.MIN_CONFIRM_PASSWORD'}))
        .max(50, intl.formatMessage({id: 'PROFILE.ERROR.MAX_CONFIRM_PASSWORD'}))
        .oneOf([Yup.ref('password')], intl.formatMessage({id: 'PROFILE.ERROR.PASSWORD_MISMATCH'}))
        .required(intl.formatMessage({id: 'PROFILE.ERROR.REQUIRED_CONFIRM_PASSWORD'})),
    })
  }

  const formik = useFormik({
    initialValues,
    validationSchema: registrationSchema,
    onSubmit: (values) => {
      onUserDetailsChange(values)
    },
  })

  function debounce<T extends (...args: any[]) => void>(func: T, delay = 500) {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), delay)
    }
  }
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  useEffect(() => {
    const status = params.get('status')
    const code = params.get('code')
    const avatar = params.get('avatar')
    const firstname = params.get('firstname')
    const lastname = params.get('lastname')
    const email = params.get('email')
    if (status == 'success' && firstname && email) {
      onSignUpMethodChange('social')
      setAvatarUrl(avatar || '')

      onUserDetailsChange({
        firstname: firstname || '',
        lastname: lastname || '',
        email: email || '',
        code: code || ''
      })
      setSuccessGoogleLogin(true)
    } else if (status == 'email_already_registered' && email) {
      setChecked(true)

      setErrorMessage(intl.formatMessage({id: 'PROFILE.ERROR.EMAIL_EXISTS'}))
    }
  }, [])

  useEffect(() => {
    // Skip API check if email is not touched or has another validation error
    if (
      !formik.touched.email ||
      (formik.errors.email &&
        formik.errors.email !== intl.formatMessage({id: 'PROFILE.ERROR.EMAIL_EXISTS'}))
    ) {
      return
    }

    const controller = new AbortController() // cancel previous requests
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_APP_BACKEND_URL}/auth/email/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({email: formik.values.email}),
          signal: controller.signal,
        })

        const data = await res.json()
        const emailExistsMsg = intl.formatMessage({id: 'PROFILE.ERROR.EMAIL_EXISTS'})

        if (data.exists) {
          if (formik.errors.email !== emailExistsMsg) {
            formik.setFieldError('email', emailExistsMsg)
          }
        } else {
          if (formik.errors.email === emailExistsMsg) {
            formik.setFieldError('email', undefined)
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Email check failed', error)
        }
      }
    }, 600) // 600ms debounce delay

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [formik.values.email, formik.errors.email, formik.touched.email, intl])

  const handlePhoneNumberChange = (e: any, numbertype: 'Mobile') => {
    if (numbertype == 'Mobile') {
      const formattedPhoneNumber = formatPhoneNumber(e.target.value)
      setUserMobNumb(formattedPhoneNumber)
    }
  }

  const formatPhoneNumber = (value: string) => {
    if (!value) return value
    const phoneNumber = value.replace(/[^\d]/g, '')
    const phoneNumberLength = phoneNumber.length
    if (phoneNumberLength < 4) return phoneNumber
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }

  useEffect(() => {
    formik.setFieldValue('mobileNumber', userMobNumb)
  }, [userMobNumb])

  useEffect(() => {
    PasswordMeterComponent.bootstrap()
  }, [])
  useEffect(() => {
  if (formik.isValid && params.get('status') !== 'success') {
      onUserDetailsChange(formik.values)
    }

    if (formik.touched && signUpMethod == 'email' && params.get('status') !== 'success') {
      onSignUpMethodChange('email')
    }
  }, [formik.values, formik.isValid])

  const openGoogleSignInWindow = async() => {
    onSignUpMethodChange('social')
    const {codeVerifier, codeChallenge} = await generatePKCE()
    sessionStorage.setItem('pkce_verifier', codeVerifier)
    window.location.href = `${
      import.meta.env.VITE_APP_BACKEND_URL
    }/auth/providers/google?flow=registration&platform=web&pkce_challenge=${codeChallenge}`
  }

  const openMicrosoftSignInWindow = async() => {
    onSignUpMethodChange('social')
    try {
      const {codeVerifier, codeChallenge} = await generatePKCE()
      sessionStorage.setItem('pkce_verifier', codeVerifier)
      window.location.href = `${
        import.meta.env.VITE_APP_BACKEND_URL
      }/auth/providers/microsoft?flow=registration&platform=web&pkce_challenge=${codeChallenge}`
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (userDetails) {
      formik.setFieldValue('firstname', userDetails.firstname)
      formik.setFieldValue('lastname', userDetails.lastname)
      formik.setFieldValue('email', userDetails.email)
      formik.setFieldValue('mobileCountryCode', userDetails.mobileCountryCode)
      formik.setFieldValue('mobileNumber', userDetails.mobileNumber)
      formik.setFieldValue('password', userDetails.password)
      formik.setFieldValue('changepassword', userDetails.password)
    }
  }, [])

  // useEffect(() => {
  //   setAvatarUrl('')
  //   onUserDetailsChange({
  //     firstname: '',
  //     lastname: '',
  //     email: '',
  //     mobileNumber: '',
  //     password: '',
  //     mobileCountryCode: initialValues.mobileCountryCode,
  //   })
  //   setSuccessGoogleLogin(false)
  // }, [])

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhoneNumberChange(e, 'Mobile')
  }

  const handleCountryChange = (value: string, countryData: CountryData) => {
    if (countryData) {
      formik.setFieldValue('mobileCountryCode', countryData.dialCode)
      formik.setFieldTouched('mobileCountryCode', true, false)
    }
  }

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const handleTogglePassword = () => {
    setShowPassword(!showPassword)
  }

  const handleSignUpMethodChange = (method: string) => () => {
    onSignUpMethodChange(method)
  }
  return (
    <div>
      <h2 className='fw-bolder d-flex align-items-center text-dark mb-10'>
        <FormattedMessage id='AUTH.REGISTER.CHOOSE_METHOD' />
        <i
          className='fas fa-exclamation-circle ms-2 fs-7'
          data-bs-toggle='tooltip'
          title={intl.formatMessage({id: 'AUTH.REGISTER.BILLING'})}
        ></i>
      </h2>
      <div className='row formcheck'>
        {appData?.socialAuth && (
          <>
            <div className='d-flex justify-content-center align-items-center gap-2'>
              <div>
                <input
                  type='radio'
                  className='btn-check'
                  name='signUpMethod'
                  value='social'
                  id='google'
                  checked={isSelected('social')}
                  onChange={handleSignUpMethodChange('social')}
                />
                <button
                  type='button'
                  className={`btn btn-flex btn-outline btn-text-gray-700 btn-active-color-primary flex-center text-nowrap w-100 ${
                    isSelected('google') ? '' : 'bg-state-light'
                  }`}
                  onClick={openGoogleSignInWindow}
                >
                  <img
                    alt='Logo'
                    src={toAbsoluteUrl('/media/svg/brand-logos/google-icon.svg')}
                    className='h-15px me-3'
                  />
                  <FormattedMessage id='AUTH.REGISTER.GOOGLE' />
                </button>
              </div>
              <div>
                <input
                  type='radio'
                  className='btn-check'
                  name='signUpMethod'
                  value='social'
                  id='microsoft'
                  checked={isSelected('social')}
                  onChange={handleSignUpMethodChange('social')}
                />
                <button
                  type='button'
                  className={`btn btn-flex btn-outline btn-text-gray-700 btn-active-color-primary flex-center text-nowrap w-100 ${
                    isSelected('google') ? '' : 'bg-state-light'
                  }`}
                  onClick={openMicrosoftSignInWindow}
                >
                  <img
                    alt='Logo'
                    src={toAbsoluteUrl('/media/svg/brand-logos/microsoft-5.svg')}
                    className='h-15px me-3'
                  />
                  <FormattedMessage id='AUTH.REGISTER.MICROSOFT' />
                </button>
              </div>
            </div>

            {/* begin::Separator */}
            <div className='separator separator-content my-8'>
              <span className='w-125px fw-semibold fs-7'>
                <FormattedMessage id='AUTH.REGISTER.EMAIL' />
              </span>
            </div>
            {/* end::Separator */}
          </>
        )}

        <div className='mb-6'>
          <input
            type='radio'
            className='btn-check'
            name='signUpMethod'
            value='email'
            id='email'
            // checked={signUpMethod === 'email'}
            checked={isSelected('email')}
            onChange={handleSignUpMethodChange('email')}
          />
          <label
            className={`btn btn-outline btn-outline-default mb-10 p-7 d-flex align-items-center ${
              formik.isValid ? 'btn-outline-success' : 'btn-outline-dashed'
            }`}
            htmlFor='email'
          >
            <span className='w-100 fw-bold text-start'>
              {/* begin::Form group First Name */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'>
                  <FormattedMessage id='PROFILE.FIRSTNAME' />
                </label>
                <input
                  placeholder={intl.formatMessage({id: 'PROFILE.FIRSTNAME'})}
                  type='text'
                  autoComplete='off'
                  {...formik.getFieldProps('firstname')}
                  className={clsx(
                    'form-control bg-transparent',
                    {'is-invalid': formik.touched.firstname && formik.errors.firstname},
                    {'is-valid': formik.touched.firstname && !formik.errors.firstname}
                  )}
                />
                {formik.touched.firstname && formik.errors.firstname && (
                  <div className='fv-help-block text-danger fw-normal'>
                    <span role='alert'>{formik.errors.firstname}</span>
                  </div>
                )}
              </div>
              {/* end::Form group */}
              {/* begin::Form group First Name */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'>
                  <FormattedMessage id='PROFILE.LASTNAME' />
                </label>
                <input
                  placeholder={intl.formatMessage({id: 'PROFILE.LASTNAME'})}
                  type='text'
                  autoComplete='off'
                  {...formik.getFieldProps('lastname')}
                  className={clsx(
                    'form-control bg-transparent',
                    {'is-invalid': formik.touched.lastname && formik.errors.lastname},
                    {'is-valid': formik.touched.lastname && !formik.errors.lastname}
                  )}
                />
                {formik.touched.lastname && formik.errors.lastname && (
                  <div className='fv-help-block text-danger fw-normal'>
                    <span role='alert'>{formik.errors.lastname}</span>
                  </div>
                )}
              </div>
              {/* end::Form group */}

              {/* begin::Form group Email */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'>
                  <FormattedMessage id='AUTH.EMAIL' />
                </label>
                <input
                  placeholder={intl.formatMessage({id: 'AUTH.EMAIL'})}
                  type='email'
                  autoComplete='off'
                  {...formik.getFieldProps('email')}
                  className={clsx(
                    'form-control bg-transparent',
                    {'is-invalid': formik.touched.email && formik.errors.email},
                    {'is-valid': formik.touched.email && !formik.errors.email}
                  )}
                />
                {formik.touched.email && formik.errors.email && (
                  <div className='fv-help-block text-danger fw-normal'>
                    <span role='alert'>{formik.errors.email}</span>
                  </div>
                )}
              </div>
              {/* end::Form group */}

              {/* begin::Form group Phone number */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'>
                  <FormattedMessage id='PROFILE.MOBILENUM' />
                </label>
                <div className='d-flex gap-3 align-items-center'>
                  <div className='w-50'>
                    <div className='col-lg-14 fv-row d-flex align-items-center'>
                      <PhoneInput
                        country={'us'}
                        value={formik.values.mobileCountryCode}
                        onChange={handleCountryChange}
                        inputProps={{
                          name: 'mobileCountryCode',
                          readOnly: true,
                        }}
                        inputStyle={{
                          width: '110px',
                          paddingLeft: '55px', // creates spacing between flag and code
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
                      placeholder={intl.formatMessage({id: 'PROFILE.MOBILENUM'})}
                      type='text'
                      value={formik.values.mobileNumber}
                      onChange={handleMobileChange}
                      onBlur={formik.handleBlur}
                      name='mobileNumber'
                      className={clsx(
                        'form-control bg-transparent',
                        {'is-invalid': formik.touched.mobileNumber && formik.errors.mobileNumber},
                        {'is-valid': formik.touched.mobileNumber && !formik.errors.mobileNumber}
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
                  <div className='fv-help-block text-danger fw-normal'>
                    <span role='alert'>{formik.errors.mobileNumber}</span>
                  </div>
                )}
              </div>
              {/* end::Form group */}

              {/* begin::Form group Password */}
              <div className='fv-row mb-8' data-kt-password-meter='true'>
                <div className='mb-1'>
                  <label className='form-label fw-bolder text-dark fs-6'>
                    <FormattedMessage id='PROFILE.PASSWORD' />
                  </label>
                  <div className='position-relative mb-3'>
                    <div className='d-flex align-items-center justify-content-end position-relative my-1'>
                      <span
                        className={clsx(
                          'position-absolute me-3',
                          {'me-10': formik.touched.password && formik.errors.password},
                          {'me-10': formik.touched.password && !formik.errors.password}
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
                        placeholder={intl.formatMessage({id: 'PROFILE.PASSWORD'})}
                        autoComplete='off'
                        {...formik.getFieldProps('password')}
                        className={clsx(
                          'form-control bg-transparent pe-12',
                          {'is-invalid pe-20': formik.touched.password && formik.errors.password},
                          {'is-valid pe-20': formik.touched.password && !formik.errors.password}
                        )}
                      />
                    </div>
                    {formik.touched.password && formik.errors.password && (
                      <div className='fv-help-block text-danger fw-normal'>
                        <span role='alert'>{formik.errors.password}</span>
                      </div>
                    )}
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
                  <FormattedMessage id='AUTH.REGISTER.PASS_RULE' />
                </div>
              </div>
              {/* end::Form group */}

              {/* begin::Form group Confirm password */}
              <div className='fv-row mb-8'>
                <label className='form-label fw-bolder text-dark fs-6'>
                  <FormattedMessage id='PROFILE.CONFIRM_PASSWORD' />
                </label>
                <div className='d-flex align-items-center justify-content-end position-relative my-1'>
                  <span
                    className={clsx(
                      'position-absolute me-3',
                      {'me-10': formik.touched.changepassword && formik.errors.changepassword},
                      {'me-10': formik.touched.changepassword && !formik.errors.changepassword}
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
                    placeholder={intl.formatMessage({id: 'PROFILE.CONFIRM_PASSWORD'})}
                    autoComplete='off'
                    {...formik.getFieldProps('changepassword')}
                    className={clsx(
                      'form-control bg-transparent pe-12',
                      {
                        'is-invalid pe-20':
                          formik.touched.changepassword && formik.errors.changepassword,
                      },
                      {
                        'is-valid pe-20':
                          formik.touched.changepassword && !formik.errors.changepassword,
                      }
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
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default Step1
