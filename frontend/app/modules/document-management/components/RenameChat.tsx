/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from 'react-bootstrap'
import { FormattedMessage, useIntl } from 'react-intl'
import { KTIcon } from '../../../../app/theme/helpers'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { renameChatHistory } from '../api'


type Props = {
  show: boolean
  handleClose: () => void
  chatIdToEdit: any
  currentChatDataToEdit: any
  setChecked: any
  setSuccessResMessage: any
  setFailureResMessage: any
  currentParent: any
  currentTeam: any
  closeSideBar: any
  setChatHistories: any
  fileId:any
  type:any
}

const renameChatSchema = Yup.object().shape({
  chatName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Chat Name is required')
})

interface RenameChatModel {
  chatName: string
}

const modalsRoot = document.getElementById('root-modals') || document.body

const RenameChatHistory = ({
  show,
  handleClose,
  chatIdToEdit,
  currentChatDataToEdit,
  setChecked,
  setSuccessResMessage,
  setFailureResMessage,
  currentTeam,
  closeSideBar,
  setChatHistories,
  fileId,
  type,
  fetchChats
}: Props) => {

  const [loading, setLoading] = useState<boolean>(false)
  const initialValues: RenameChatModel = {
    chatName: ''
  }
  const intl = useIntl();
  const formik = useFormik({
    initialValues,
    validationSchema: renameChatSchema,
    onSubmit: async (values) => {
      setLoading(true)
      renameChatHistory(chatIdToEdit, values.chatName, currentTeam, fileId,type)
        .then((response) => {
          if (response.data.success) {
            // setChatHistories(response.data.userChatHistories)
            // setSuccessResMessage(response.data.message)
          fetchChats(response.data.chat.id);

            setChecked(true)
            setLoading(false)
          } else {
            setFailureResMessage(response.data.message)
            setChecked(true)
            setLoading(false)
          }
        })
        .then(() => {
          handleClose()
          closeSideBar()
        })
        .catch((err) => {
          console.log(err)
          setFailureResMessage('Failed to update chat history')
          setChecked(true)
          setLoading(false)
        })
    },
  })

  useEffect(() => {
    if (currentChatDataToEdit) {
      formik.setFieldValue('chatName', currentChatDataToEdit.name)
    }
  }, [currentChatDataToEdit])

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
          <FormattedMessage id='DOCUMENTS.RENAME_CHAT' />
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
            <label className='form-label fw-bolder text-dark fs-4'><FormattedMessage id='DOCUMENTS.CHAT_NAME' /></label>
            <input
              placeholder={intl.formatMessage({ id: 'DOCUMENTS.CHAT_NAME' })}
              type='text'
              autoComplete='off'
              {...formik.getFieldProps('chatName')}
              className={'form-control bg-transparent'}
            />
            {formik.touched.chatName && formik.errors.chatName && (
              <div className='fv-plugins-message-container'>
                <div className='fv-help-block'>
                  <span role='alert'>{formik.errors.chatName}</span>
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
              {!loading && <span className='indicator-label'><FormattedMessage id='BUTTON.RENAME' /></span>}
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

export { RenameChatHistory }
