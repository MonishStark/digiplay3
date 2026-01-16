/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import clsx from 'clsx'
import { resetPassword } from '../core/_requests'
import { Link } from 'react-router-dom'
import { PasswordMeterComponent } from '../../../../app/theme/assets/ts/components'
import { AlertSuccess, AlertDanger } from '../../alerts/Alerts'
import { FormattedMessage } from 'react-intl'

const initialValues = {
  password: '',
  changepassword: '',
}

const params = new URLSearchParams(window.location.search);

const token: string | null = params.get("token");
const email: string | null = params.get("email")

const registrationSchema = Yup.object().shape({
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

export function ResetPassword() {
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

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

  const formik = useFormik({
    initialValues,
    validationSchema: registrationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setLoading(true)
      resetPassword(email, token, values.password)
        .then((response) => {
          if (response.data.success) {
            setChecked(true)
            setSuccessMessage(response.data.message)
            setSubmitting(false)
            setLoading(false)
          } else {
            setChecked(true)
            setErrorMessage(response.data.message)
            setSubmitting(false)
            setLoading(false)
          }
        })
        .catch(() => {
          setChecked(true)
          setErrorMessage('Failed to reset password')
          setSubmitting(false)
          setLoading(false)
        })
    }
  })

  useEffect(() => {
    PasswordMeterComponent.bootstrap()
  }, [])

  return (
    <form
      className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
      noValidate
      id='kt_login_signup_form'
      onSubmit={formik.handleSubmit}
    >
      {/* begin::Heading */}
      <div className='text-center mb-11'>
        {/* begin::Title */}
        <h1 className='text-dark fw-bolder mb-3'><FormattedMessage id='AUTH.RESET_PASSWORD.TITLE' /></h1>
        {/* end::Title */}
      </div>
      {/* end::Heading */}

      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      {/* begin::Form group Password */}
      <div className='fv-row mb-8' data-kt-password-meter='true'>
        <div className='mb-1'>
          <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id='PROFILE.PASSWORD' /></label>
          <div className='position-relative mb-3'>
            <input
              type='password'
              placeholder='Password'
              autoComplete='off'
              {...formik.getFieldProps('password')}
              className={clsx(
                'form-control bg-transparent',
                {
                  'is-invalid': formik.touched.password && formik.errors.password,
                },
                {
                  'is-valid': formik.touched.password && !formik.errors.password,
                }
              )}
            />
            {formik.touched.password && formik.errors.password && (
              <div className='fv-plugins-message-container'>
                <div className='fv-help-block'>
                  <span role='alert'>{formik.errors.password}</span>
                </div>
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
        <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id='PROFILE.CONFIRM_PASSWORD' /></label>
        <input
          type='password'
          placeholder='Password confirmation'
          autoComplete='off'
          {...formik.getFieldProps('changepassword')}
          className={clsx(
            'form-control bg-transparent',
            {
              'is-invalid': formik.touched.changepassword && formik.errors.changepassword,
            },
            {
              'is-valid': formik.touched.changepassword && !formik.errors.changepassword,
            }
          )}
        />
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
          disabled={formik.isSubmitting || !formik.isValid || loading}
        >
          {!loading && <span className='indicator-label'><FormattedMessage id='AUTH.RESET_PASSWORD.RESET' /></span>}
          {loading && (
            <span className='indicator-progress' style={{ display: 'block' }}>
              <FormattedMessage id='PROFILE.PLEASE_WAIT' />...{' '}
              <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
            </span>
          )}
        </button>
        <Link to='/auth/login'>
          <button
            type='button'
            id='kt_login_signup_form_cancel_button'
            className='btn btn-lg btn-light-primary w-100 mb-5'
          >
            <FormattedMessage id='BUTTON.CANCEL' />
          </button>
        </Link>
      </div>
      {/* end::Form group */}
    </form>
  )
}
