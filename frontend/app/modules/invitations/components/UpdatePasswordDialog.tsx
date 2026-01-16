import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Dialog } from '@mui/material';
import { DialogActions } from '@mui/material';
import { DialogContent } from '@mui/material';
import { DialogTitle } from '@mui/material';
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { FormattedMessage, useIntl } from 'react-intl'
import { adminUserPasswordUpdate } from '../api';

const passwordFormValidationSchema = Yup.object().shape({
    newPassword: Yup.string()
        .min(8, 'Minimum 8 characters')
        .max(50, 'Maximum 50 characters')
        .required('Password is required'),
    changepassword: Yup.string()
        .min(8, 'Minimum 8 characters')
        .max(50, 'Maximum 50 characters')
        .required('Password confirmation is required')
        .oneOf([Yup.ref('newPassword')], "Password and Confirm Password didn't match")
})

interface PasswordChangeModel {
    newPassword: string
    changepassword: string
}

const initialValues: PasswordChangeModel = {
    newPassword: '',
    changepassword: ''
}

export const UpdatePassword = (props: any) => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState<boolean>(false)
    const intl = useIntl();

    const formik = useFormik({
        initialValues,
        validationSchema: passwordFormValidationSchema,
        onSubmit: (values) => {
            setLoading(true)
            setTimeout(() => {
                adminUserPasswordUpdate(
                    props.userID,
                    values.newPassword
                )
                    .then((response) => {
                        if (response.data.success) {
                            props.setSuccessResMessage(response.data.message)
                            props.setChecked(true)
                            setLoading(false)
                        } else {
                            props.setChecked(true)
                            props.setFailureResMessage(response.data.message)
                            setLoading(false)
                        }
                    })
                    .then(() => {
                        props.setShowPasswordUpdateDialog(false)
                    })
                    .catch((err) => {
                        props.setChecked(true)
                        props.setFailureResMessage('Failed to update user, try again later')
                        props.setShowPasswordUpdateDialog(false)
                        setLoading(false)
                    })
            }, 1000)
        }
    })

    const createPasswordDialogHandler = (value: boolean) => () =>
    props.setShowPasswordUpdateDialog(value);

    return (
        <>
            <Dialog
                open={props.showPasswordUpdateDialog}
                onClose={createPasswordDialogHandler(false)}
                aria-labelledby="form-dialog-title"
            >
                <DialogTitle className='px-5 text-center fw-bolder text-muted' id="form-dialog-title">
                    <div className="modal-header">
                        <h2 className="fw-bolder"><FormattedMessage id='PROFILE.UPDATE_PASSWORD' /></h2>
                        <div className="btn btn-icon btn-sm btn-active-icon-primary" onClick={createPasswordDialogHandler(false)}>
                            <span className="svg-icon svg-icon-1" data-bs-toggle="tooltip" title="Close">
                                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1">
                                    <g transform="translate(12.000000, 12.000000) rotate(-45.000000) translate(-12.000000, -12.000000) translate(4.000000, 4.000000)" fill="#000000">
                                        <rect fill="#000000" x="0" y="7" width="16" height="2" rx="1" />
                                        <rect fill="#000000" opacity="0.5" transform="translate(8.000000, 8.000000) rotate(-270.000000) translate(-8.000000, -8.000000)" x="0" y="7" width="16" height="2" rx="1" />
                                    </g>
                                </svg>
                            </span>
                        </div>
                    </div>
                </DialogTitle>
                <DialogContent>
                    <form
                        id="kt_modal_update_password_form" className="form"
                        onSubmit={formik.handleSubmit}
                    >
                        <div className="mb-10 fv-row" data-kt-password-meter="true">
                            <div className="mb-1">
                                <label className="required form-label fw-bold fs-6 mb-2"><FormattedMessage id='PROFILE.NEW_PASSWORD' /></label>
                                <div className="position-relative mb-3">
                                    <input
                                        className="form-control form-control-lg form-control-solid"
                                        type="password"
                                        placeholder={intl.formatMessage({ id: 'PROFILE.NEW_PASSWORD' })}
                                        autoComplete="off"
                                        {...formik.getFieldProps('newPassword')}
                                    />
                                    {formik.touched.newPassword && formik.errors.newPassword && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block text-danger'>{formik.errors.newPassword}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-muted"><FormattedMessage id='AUTH.REGISTER.PASS_RULE' /></div>
                        </div>
                        <div className="fv-row mb-10">
                            <label className="required form-label fw-bold fs-6 mb-2"><FormattedMessage id='PROFILE.CONFIRM_PASSWORD' /></label>
                            <input
                                className="form-control form-control-lg form-control-solid"
                                type="password"
                                placeholder={intl.formatMessage({ id: "PROFILE.CONFIRM_PASSWORD" })} 
                                autoComplete="off"
                                {...formik.getFieldProps('changepassword')}
                            />
                            {formik.touched.changepassword && formik.errors.changepassword && (
                                <div className='fv-plugins-message-container'>
                                    <div className='fv-help-block text-danger'>{formik.errors.changepassword}</div>
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            <button
                                type="reset"
                                className="btn btn-light me-3"
                                onClick={createPasswordDialogHandler(false)}
                            >
                                <FormattedMessage id='BUTTON.DISCARD' />
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <span className="indicator-label"><FormattedMessage id='BUTTON.SUBMIT' /></span>
                                {loading &&
                                    <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                }
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}