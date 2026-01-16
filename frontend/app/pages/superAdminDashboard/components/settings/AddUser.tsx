/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { PasswordMeterComponent } from '../../../../../app/theme/assets/ts/components'
import { AlertDanger, AlertSuccess } from '../../../../modules/alerts/Alerts'
import { createAccountForSuperUsers, getSuperEmail } from '../../api'
import { AxiosResponse } from 'axios'
import { KTIcon } from '../../../../../app/theme/helpers'
import { useAuth } from '../../../../modules/auth'
import PhoneInput, { CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, useIntl } from 'react-intl'

const registrationSchema = Yup.object().shape({
    firstname: Yup.string()
        .min(3, 'Minimum 3 characters')
        .max(50, 'Maximum 50 characters')
        .required('First Name is required'),
    lastname: Yup.string()
        .min(3, 'Minimum 3 characters')
        .max(50, 'Maximum 50 characters')
        .required('Last Name is required'),
    email: Yup.string()
        .email('Wrong email format')
        .min(5, 'Minimum 5 characters')
        .max(50, 'Maximum 50 characters')
        .required('Email is required')
        .test('email-domain', 'Invalid email domain', async (value) => {
            if (!value) {
                return false;
            }
            const response: AxiosResponse<any> = await getSuperEmail();
            const fetchedSuperEmail = response?.data?.superEmail;
            if (fetchedSuperEmail === '*') {
                return true;
            }

            const validDomains = fetchedSuperEmail.split(',');
            return validDomains.some((domain : any) => value.toLowerCase().endsWith(`@${domain}`));
        }),
    mobileNumber: Yup.string()
        .min(14, 'Minimum 10 numbers')
        .max(14, 'Maximum 10 numbers')
        .required('Mobile number is required'),
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

export const AddUser = () => {
    const [loading, setLoading] = useState(false)
    const [checked, setChecked] = useState<boolean>(false)
    const [successMessage, setSuccessMessage] = useState<string>("")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const [userMobNumb, setUserMobNumb] = useState<any>('')
    const navigate = useNavigate()
    const { currentUser } = useAuth()
    const intl = useIntl();

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

    const initialValues = {
        firstname: '',
        lastname: '',
        mobileCountryCode:'+1',
        mobileNumber: '',
        email: '',
        password: '',
        changepassword: '',
    }

    const formik = useFormik({
        initialValues,
        validationSchema: registrationSchema,
        onSubmit: async (values, { setSubmitting }) => {
            setLoading(true)
            createAccountForSuperUsers(
                values.firstname,
                values.lastname,
                values.email,
                values.mobileCountryCode,
                values.mobileNumber,
                values.password,
                currentUser?.companyId,
                '4'
            )
                .then((response) => {
                    if (response.data.success) {
                        navigate('/admin/dashboard')
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
        }
    })

    const handlePhoneNumberChange = (e: any) => {
        const formattedPhoneNumber = formatPhoneNumber(e.target.value);
        setUserMobNumb(formattedPhoneNumber);
    }

    const formatPhoneNumber = (value: string) => {
        if (!value) return value;

        const phoneNumber = value.replace(/[^\d]/g, '');

        const phoneNumberLength = phoneNumber.length;

        if (phoneNumberLength < 4) return phoneNumber;

        if (phoneNumberLength < 7) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        }

        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
            3,
            6
        )}-${phoneNumber.slice(6, 10)}`;
    }

    useEffect(() => {
        formik.setFieldValue('mobileNumber', userMobNumb)
    }, [userMobNumb])

    useEffect(() => {
        PasswordMeterComponent.bootstrap()
    }, [])

    const handleCountryChange = (_: string, countryData: CountryData) => {
        formik.setFieldValue('mobileCountryCode', countryData.dialCode);
        formik.setFieldTouched('mobileCountryCode', true, false);
    };

    const handleGoBack = () => {
      navigate(-1);
    };

    return (
        <>
            {successMessage !== "" ? (
                <AlertSuccess message={successMessage} checked={checked} />
            ) : null}
            {errorMessage !== "" ? (
                <AlertDanger message={errorMessage} checked={checked} />
            ) : null}
            <div className='card'>
                <div className='card-header'>
                    {/* begin::Heading */}
                    <div className='card-title text-center'>
                        {/* begin::Title */}
                        <h1 className='text-dark fw-bolder'><FormattedMessage id="SUPERADMIN.CREATE" /></h1>
                        {/* end::Title */}
                    </div>
                    {/* end::Heading */}
                    <div
                        className='card-title cursor-pointer'
                        onClick={handleGoBack}
                        data-bs-toggle="tooltip"
                        title="Close"
                    >
                        <KTIcon iconName='cross' className='fs-1' />
                    </div>
                </div>
                <div className='card-body'>
                    <form
                        className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
                        noValidate
                        id='kt_login_signup_form'
                        onSubmit={formik.handleSubmit}
                    >
                        {/* begin::Form group First Name */}
                        <div className='fv-row mb-8'>
                            <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id='PROFILE.FIRSTNAME' /> </label>
                            <input
                                placeholder={intl.formatMessage({ id: 'PROFILE.FIRSTNAME' })}
                                type='text'
                                autoComplete='off'
                                {...formik.getFieldProps('firstname')}
                                className={clsx(
                                    'form-control bg-transparent',
                                    {
                                        'is-invalid': formik.touched.firstname && formik.errors.firstname,
                                    },
                                    {
                                        'is-valid': formik.touched.firstname && !formik.errors.firstname,
                                    }
                                )}
                            />
                            {formik.touched.firstname && formik.errors.firstname && (
                                <div className='fv-plugins-message-container'>
                                    <div className='fv-help-block'>
                                        <span role='alert'>{formik.errors.firstname}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* end::Form group */}

                        {/* begin::Form group First Name */}
                        <div className='fv-row mb-8'>
                            <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="PROFILE.LASTNAME" /></label>
                            <input
                                placeholder={intl.formatMessage({ id: 'PROFILE.LASTNAME' })}
                                type='text'
                                autoComplete='off'
                                {...formik.getFieldProps('lastname')}
                                className={clsx(
                                    'form-control bg-transparent',
                                    {
                                        'is-invalid': formik.touched.lastname && formik.errors.lastname,
                                    },
                                    {
                                        'is-valid': formik.touched.lastname && !formik.errors.lastname,
                                    }
                                )}
                            />
                            {formik.touched.lastname && formik.errors.lastname && (
                                <div className='fv-plugins-message-container'>
                                    <div className='fv-help-block'>
                                        <span role='alert'>{formik.errors.lastname}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* end::Form group */}

                        {/* begin::Form group Email */}
                        <div className='fv-row mb-8'>
                            <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id='AUTH.EMAIL' /></label>
                            <input
                                placeholder={intl.formatMessage({ id: "AUTH.EMAIL" })}
                                type='email'
                                autoComplete='off'
                                {...formik.getFieldProps('email')}
                                className={clsx(
                                    'form-control bg-transparent',
                                    { 'is-invalid': formik.touched.email && formik.errors.email },
                                    { 'is-valid': formik.touched.email && !formik.errors.email, }
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

                        {/* begin::Form group Phone number */}
                        <div className='fv-row mb-8'>
                            <div className="fv-row mb-7">
                                <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="PROFILE.MOBILENUM" /></label>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className='w-25'>
                                            <div className='col-lg-14 fv-row d-flex align-items-center'>
                                                <PhoneInput
                                                country={formik.values.mobileCountryCode === '1' ? 'us' : undefined}
                                                value={formik.values.mobileCountryCode}
                                                onChange={handleCountryChange}
                                                inputProps={{
                                                    name: 'mobileCountryCode',
                                                    readOnly: true,
                                                }}
                                                inputStyle={{
                                                    width: '110px',
                                                    paddingLeft: '55px',
                                                    height: '38px',
                                                    backgroundColor: '#f8f9fa',
                                                    border: '1px solid #ced4da',
                                                    borderRadius: '4px',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                }}
                                                buttonStyle={{
                                                    marginLeft: '0px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                }}
                                                containerStyle={{
                                                    width: '110px',
                                                    position: 'relative',
                                                }}
                                                dropdownStyle={{
                                                    zIndex: 1000,
                                                }}
                                                />
                                            </div>
                                            </div>
                                        <div className='flex-grow-1'>
                                            <input
                                                placeholder={intl.formatMessage({ id: "PROFILE.MOBILENUM" })}
                                                type='text'
                                                autoComplete='off'
                                                {...formik.getFieldProps('mobileNumber')}
                                                onChange={handlePhoneNumberChange}
                                                className={clsx(
                                                    'form-control bg-transparent',
                                                    {
                                                        'is-invalid': formik.touched.mobileNumber && formik.errors.mobileNumber,
                                                    },
                                                    {
                                                        'is-valid': formik.touched.mobileNumber && !formik.errors.mobileNumber,
                                                    }
                                                )}
                                            />
                                        </div>
                                    </div>
                                    {formik.touched.mobileCountryCode && formik.errors.mobileCountryCode && (
                                        <div className='fv-help-block text-danger mt-1 fw-normal'>
                                            {formik.errors.mobileCountryCode}
                                        </div>
                                    )}
                                    {formik.touched.mobileNumber && formik.errors.mobileNumber && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>
                                                <span role='alert'>{formik.errors.mobileNumber}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                        </div>
                        {/* end::Form group */}

                        {/* begin::Form group Password */}
                        <div className='fv-row mb-8' data-kt-password-meter='true'>
                            <div className='mb-1'>
                                <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="AUTH.PASSWORD" /></label>
                                <div className='position-relative mb-3'>
                                    <input
                                        type='password'
                                        placeholder={intl.formatMessage({ id: "AUTH.PASSWORD" })}
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
                                <FormattedMessage id="AUTH.REGISTER.PASS_RULE" />
                            </div>
                        </div>
                        {/* end::Form group */}

                        {/* begin::Form group Confirm password */}
                        <div className='fv-row mb-8'>
                            <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="PROFILE.CONFIRM_PASSWORD" /></label>
                            <input
                                type='password'
                                placeholder={intl.formatMessage({ id: "PROFILE.PASSWORD_CONFIRMATION" })}
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
                        <div className='text-center d-flex justify-content-end'>
                            <button
                                type='submit'
                                id='kt_sign_up_submit'
                                className='btn btn-lg btn-primary mb-5'
                                disabled={formik.isSubmitting || !formik.isValid || loading}
                            >
                                {!loading && <span className='indicator-label'><FormattedMessage id="BUTTON.ADD_USER" /></span>}
                                {loading && (
                                    <span className='indicator-progress' style={{ display: 'block' }}>
                                        <FormattedMessage id="BUTTON.WAIT" />{' '}
                                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                    </span>
                                )}
                            </button>
                        </div>
                        {/* end::Form group */}
                    </form>
                </div>
            </div>
        </>
    )
}