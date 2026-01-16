/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from 'react-bootstrap'
import { FormattedMessage } from 'react-intl'
import { KTIcon } from '../../../../../app/theme/helpers' 
import { useFormik } from 'formik'
import { superAdminDeleteTeamAccount, superAdminDeleteUser } from '../../api'

const modalsRoot = document.getElementById('root-modals') || document.body

const SuperDeleteModal = ({
  show,
  handleClose,
  id,
  deleteUserDetail,
  setSuccessResMessage,
  setFailureResMessage,
  setChecked,
  isCompanyAccount
}: any) => {
  const [loading, setLoading] = useState<boolean>(false)
  const initialValues = {
    id: id,
  }

  const formik = useFormik({
    initialValues,
    onSubmit: async () => {
      setLoading(true)
      if(isCompanyAccount){
        superAdminDeleteTeamAccount(id)
        .then((response) => {
          if (response.data.success) {
            setSuccessResMessage(response.data.message)
            setChecked(true)
            handleClose()
            setLoading(false)
          }
          else {
            setFailureResMessage(response.data.message)
            setChecked(true)
            handleClose()
            setLoading(false)
          }
        })
        .catch(() => {
          setFailureResMessage("Something went wrong")
          setChecked(true)
          handleClose()
          setLoading(false)
        })
      }
      else {
        superAdminDeleteUser({id: id})
        .then((response) => {
          if (response.data.success) {
            setSuccessResMessage(response.data.message)
            setChecked(true)
            handleClose()
            setLoading(false)
          }
          else {
            setFailureResMessage(response.data.message)
            setChecked(true)
            handleClose()
            setLoading(false)
          }
        })
        .catch((err) => {
          setFailureResMessage("Something went wrong")
          setChecked(true)
          handleClose()
          setLoading(false)
        })
      }
    },
  })

  return createPortal(
    <Modal
      id='create_team'
      tabIndex={-1}
      aria-hidden='true'
      dialogClassName='modal-dialog modal-dialog-centered mw-900px'
      show={show}
      onHide={handleClose}
      backdrop={true}
    >
      <div className='modal-header'>
        <h2>
          {
            isCompanyAccount ?
            <>
            Are you sure you want to delete Company - {deleteUserDetail.companyName}'s account?
            </>
            :
            <>
            Are you sure you want to delete User - {deleteUserDetail.firstname}'s account?
            </>
          }
        </h2>
        {/* begin::Close */}
        <div className='btn btn-sm btn-icon btn-active-color-primary' onClick={handleClose} data-bs-toggle="tooltip" title="Close">
          <KTIcon className='fs-1' iconName='cross' />
        </div>
        {/* end::Close */}
      </div>

      <div className='modal-body py-lg-10 px-lg-10'>
        <form
          className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
          noValidate
          id='kt_login_signup'
          onSubmit={formik.handleSubmit}
        >

          {/* begin::Form group */}
          <div className='text-center'>
            <button
              type='submit'
              id='kt_sign_up_submit'
              className='btn btn-lg btn-danger w-50 mb-5'
              disabled={loading}
            >
              {!loading && 
                <span className='indicator-label'>
                  Delete
                </span>}
              {loading && (
                <span className='indicator-progress' style={{ display: 'block' }}>
                  <FormattedMessage id='PROFILE.PLEASE_WAIT' />...{' '}
                  <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                </span>
              )}
            </button>
          </div>
          {/* end::Form group */}
        </form>
      </div>
    </Modal>,
    modalsRoot
  )
}

export { SuperDeleteModal }
