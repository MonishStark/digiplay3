import { useState } from 'react'
import * as Yup from 'yup'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import { requestPasswordResetLink } from '../core/_requests'
import { FormattedMessage, useIntl } from 'react-intl'

const initialValues = {
  email: '',
}

export function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [hasErrors, setHasErrors] = useState<boolean | undefined>(undefined)
  const intl = useIntl()

  const forgotPasswordSchema = Yup.object().shape({
    email: Yup.string()
      .email(intl.formatMessage({ id: 'PROFILE.EMAIL.WRONG_FORMAT' }))
      .min(5, intl.formatMessage({ id: "PROFILE.MIN5CHAR" }))
      .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
      .required(intl.formatMessage({ id: "PROFILE.EMAIL.REQUIRED" })),
  })

  const formik = useFormik({
    initialValues,
    validationSchema: forgotPasswordSchema,
    onSubmit: (values, { setStatus, setSubmitting }) => {
      setLoading(true)
      setHasErrors(undefined)
      setTimeout(() => {
        requestPasswordResetLink(values.email)
          .then((response) => {
            if (response.data.success) {
              setHasErrors(false)
              setLoading(false)
            } else {
              setHasErrors(true)
              setLoading(false)
              setSubmitting(false)
              setStatus(response.data.message)
            }
          })
          .catch(() => {
            setHasErrors(true)
            setLoading(false)
            setSubmitting(false)
            setStatus('The login detail is incorrect')
          })
      }, 1000)
    },
  })

  return (
    <form
      className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
      noValidate
      id='kt_login_password_reset_form'
      onSubmit={formik.handleSubmit}
    >
      <div className='text-center mb-10'>
        {/* begin::Title */}
        <h1 className='text-dark fw-bolder mb-3'><FormattedMessage id='AUTH.FORGOT_PASSWORD' /> ?</h1>
        {/* end::Title */}

        {/* begin::Link */}
        <div className='text-gray-500 fw-semibold fs-6'>
          <FormattedMessage id='AUTH.FORGOT_PASSWORD.ENTER_EMAIL' />
        </div>
        {/* end::Link */}
      </div>

      {/* begin::Title */}
      {hasErrors === true && (
        <div className='mb-lg-15 alert alert-danger'>
          <div className='alert-text font-weight-bold'>
            <FormattedMessage id='AUTH.FORGOT_PASSWORD.HAS_ERROR' />
          </div>
        </div>
      )}

      {hasErrors === false && (
        <div className='mb-10 bg-light-info p-8 rounded'>
          <div className='text-info'><FormattedMessage id='AUTH.FORGOT_PASSWORD.SENT' /></div>
        </div>
      )}
      {/* end::Title */}

      {/* begin::Form group */}
      <div className='fv-row mb-8'>
        <label className='form-label fw-bolder text-gray-900 fs-6'><FormattedMessage id="AUTH.EMAIL" /></label>
        <input
          type='email'
          placeholder=''
          autoComplete='off'
          {...formik.getFieldProps('email')}
          className={clsx(
            'form-control bg-transparent',
            { 'is-invalid': formik.touched.email && formik.errors.email },
            {
              'is-valid': formik.touched.email && !formik.errors.email,
            }
          )}
        />
        {formik.touched.email && formik.errors.email && (
          <div className='fv-plugins-message-container'>
            <div className='fv-help-block'>
              <span role='alert'>{formik.errors.email}</span>
            </div>
          </div>
        )}
      </div>
      {/* end::Form group */}

      {/* begin::Form group */}
      <div className='d-flex flex-wrap justify-content-center pb-lg-0'>
        <button type='submit' id='kt_password_reset_submit' className='btn btn-primary me-4'>
          <span className='indicator-label'><FormattedMessage id='BUTTON.SUBMIT' /></span>
          {loading && (
            <span className='indicator-progress'>
              <FormattedMessage id='PROFILE.PLEASE_WAIT' />...
              <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
            </span>
          )}
        </button>
        <Link to='/auth/login'>
          <button
            type='button'
            id='kt_login_password_reset_form_cancel_button'
            className='btn btn-light'
            disabled={formik.isSubmitting || !formik.isValid}
          >
            <FormattedMessage id='BUTTON.CANCEL' />
          </button>
        </Link>{' '}
      </div>
      {/* end::Form group */}
    </form>
  )
}
