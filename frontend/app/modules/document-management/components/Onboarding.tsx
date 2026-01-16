/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { useAuth } from '../../auth'
import { checkIfAliasExist, createTeam } from '../../teams/api'
import { useNavigate } from 'react-router-dom'

type Props = {
    setSuccessResMessage: any
    setFailureResMessage: any
    setChecked: any
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

const Onboarding = ({
    setSuccessResMessage,
    setFailureResMessage,
    setChecked,
}: Props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [isDuplicateAlias, setIsDuplicateAlias] = useState(false)
    const [offset] = useState<number>(0)
    const [limit] = useState<number>(10)
    const { setTeamList, currentUser } = useAuth()
    const intl = useIntl();
    const navigate = useNavigate();

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
                            values.teamAlias
                        )
                            .then((response) => {
                                if (response.data.success) {
                                    setSuccessResMessage(response.data.message)
                                    setTeamList([response.data.team])
                                    // setTeamList(response.data.activeTeams)
                                    navigate('/teams')
                                    setChecked(true)
                                    setLoading(false)
                                    setIsDuplicateAlias(false)
                                } else {
                                    setFailureResMessage(response.data.message)
                                    setChecked(true)
                                    setLoading(false)
                                    setIsDuplicateAlias(false)
                                }
                            })
                            .then(() => {
                                formik.resetForm()
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

    return (
        <div className="card shadow px-8 pt-12 mt-4">

            <div className='card-title'>
                <h2>
                    <FormattedMessage id='BUTTON.CREATE_TEAM' />
                </h2>
            </div>

            <div className='card-body py-lg-10 px-lg-10'>
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
                            className='btn btn-lg mb-5 col-12 mt-3'
                            style={{ background: '#efb916' }}
                            disabled={formik.isSubmitting || !formik.isValid || loading}
                        >
                            {!loading && <span className='indicator-label fw-bolder'><FormattedMessage id='ONBOARDING.TWO' /></span>}
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
        </div>
    )
}

export { Onboarding }
