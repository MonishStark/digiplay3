/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Yup from 'yup'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import { sendInvitation } from '../auth/core/_requests'
import { toAbsoluteUrl } from '../../../app/theme/helpers'
import { useAuth } from '../auth/core/Auth'
import { AlertDanger, AlertSuccess } from '../alerts/Alerts'
import { FormattedMessage, useIntl } from 'react-intl'
import { useAppContext } from '../../pages/AppContext/AppContext'

const invitationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Wrong email format')
    .min(5, 'Minimum 5 characters')
    .max(50, 'Maximum 50 characters')
    .required('Email is required'),
  role: Yup.string()
    .min(1, 'Minimum 1 characters')
    .max(1, 'Maximum 1 characters')
    .required('Password is required'),
})

const initialValues = {
  email: '',
  role: '',
}

/*
  Formik+YUP+Typescript:
  https://jaredpalmer.com/formik/docs/tutorial#getfieldprops
  https://medium.com/@maurice.de.beijer/yup-validation-and-typescript-and-formik-6c342578a20e
*/

export default function InviteUsers() {
  const [loading, setLoading] = useState(false)
  const { currentUser, auth } = useAuth()
  const navigate = useNavigate()
  const intl = useIntl();
  const { appData } = useAppContext();


  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [roleID, setRoleID] = useState([])

  const roleData = appData.roleData;

  useEffect(() => {
    if (auth?.user?.role != 1) {
      navigate('/error/500')
    }
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

  const formik = useFormik({
    initialValues,
    validationSchema: invitationSchema,
    onSubmit: async (values) => {
      setLoading(true)
      sendInvitation(
        currentUser?.id,
        values.email,
        values.role,
        currentUser?.companyId
      )
        .then((response) => {
          if (response.data.success) {
            setSuccessMessage(response.data.message)
            setChecked(true)
            setLoading(false)
          } else {
            setErrorMessage(response.data.message)
            setChecked(true)
            setLoading(false)
          }
        })
        .catch(() => {
          setErrorMessage('Failed to send invitation')
          setChecked(true)
          setLoading(false)
        })
    },
  })

  const handleRoleChange = (event: any) => {
    formik.setFieldValue('role', event.target.value)
  }

  return (
    <div className='d-flex flex-center flex-column flex-column-fluid p-10 pb-lg-20'>
      {/* begin::Wrapper */}
      <div className='w-lg-500px bg-body rounded shadow-sm p-10 p-lg-15 mx-auto'>
        <form
          className='form w-100'
          onSubmit={formik.handleSubmit}
          noValidate
        >
          {/* begin::Heading */}
          <div className='text-center mb-11'>
            <h1 className='text-dark fw-bolder mb-3'>Invite Users</h1>
          </div>
          {/* begin::Heading */}

          {successMessage !== "" ? (
            <AlertSuccess message={successMessage} checked={checked} />
          ) : null}

          {errorMessage !== "" ? (
            <AlertDanger message={errorMessage} checked={checked} />
          ) : null}

          <div className='fv-row mb-8'>
            <label className='form-label fs-6 fw-bolder text-dark'><FormattedMessage id='INVITATION.TABLE.EMAIL' /></label>
            <input
              placeholder={intl.formatMessage({ id: "AUTH.EMAIL" })}
              {...formik.getFieldProps('email')}
              className='form-control bg-transparent'
              type='email'
              name='email'
              autoComplete='off'
            />
            {formik.touched.email && formik.errors.email && (
              <div className='fv-plugins-message-container'>
                <span role='alert'>{formik.errors.email}</span>
              </div>
            )}
          </div>
          {/* end::Form group */}

          {/* begin::Form group Street Name */}
          <div className='fv-row mb-8'>
            <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id='INVITATION.TABLE.ROLE' /></label>
            <select
              value={formik.getFieldMeta('role').value}
              onChange={handleRoleChange}
              className='form-select form-select-lg form-select-solid'
              name='roles'
            >
              <option value="">Select a role</option>
              {roleData.map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.role}
                </option>
              ))}
            </select>
          </div>
          {/* end::Form group */}

          {/* begin::Action */}
          <div className='d-grid mb-10'>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={formik.isSubmitting || !formik.isValid || loading}
            >
              {!loading && <span className='indicator-label'>Invite User</span>}
              {loading && (
                <span className='indicator-progress' style={{ display: 'block' }}>
                  Inviting...
                  <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                </span>
              )}
            </button>

            <Link to='/manage-users'>
              <button
                type='button'
                id='kt_login_signup_form_cancel_button'
                className='mt-5 btn btn-lg btn-light-primary w-100 mb-5'
              >
                <FormattedMessage id='BUTTON.BACK' />
              </button>
            </Link>
          </div>
          {/* end::Action */}
        </form>
      </div>
      {/* end::Wrapper */}
    </div>
  )
}
