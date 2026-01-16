/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from 'react-bootstrap'
import { FormattedMessage, useIntl } from 'react-intl'
import { KTIcon } from '../../../theme/helpers'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { storeCurrentTeam, useAuth } from '../../auth'
import { createTeam, checkIfAliasExist } from '../api'

type Props = {
  show: boolean
  handleClose: () => void
  offset: number
  limit: number
  setSuccessResMessage: any
  setFailureResMessage: any
  setChecked: any
  _setTeamList: any
  setSelectedPage: any
  setCurrentPage: any
  setTotNumOfPage: any
  setNoOfRecords: any
}

const teamCreationSchema = Yup.object().shape({
  teamName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Team Name is required'),
  teamAlias: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Team ID is required'),
})

interface TeamCreateModel {
  teamName: string,
  teamAlias: string,
}

const modalsRoot = document.getElementById('root-modals') || document.body

const CreateTeam = ({
  show,
  handleClose,
  offset,
  limit,
  setSuccessResMessage,
  setFailureResMessage,
  setChecked,
  _setTeamList,
  setSelectedPage,
  setCurrentPage,
  setTotNumOfPage,
  setNoOfRecords,
  fetchTeams
}: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [isDuplicateAlias, setIsDuplicateAlias] = useState(false)
  const { currentUser, setTeamList, setCurrentParent, setCurrentTeam } = useAuth()
  const intl =useIntl();

  const initialValues: TeamCreateModel = {
    teamName: '',
    teamAlias: '',
  }

  const formik = useFormik({
    initialValues,
    validationSchema: teamCreationSchema,
    onSubmit: async (values) => {
      setLoading(true)
            createTeam(
              currentUser?.companyId,
              currentUser?.id,
              values.teamName,
              values.teamAlias,
            )
              .then((response) => {
                if (response.data.success) {
                  setSuccessResMessage(response.data.message)
                  // _setTeamList(response.data.teamList)
                  // setTeamList(response.data.activeTeams)
                  // setTotNumOfPage(response.data.totalPageNum)
                  // setNoOfRecords(response.data.noOfRecords)
                  // setSelectedPage(1)
                  // setCurrentPage(1)
                  fetchTeams()
                  setChecked(true)
                  setLoading(false)
                  setIsDuplicateAlias(false)
                  // setCurrentTeam(response.data.newTeamId[0])
                  setCurrentParent(4)
                  // storeCurrentTeam(response.data.newTeamId[0])
                } else {
                  setFailureResMessage(response.data.message)
                  setChecked(true)
                  setLoading(false)
                  setIsDuplicateAlias(false)
                }
              })
              .then(() => {
                formik.resetForm()
                handleClose()
              })
              .catch(() => {
                setFailureResMessage('Failed to create a team')
                setChecked(true)
                setLoading(false)
                setIsDuplicateAlias(false)
              })
    },
  })

  const handleTeamAliasChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue('teamAlias', event.target.value);
    if (isDuplicateAlias) setIsDuplicateAlias(false);
  };

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
          <FormattedMessage id='BUTTON.CREATE_TEAM' />
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
          id='kt_login_signup_form'
          onSubmit={formik.handleSubmit}
        >

          {/* begin::Form group First Name */}
          <div className='fv-row mb-8'>
            <label className='form-label fw-bolder text-dark fs-4 required'><FormattedMessage id='TEAM.NAME' /></label>
            <input
              placeholder={intl.formatMessage({ id: 'TEAM.NAME' })}
              type='text'
              autoComplete='off'
              {...formik.getFieldProps('teamName')}
              className={'form-control bg-transparent'}
            />
            {formik.touched.teamName && formik.errors.teamName && (
              <div className='fv-plugins-message-container'>
                <div className='fv-help-block'>
                  <span role='alert'>{formik.errors.teamName}</span>
                </div>
              </div>
            )}
          </div>
          {/* end::Form group */}

          {/* begin::Form group First Name */}
          <div className='fv-row mb-8'>
            <label className='form-label fw-bolder text-dark fs-4 required'><FormattedMessage id='TEAM.ID' /></label>
            <input
              placeholder={intl.formatMessage({ id: 'TEAM.ID' })}
              type='text'
              autoComplete='off'
              {...formik.getFieldProps('teamAlias')}
              className={'form-control bg-transparent'}
              onChange={handleTeamAliasChange}
            />
            {formik.touched.teamAlias && formik.errors.teamAlias && (
              <div className='fv-plugins-message-container'>
                <div className='fv-help-block'>
                  <span role='alert'>{formik.errors.teamAlias}</span>
                </div>
              </div>
            )}
            {isDuplicateAlias &&
              <div className='fv-plugins-message-container'>
                <div className='fv-help-block'>
                  <span role='alert'><FormattedMessage id='TEAM.ID_TAKEN' /></span>
                </div>
              </div>
            }
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
              {!loading && <span className='indicator-label'><FormattedMessage id='BUTTON.SUBMIT' /></span>}
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

export { CreateTeam }
