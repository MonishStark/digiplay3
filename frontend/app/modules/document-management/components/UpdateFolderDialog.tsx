/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from 'react-bootstrap'
import { FormattedMessage } from 'react-intl'
import { KTIcon } from '../../../../app/theme/helpers'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { updateFolder } from '../api'

type Props = {
  show: boolean
  handleClose: () => void
  folderIdToEdit: any
  currentFolderDataToEdit: any
  setActiveFoldersAndFilesList: any
  setChecked: any
  setSuccessResMessage: any
  setFailureResMessage: any
  currentParent: any
  currentTeam: any
  searchString: string
  closeSideBar: any
}

const folderUpdateSchema = Yup.object().shape({
  folderName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Folder name is required'),
  folderDescription: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
  // .required('Team Name is required'),
})

interface FolderUpdateModel {
  folderName: string
  folderDescription: string
}

const modalsRoot = document.getElementById('root-modals') || document.body

const UpdateFolderDialog = ({
  show,
  handleClose,
  folderIdToEdit,
  currentFolderDataToEdit,
  setActiveFoldersAndFilesList,
  setChecked,
  setSuccessResMessage,
  setFailureResMessage,
  currentParent,
  currentTeam,
  searchString,
  closeSideBar
}: Props) => {

  const [loading, setLoading] = useState<boolean>(false)
  const initialValues: FolderUpdateModel = {
    folderName: '',
    folderDescription: ''
  }

  const formik = useFormik({
    initialValues,
    validationSchema: folderUpdateSchema,
    onSubmit: async (values) => {
      setLoading(true)
      updateFolder(
        folderIdToEdit,
        values.folderName,
        values.folderDescription,
        currentTeam,
      )
        .then((response) => {
          if (response.data.success) {
            // setActiveFoldersAndFilesList(response.data.filesAndFolders)
            // setSuccessResMessage(response.data.message)
            // setChecked(true)
            setLoading(false)
          } else {
            setFailureResMessage(response.data.message)
            setChecked(true)
            setLoading(false)
          }
        })
        .then(() => {
          formik.resetForm()
          handleClose()
          closeSideBar()
        })
        .catch(() => {
          setFailureResMessage('Failed to update a folder')
          setChecked(true)
          setLoading(false)
        })
    },
  })

  useEffect(() => {
    if (currentFolderDataToEdit) {
      formik.setFieldValue('folderName', currentFolderDataToEdit.name)
      formik.setFieldValue('folderDescription', currentFolderDataToEdit.tooltip)
    }
  }, [currentFolderDataToEdit])

  return createPortal(
    <Modal
      id='create_team_modal'
      tabIndex={-1}
      aria-hidden='true'
      dialogClassName='modal-dialog modal-dialog-centered mw-900px'
      show={show}
      onHide={handleClose}
      backdrop={true}
    >
      <div className='modal-header'>
        <h2>
          <FormattedMessage id='DOCUMENTS.BTNS.UPDATE_FOLDER' />
        </h2>
        {/* begin::Close */}
        <div className='btn btn-sm btn-icon btn-active-color-primary' onClick={handleClose}>
          <KTIcon className='fs-1' iconName='cross' />
        </div>
        {/* end::Close */}
      </div>

      <div className='modal-body py-lg-10 px-lg-10'>
        <form
          className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
          noValidate
          id='kt_login_signup_form'
          onSubmit={formik.handleSubmit}
        >

          {/* begin::Form group First Name */}
          <div className='fv-row mb-8'>
            <label className='form-label fw-bolder text-dark fs-4'><FormattedMessage id='DOCUMENTS.FOLDER_NAME' /></label>
            <input
              placeholder='Folder Name'
              type='text'
              autoComplete='off'
              {...formik.getFieldProps('folderName')}
              className={'form-control bg-transparent'}
            />
            {formik.touched.folderName && formik.errors.folderName && (
              <div className='fv-plugins-message-container'>
                <div className='fv-help-block'>
                  <span role='alert'>{formik.errors.folderName}</span>
                </div>
              </div>
            )}
          </div>
          {/* end::Form group */}

          {/* begin::Form group First Name */}
          <div className='fv-row mb-8'>
            <label className='form-label fw-bolder text-dark fs-4'><FormattedMessage id='DOCUMENTS.FOLDER_DESC' /></label>
            <input
              placeholder='Folder Description'
              type='text'
              autoComplete='off'
              {...formik.getFieldProps('folderDescription')}
              className={'form-control bg-transparent'}
            />
            {formik.touched.folderDescription && formik.errors.folderDescription && (
              <div className='fv-plugins-message-container'>
                <div className='fv-help-block'>
                  <span role='alert'>{formik.errors.folderDescription}</span>
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
              className='btn btn-lg btn-primary w-50 mb-5'
              disabled={formik.isSubmitting || !formik.isValid || loading}
            >
              {!loading && <span className='indicator-label'><FormattedMessage id='BUTTON.UPDATE' /></span>}
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

export { UpdateFolderDialog }
