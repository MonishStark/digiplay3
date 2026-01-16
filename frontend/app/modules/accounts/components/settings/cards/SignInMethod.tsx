/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState } from 'react'
import { KTIcon } from '../../../../../theme/helpers'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { IUpdateEmail, IUpdatePassword, updateEmail, updatePassword } from '../SettingsModel'
import { changeCurrentPassword, updateEmailAddress, enable2FA, disable2FA,setPassword } from '../../../../auth/core/_requests'
import { useAuth } from '../../../../auth'
import { AlertDanger, AlertSuccess } from '../../../../alerts/Alerts'
import { FormattedMessage, useIntl } from 'react-intl'
import { AxiosResponse } from 'axios'
import { getSuperEmail } from '../../../../../pages/superAdminDashboard/api'

const SignInMethod: React.FC = () => {
  const [emailUpdateData, setEmailUpdateData] = useState<IUpdateEmail>(updateEmail)
  const [passwordUpdateData, setPasswordUpdateData] = useState<IUpdatePassword>(updatePassword)
  const { currentUser, setCurrentUser, saveAuth, auth } = useAuth()

  const [showEmailForm, setShowEmailForm] = useState<boolean>(false)
  const [showPasswordForm, setPasswordForm] = useState<boolean>(false)
  const [checked, setChecked] = useState<boolean>(false)
  const [checked1, setChecked1] = useState<boolean>(true)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

  let responseSuccessMessage = localStorage.getItem("responsesuccessmsg");
  let responseFailureMessage = localStorage.getItem("responsefailuresmsg")

  const [resSuccessMessage, setResSuccessMessage] = useState(responseSuccessMessage);
  const [resFailureMessage, setResFailureMessage] = useState(responseFailureMessage);
  const intl = useIntl()

  const emailFormValidationSchema = Yup.object().shape({
    newEmail: Yup.string()
      .email(intl.formatMessage({ id: 'PROFILE.EMAIL.WRONG_FORMAT' }))
      .min(5, intl.formatMessage({ id: "PROFILE.MIN5CHAR" }))
      .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
      .required(intl.formatMessage({ id: "PROFILE.EMAIL.REQUIRED" }))
      .test('email-domain', 'Invalid email domain', async (value) => {
        if (!value) {
          return false;
        }

        if (auth?.user?.role != '4') {
          return true;
        } else {
          const response: AxiosResponse<any> = await getSuperEmail();
          const fetchedSuperEmail = response?.data?.superEmail;
          if (fetchedSuperEmail === '*') {
            return true;
          }

          const validDomains = fetchedSuperEmail.split(',');
          return validDomains.some((domain: any) => value.toLowerCase().endsWith(`@${domain}`));
        }
      }),
    confirmPassword: Yup.string()
      .min(8, intl.formatMessage({ id: "PROFILE.MIN8CHAR" }))
      .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
      .required(intl.formatMessage({ id: "PROFILE.PASSWORD.REQUIRED" })),
  })

  const passwordFormValidationSchema = currentUser?.passwordSet
  ? Yup.object().shape({
      currentPassword: Yup.string()
        .min(8, intl.formatMessage({ id: "PROFILE.MIN8CHAR" }))
        .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
        .required(intl.formatMessage({ id: "PROFILE.PASSWORD.REQUIRED" })),
      newPassword: Yup.string()
        .min(8, intl.formatMessage({ id: "PROFILE.MIN8CHAR" }))
        .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
        .required(intl.formatMessage({ id: "PROFILE.PASSWORD.REQUIRED" })),
      passwordConfirmation: Yup.string()
        .min(8, intl.formatMessage({ id: "PROFILE.MIN8CHAR" }))
        .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
        .required(intl.formatMessage({ id: "PROFILE.PASSWORD.REQUIRED" }))
        .oneOf([Yup.ref('newPassword')], intl.formatMessage({ id: "PROFILE.PASSWORD_MATCH" })),
    })
  : Yup.object().shape({
      newPassword: Yup.string()
        .min(8, intl.formatMessage({ id: "PROFILE.MIN8CHAR" }))
        .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
        .required(intl.formatMessage({ id: "PROFILE.PASSWORD.REQUIRED" })),
      passwordConfirmation: Yup.string()
        .min(8, intl.formatMessage({ id: "PROFILE.MIN8CHAR" }))
        .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
        .required(intl.formatMessage({ id: "PROFILE.PASSWORD.REQUIRED" }))
        .oneOf([Yup.ref('newPassword')], intl.formatMessage({ id: "PROFILE.PASSWORD_MATCH" })),
    })


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

  if (responseSuccessMessage) {
    setTimeout(() => {
      localStorage.removeItem("responsesuccessmsg");
      setChecked1(false);
      setTimeout(() => {
        setResSuccessMessage("");
      }, 300);
    }, 5000);
  }

  if (responseFailureMessage) {
    setTimeout(() => {
      localStorage.removeItem("responsefailuresmsg");
      setChecked1(false);
      setTimeout(() => {
        setResFailureMessage("");
      }, 300);
    }, 5000);
  }

  const [loading1, setLoading1] = useState(false)

  const formik1 = useFormik<IUpdateEmail>({
    initialValues: {
      ...emailUpdateData,
    },
    validationSchema: emailFormValidationSchema,
    onSubmit: (values) => {
      setLoading1(true)
      setTimeout(() => {
        updateEmailAddress(currentUser?.id, values.newEmail, values.confirmPassword)
          .then((response) => {
            if (response.data.success) {
              setCurrentUser((user) => {
                const updatedUser = user
                if (updatedUser) {
                  updatedUser.accountStatus = response.data.accountStatus
                  updatedUser.email = response.data.email
                  updatedUser.twoFactorEnabled = false
                }

                let newAuth = auth
                if (newAuth && newAuth.user) {
                  newAuth.user = updatedUser
                }
                saveAuth(newAuth)

                return updatedUser
              })
              localStorage.setItem('responsesuccessmsg', response.data.message)
              window.location.reload();
            } else {
              setChecked(true)
              setErrorMessage(response.data.message)
              setLoading1(false)
            }
          })
          .catch((error) => {
            setChecked(true)
            const msg = error?.response?.data?.message || "Failed to update email"
            setErrorMessage(msg)
            setLoading1(false)
          })
      }, 1000)
    },
  })

  const [loading2, setLoading2] = useState(false)

  const formik2 = useFormik<IUpdatePassword>({
    initialValues: {
      ...passwordUpdateData,
    },
    validationSchema: passwordFormValidationSchema,
    onSubmit: (values) => {
      setLoading2(true)
      setTimeout(() => {
        if(!currentUser?.passwordSet){
          setPassword(currentUser?.id, values.newPassword)
          .then((res) => {
            if (res.data.success) {
              setPasswordUpdateData(updatePassword)
              setChecked(true)
              setSuccessMessage(res.data.message)
            } else {
              setChecked(true)
              setErrorMessage(res.data.message)
            }
            setLoading2(false)
            setPasswordForm(false)
          })
          .catch(() => {
            setChecked(true)
            setErrorMessage('Failed to update password')
            setLoading2(false)
            setPasswordForm(false)
          })
        }else{
          changeCurrentPassword(values.currentPassword, values.newPassword)
          .then((res) => {
            if (res.data.success) {
              setPasswordUpdateData(updatePassword)
              setChecked(true)
              setSuccessMessage(res.data.message)
            } else {
              setChecked(true)
              setErrorMessage(res.data.message)
            }
            setLoading2(false)
            setPasswordForm(false)
          })
          .catch(() => {
            setChecked(true)
            setErrorMessage('Failed to update password')
            setLoading2(false)
            setPasswordForm(false)
          })
        }
      }, 1000)
    },
  })

  const enableTwoFactorAuth = () => {
    enable2FA(currentUser?.id,true)
      .then((response) => {
        if (response.data.success) {
          setCurrentUser((user) => {
            const updatedUser = user
            if (updatedUser) {
              updatedUser.twoFactorEnabled = true
            }

            let newAuth = auth
            if (newAuth && newAuth.user) {
              newAuth.user = updatedUser
            }
            saveAuth(newAuth)

            return updatedUser
          })
          setChecked(true)
          setSuccessMessage(response.data.message)
        } else {
          setChecked(true)
          setErrorMessage(response.data.message)
        }
      })
  }

  const disableTwoFactorAuth = () => {
    enable2FA(currentUser?.id,false)
      .then((response) => {
        if (response.data.success) {
          setCurrentUser((user) => {
            const updatedUser = user
            if (updatedUser) {
              updatedUser.twoFactorEnabled = false
            }

            let newAuth = auth
            if (newAuth && newAuth.user) {
              newAuth.user = updatedUser
            }
            saveAuth(newAuth)

            return updatedUser
          })
          setChecked(true)
          setSuccessMessage(response.data.message)
        } else {
          setChecked(true)
          setErrorMessage(response.data.message)
        }
      })
  }

  const [showTooltip, setShowTooltip] = useState(false);

  const handleTooltipToggle = () => {
    if (!currentUser?.accountStatus) {
      setShowTooltip(!showTooltip);
    }
  };

  const handleOpenPasswordForm = () => {
    setPasswordForm(true);
  };

  const handleCancelPasswordForm = () => {
    setPasswordForm(false);
  };

  const handleShowEmailForm = () => {
    setShowEmailForm(true);
  };

  const handleCancelEmailForm = () => {
    setShowEmailForm(false);
  };

  return (
    <div className='card mb-5 mb-xl-10'>
      <div
        className='card-header border-0 cursor-pointer'
        role='button'
        data-bs-toggle='collapse'
        data-bs-target='#kt_account_signin_method'
      >
        <div className='card-title m-0'>
          <h3 className='fw-bolder m-0'><FormattedMessage id='PROFILE.SIGNINMETHOD' /></h3>
        </div>
      </div>

      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      {resSuccessMessage !== null && resSuccessMessage !== undefined && resSuccessMessage !== "" ? (
        <AlertSuccess message={resSuccessMessage} checked={checked1} />
      ) : null}

      {resFailureMessage !== null && resFailureMessage !== undefined && resFailureMessage !== "" ? (
        <AlertDanger message={resFailureMessage} checked={checked1} />
      ) : null}

      <div id='kt_account_signin_method' className='collapse show'>
        <div className='card-body border-top p-9'>
          <div className='d-flex flex-wrap align-items-center'>
            <div id='kt_signin_email' className={' ' + (showEmailForm && 'd-none')}>
              <div className='fs-6 fw-bolder mb-1'><FormattedMessage id='PROFILE.EMAIL_ADDRESS' /></div>
              <div className='fw-bold text-gray-600'>{currentUser?.email}</div>
            </div>

            <div
              id='kt_signin_email_edit'
              className={'flex-row-fluid ' + (!showEmailForm && 'd-none')}
            >
              <form
                onSubmit={formik1.handleSubmit}
                id='kt_signin_change_email'
                className='form'
                noValidate
              >
                <div className='row mb-6'>
                  <div className='col-lg-6 mb-4 mb-lg-0'>
                    <div className='fv-row mb-0'>
                      <label htmlFor='emailaddress' className='form-label fs-6 fw-bolder mb-3'>
                        <FormattedMessage id="PROFILE.ENTER_NEW_EMAIL" />
                      </label>
                      <input
                        type='email'
                        className='form-control form-control-lg form-control-solid'
                        id='emailaddress'
                        placeholder={intl.formatMessage({ id: "PROFILE.EMAIL_ADDRESS" })}
                        {...formik1.getFieldProps('newEmail')}
                      />
                      {formik1.touched.newEmail && formik1.errors.newEmail && (
                        <div className='fv-plugins-message-container'>
                          <div className='fv-help-block'>{formik1.errors.newEmail}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-lg-6'>
                    <div className='fv-row mb-0'>
                      <label
                        htmlFor='confirmemailpassword'
                        className='form-label fs-6 fw-bolder mb-3'
                      >
                        <FormattedMessage id="PROFILE.CONFIRM_PASSWORD" />
                      </label>
                      <input
                        type='password'
                        className='form-control form-control-lg form-control-solid'
                        id='confirmemailpassword'
                        {...formik1.getFieldProps('confirmPassword')}
                      />
                      {formik1.touched.confirmPassword && formik1.errors.confirmPassword && (
                        <div className='fv-plugins-message-container'>
                          <div className='fv-help-block'>{formik1.errors.confirmPassword}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className='d-flex'>
                  <button
                    id='kt_signin_submit'
                    type='submit'
                    className='btn btn-primary  me-2 px-6'
                  >
                    {!loading1 && intl.formatMessage({ id: 'PROFILE.UPDATE_EMAIL' })}
                    {loading1 && (
                      <span className='indicator-progress' style={{ display: 'block' }}>
                        {intl.formatMessage({ id: "PROFILE.PLEASE_WAIT" })}...{' '}
                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                      </span>
                    )}
                  </button>
                  <button
                    id='kt_signin_cancel'
                    type='button'
                    onClick={handleCancelEmailForm}
                    className='btn btn-color-gray-400 btn-active-light-primary px-6'
                  >
                    <FormattedMessage id="PROFILE.CANCEL" />
                  </button>
                </div>
              </form>
            </div>

            <div id='kt_signin_email_button' className={'ms-auto ' + (showEmailForm && 'd-none')}>
              <button
                onClick={handleShowEmailForm}
                className='btn btn-light btn-active-light-primary'
              >
                <FormattedMessage id="PROFILE.CHANGE_EMAIL" />
              </button>
            </div>
          </div>

          <div className='separator separator-dashed my-6'></div>

          <div className='d-flex flex-wrap align-items-center mb-10'>
            <div id='kt_signin_password' className={' ' + (showPasswordForm && 'd-none')}>
              <div className='fs-6 fw-bolder mb-1'><FormattedMessage id="PROFILE.PASSWORD" /></div>
              <div className='fw-bold text-gray-600'>{currentUser?.passwordSet ?"************":""}</div>
            </div>

            <div
              id='kt_signin_password_edit'
              className={'flex-row-fluid ' + (!showPasswordForm && 'd-none')}
            >
              <form
                onSubmit={formik2.handleSubmit}
                id='kt_signin_change_password'
                className='form'
                noValidate
              >
                <div className='row mb-1'>
                  {currentUser?.passwordSet && (
                    <div className='col-lg-4'>
                      <div className='fv-row mb-0'>
                        <label htmlFor='currentpassword' className='form-label fs-6 fw-bolder mb-3'>
                          <FormattedMessage id='PROFILE.CURRENT_PASSWORD' />
                        </label>
                        <input
                          type='password'
                          className='form-control form-control-lg form-control-solid '
                          id='currentpassword'
                          {...formik2.getFieldProps('currentPassword')}
                        />
                        {formik2.touched.currentPassword && formik2.errors.currentPassword && (
                          <div className='fv-plugins-message-container'>
                            <div className='fv-help-block'>{formik2.errors.currentPassword}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={currentUser?.passwordSet ? 'col-lg-4' : 'col-lg-6'}>
                    <div className='fv-row mb-0'>
                      <label htmlFor='newpassword' className='form-label fs-6 fw-bolder mb-3'>
                        <FormattedMessage id='PROFILE.NEW_PASSWORD' />
                      </label>
                      <input
                        type='password'
                        className='form-control form-control-lg form-control-solid '
                        id='newpassword'
                        {...formik2.getFieldProps('newPassword')}
                      />
                      {formik2.touched.newPassword && formik2.errors.newPassword && (
                        <div className='fv-plugins-message-container'>
                          <div className='fv-help-block'>{formik2.errors.newPassword}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='col-lg-4'>
                    <div className='fv-row mb-0'>
                      <label htmlFor='confirmpassword' className='form-label fs-6 fw-bolder mb-3'>
                        <FormattedMessage id="PROFILE.CONFIRM_NEW_PASSWORD" />
                      </label>
                      <input
                        type='password'
                        className='form-control form-control-lg form-control-solid '
                        id='confirmpassword'
                        {...formik2.getFieldProps('passwordConfirmation')}
                      />
                      {formik2.touched.passwordConfirmation && formik2.errors.passwordConfirmation && (
                        <div className='fv-plugins-message-container'>
                          <div className='fv-help-block'>{formik2.errors.passwordConfirmation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className='form-text mb-5'>
                  <FormattedMessage id='PROFILE.PASSWORD_RULE' />
                </div>

                <div className='d-flex'>
                  <button
                    id='kt_password_submit'
                    type='submit'
                    className='btn btn-primary me-2 px-6'
                  >
                    {!loading2 &&
                      (currentUser?.passwordSet
                        ? intl.formatMessage({ id: "PROFILE.UPDATE_PASSWORD" })
                        : intl.formatMessage({ id: "PROFILE.SET_PASSWORD" })
                      )
                    }
                    {loading2 && (
                      <span className='indicator-progress' style={{ display: 'block' }}>
                        {intl.formatMessage({ id: "PROFILE.PLEASE_WAIT" })}...{' '}
                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleCancelPasswordForm}
                    id='kt_password_cancel'
                    type='button'
                    className='btn btn-color-gray-400 btn-active-light-primary px-6'
                  >
                    <FormattedMessage id="PROFILE.CANCEL" />
                  </button>
                </div>
              </form>
            </div>

            <div
              id='kt_signin_password_button'
              className={'ms-auto ' + (showPasswordForm && 'd-none')}
            >
              <button
                onClick={handleOpenPasswordForm}
                className='btn btn-light btn-active-light-primary'
              >
                {currentUser?.passwordSet ? (
                  <FormattedMessage id='PROFILE.RESET_PASSWORD' />
                ) : (
                  <FormattedMessage id='PROFILE.SET_PASSWORD' />
                )}
              </button>
            </div>
          </div>

          <div className='notice d-flex bg-light-primary rounded border-primary border border-dashed p-6'
          title={currentUser?.accountStatus ? "" : "Please verify your account before enabling Two-factor authentication."}
          onClick={handleTooltipToggle}
          >
            {!currentUser?.accountStatus && showTooltip && (
              <div className="position-absolute top-80 start-50 translate-middle-x bg-dark text-white p-2 rounded mt-2 text-center d-md-none" style={{ zIndex: 10, maxWidth: '250px' }}>
                Please verify your account before enabling Two-factor authentication.
              </div>
            )}
            <KTIcon iconName='shield-tick' className='fs-2tx text-primary me-4' />
            <div className='d-flex flex-stack flex-grow-1 flex-wrap flex-md-nowrap'>
              <div className='mb-3 mb-md-0 fw-bold'>
                <h4 className='text-gray-800 fw-bolder'><FormattedMessage id='PROFILE.SECURE_ACCOUNT' /></h4>
                <div className='fs-6 text-gray-600 pe-7'>
                  <FormattedMessage id='PROFILE.2FA.PHRASE' />
                </div>
              </div>
              {currentUser?.twoFactorEnabled &&
                <button
                  onClick={disableTwoFactorAuth}
                  className='btn btn-light btn-active-light-primary'
                  disabled={!currentUser?.accountStatus}
                >
                  <FormattedMessage id='PROFILE.DISABLE' />
                </button>
              }
              {!currentUser?.twoFactorEnabled &&
                <button
                  className='btn btn-primary me-2 px-6'
                  onClick={enableTwoFactorAuth}
                  disabled={!currentUser?.accountStatus}
                  >
                  <FormattedMessage id='PROFILE.ENABLE' />
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { SignInMethod }
