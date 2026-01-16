import { useEffect, useState } from 'react'
import { Dialog } from '@mui/material';
import { DialogContent } from '@mui/material';
import { DialogTitle } from '@mui/material';
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { toAbsoluteUrl } from '../../../../../app/theme/helpers';
import { getSuperEmail, superAdminUpdate } from '../../api';
import { AxiosResponse } from 'axios';
import PhoneInput, { CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, useIntl } from 'react-intl';
import { I18N_LANGUAGES } from '../../../../theme/i18n/config';
import { useAuth, UserModel } from '../../../../modules/auth';
import { useThemeMode } from '../../../../theme/partials';

const adminUserDetailsSchema = Yup.object().shape({
    firstname: Yup.string().required('First Name is required'),
    lastname: Yup.string().required('Last Name is required'),
    email: Yup.string()
        .email('Wrong email format')
        .min(3, 'Minimum 3 symbols')
        .max(50, 'Maximum 50 symbols')
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
            return validDomains.some((domain: any) => value.toLowerCase().endsWith(`@${domain}`));
        }),
    mobileNumber: Yup.string()
        .min(10, 'Minimum 10 numbers')
        .max(14, 'Maximum 10 numbers')
        .required('Mobile number is required'),
        language: Yup.string()
        .min(2, "Minimum 2 characters")
})

interface AdminUserDetailModel {
    firstname: string
    lastname: string
    email: string
    mobileCountryCode:string
    mobileNumber: string
    language:string
}

export const EditSuperUser = (props: any) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [image, setImage] = useState<any>("")
    const [userMobNumb, setUserMobNumb] = useState<any>('')
    const intl = useIntl();
    const { currentUser, setCurrentUser } = useAuth();
    const {mode} =useThemeMode();

    const initialValues: AdminUserDetailModel = {
        firstname: '',
        lastname: '',
        email: '',
        mobileCountryCode: '+1',
        mobileNumber: '',
        language:''
    }

    const handleImageChange = (e: any) => {
        setImage(e.target.files[0])
    };

    const formik = useFormik({
        initialValues,
        validationSchema: adminUserDetailsSchema,
        onSubmit: (values) => {
            setLoading(true)
            setTimeout(() => {
                const formData = new FormData()
                formData.append('userId', props.userID)
                formData.append('firstname', values.firstname)
                formData.append('lastname', values.lastname)
                formData.append('email', values.email)
                formData.append('mobileCountryCode', values.mobileCountryCode)
                formData.append('mobileNumber', values.mobileNumber)
                // formData.append('image', image)
                formData.append('language', values.language)
                const obj = {
                    userId:props.userID,
                    firstname:values.firstname,
                    lastname:values.lastname,
                    email:values.email,
                    mobileCountryCode:values.mobileCountryCode,
                    mobileNumber:values.mobileNumber,
                    language:values.language
                }

                superAdminUpdate(obj)
                    .then((response) => {
                        if (response.data.success) {
                            if(props.userID === currentUser?.id && currentUser?.language !== values.language)
                                {
                                    setCurrentUser({...currentUser,language: values.language} as UserModel);
                                }
                            // window.location.reload()
                            setLoading(false)
                            props.fetchUsers();
                        } else {
                            setLoading(false)
                        }
                    })
                    .then(() => {
                        props.setShowUserUpdateDialog(false)
                    })
                    .catch((err) => {
                        console.log(err)
                        props.setShowUserUpdateDialog(false)
                        setLoading(false)
                    })
            }, 1000)
        }
    })

    useEffect(() => {
        formik.setFieldValue('mobileNumber', userMobNumb)
    }, [userMobNumb])


   const handlePhoneNumberChange =
    (numbertype: 'Company' | 'Mobile') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
        if (numbertype !== 'Company') {
        const formattedPhoneNumber = formatPhoneNumber(e.target.value);
        setUserMobNumb(formattedPhoneNumber);
        }
    };

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
        if (props.userDetail) {
            formik.setFieldValue('firstname', props.userDetail.firstname)
            formik.setFieldValue('lastname', props.userDetail.lastname)
            formik.setFieldValue('email', props.userDetail.email)
            formik.setFieldValue('mobileCountryCode', props.userDetail.mobileCountryCode)
            formik.setFieldValue('mobileNumber', props.userDetail.mobileNumber)
            formik.setFieldValue('language', props.userDetail.language)
        }
    }, [props.userDetail])

    const setDefaultImage = async () => {
        const defaultImagePath = '/media/avatars/blank.png';
        
        // Fetch the default image as a blob
        const response = await fetch(defaultImagePath);
        const imageBlob = await response.blob();
        
        // Create a file from the blob (optional, just for consistency if File object is needed)
        const imageFile = new File([imageBlob], 'blank.png', { type: 'image/png' });
        
        // Set the image using setImage (if it expects a File object)
        setImage(imageFile);
    };

    const handleCountryCodeChange = (_: string, countryData: CountryData) => {
            formik.setFieldValue('mobileCountryCode', countryData.dialCode);
            formik.setFieldTouched('mobileCountryCode', true, false);
    };

    const handleCloseUserUpdateDialog = () => {
      props.setShowUserUpdateDialog(false);
    };
    const isDarkMode = mode === 'dark';

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .country-list .country.highlight {
        background-color: ${isDarkMode ? '#3a3b45' : '#e9ecef'} !important;
        color: ${isDarkMode ? '#fff' : '#212529'} !important;
      }
      .country-list .country:hover {
        background-color: ${isDarkMode ? '#3a3b45' : '#e9ecef'} !important;
        color: ${isDarkMode ? '#fff' : '#212529'} !important;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, [isDarkMode]);

    return (
            <Dialog
                open={props.showUserUpdateDialog}
                onClose={handleCloseUserUpdateDialog}
                aria-labelledby="form-dialog-title"
                PaperProps={{ className: 'bg-light text-dark' }}
            >
                <DialogTitle className='px-5 text-center fw-bolder text-muted' id="form-dialog-title">
                    <div className="modal-header" id="kt_modal_update_user_header">
                        <h2 className="fw-bolder">
                            <FormattedMessage id="INVITATION.UPDATE_USER" />
                        </h2>
                        <div className="btn btn-icon btn-sm btn-active-icon-primary" onClick={handleCloseUserUpdateDialog}>
                            <span className="svg-icon svg-icon-1" data-bs-toggle="tooltip" title="Close">
                                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1">
                                    <g transform="translate(12.000000, 12.000000) rotate(-45.000000) translate(-12.000000, -12.000000) translate(4.000000, 4.000000)" fill="#000000">
                                        <rect fill="#A9A9A9" x="0" y="7" width="16" height="2" rx="1" />
                                        <rect fill="#A9A9A9" opacity="0.5" transform="translate(8.000000, 8.000000) rotate(-270.000000) translate(-8.000000, -8.000000)" x="0" y="7" width="16" height="2" rx="1" />
                                    </g>
                                </svg>
                            </span>
                        </div>
                    </div>
                </DialogTitle>
                <DialogContent>
                    <form style={{ width: '380px' }} className="form" onSubmit={formik.handleSubmit} id="kt_modal_update_user_form">
                        <div
                            className="modal-body px-5"
                        >
                            <div className="d-flex flex-column scroll-y me-n7 pe-7" id="kt_modal_update_user_scroll" data-kt-scroll="true" data-kt-scroll-activate="{default: false, lg: true}" data-kt-scroll-max-height="auto" data-kt-scroll-dependencies="#kt_modal_update_user_header" data-kt-scroll-wrappers="#kt_modal_update_user_scroll" data-kt-scroll-offset="300px">
                                <div id="kt_modal_update_user_user_info" className="show">
                                    <div className="mb-7">
                                        <label className="fs-6 fw-bold mb-2 me-5">
                                            <span>
                                                <FormattedMessage id="INVITATION.UPDATE_AVATAR" />
                                            </span>
                                            <i className="fas fa-exclamation-circle ms-1 fs-7" data-bs-toggle="tooltip" title={intl.formatMessage({ id: "INVITATION.ALLOWED" })}></i>
                                        </label>
                                        <div className="mt-5">
                                            <div className="image-input image-input-outline" data-kt-image-input="true" style={{ backgroundImage: `url(${toAbsoluteUrl('/media/avatars/blank.png')})`, marginLeft: '5px' }}>
                                                <div
                                                    className="image-input-wrapper w-125px h-125px"
                                                    style={{ backgroundImage: `url(${image === "" ? `${props.userDetail?.avatarUrl}` : URL.createObjectURL(image)})` }}
                                                ></div>
                                                <label className="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="change" data-bs-toggle="tooltip" title={intl.formatMessage({ id: "INVITATION.CHANGE_AVATAR" })}>
                                                    <i className="bi bi-pencil-fill fs-7"></i>
                                                    <input onChange={handleImageChange} type="file" name="avatar" accept=".png, .jpg, .jpeg" />
                                                    <input type="hidden" name="avatar_remove" />
                                                </label>
                                                <span className="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="cancel" data-bs-toggle="tooltip" title="Cancel avatar">
                                                    <i className="bi bi-x fs-2"></i>
                                                </span>
                                                <span className="btn btn-icon btn-circle btn-active-color-primary w-25px h-25px bg-body shadow" data-kt-image-input-action="remove" data-bs-toggle="tooltip" title={intl.formatMessage({ id: "INVITATION.REMOVE_AVATAR" })}>
                                                    <i className="bi bi-x fs-2" onClick={setDefaultImage}></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                           <FormattedMessage id="PROFILE.FIRSTNAME" />
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control form-control-solid"
                                            placeholder={intl.formatMessage({ id: 'PROFILE.FIRSTNAME' })}
                                            {...formik.getFieldProps('firstname')}
                                        />
                                        {formik.touched.firstname && formik.errors.firstname && (
                                             <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.firstname}
                                            </div>
                                        )}
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <FormattedMessage id="PROFILE.LASTNAME" />
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control form-control-solid"
                                            placeholder={intl.formatMessage({ id: 'PROFILE.LASTNAME' })}
                                            {...formik.getFieldProps('lastname')}
                                        />
                                        {formik.touched.lastname && formik.errors.lastname && (
                                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.lastname}
                                            </div>
                                        )}
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <FormattedMessage id="PROFILE.MOBILENUM" />
                                        </label>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className='w-50'>
                                                <div className='col-lg-14 fv-row d-flex align-items-center'>
                                                    <PhoneInput
                                                    country={formik.values.mobileCountryCode === '1' ? 'us' : undefined}
                                                    value={formik.values.mobileCountryCode}
                                                    onChange={handleCountryCodeChange}
                                                    inputProps={{
                                                        name: 'mobileCountryCode',
                                                        readOnly: true,
                                                    }}
                                                    inputStyle={{
                                                        width: '110px',
                                                        paddingLeft: '55px',
                                                        height: '38px',
                                                        backgroundColor: isDarkMode ? '#1e1e2d' : '#f8f9fa',
                                                        color: isDarkMode ? '#f1f1f1' : '#212529',
                                                        border: isDarkMode ? '1px solid #3a3b45' : '1px solid #ced4da',
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
                                                    backgroundColor: isDarkMode ? '#2a2a3b' : '#fff',
                                                    color: isDarkMode ? '#f1f1f1' : '#212529',
                                                    border: `1px solid ${isDarkMode ? '#3a3b45' : '#ced4da'}`,
                                                    }}
                                                    />
                                                </div>
                                                </div>
                                                <div className='flex-grow-1'>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-solid"
                                                        placeholder={intl.formatMessage({ id: 'PROFILE.MOBILENUM' })}
                                                        {...formik.getFieldProps('mobileNumber')}
                                                        onChange={handlePhoneNumberChange('Mobile')}
                                                    />
                                                </div>
                                            </div>
                                            {formik.touched.mobileCountryCode && formik.errors.mobileCountryCode && (
                                                <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                    {formik.errors.mobileCountryCode}
                                                </div>
                                            )}
                                            {formik.touched.mobileNumber && formik.errors.mobileNumber && (
                                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.mobileNumber}
                                            </div>
                                        )}
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <span><FormattedMessage id="AUTH.EMAIL" /></span>
                                            <i className="fas fa-exclamation-circle ms-1 fs-7" data-bs-toggle="tooltip" title={intl.formatMessage({ id: "INVITATION.EMAIL" })}></i>
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control form-control-solid"
                                            placeholder={intl.formatMessage({ id: "AUTH.EMAIL" })}
                                            {...formik.getFieldProps('email')}
                                        />
                                        {formik.touched.email && formik.errors.email && (
                                        <div className='fv-help-block text-danger mt-1 fw-normal'>
                                            {formik.errors.email}
                                        </div>
                                        )}
                                    </div>
                                    <div className='fv-row mb-7 language-type'>
                                      <label className='form-label fw-bolder text-dark fs-6 required text-nowrap'>
                                        <FormattedMessage id='PROFILE.LANGUAGE' />
                                      </label>

                                      <select
                                        className='form-select form-select-lg form-select-solid'
                                        {...formik.getFieldProps('language')}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          formik.setFieldValue('language', value)
                                        }}
                                        value={formik.values.language}
                                      >
                                        <option value=''>
                                          <FormattedMessage id='SELECT.LANGUAGE' />
                                        </option>
                                    
                                        {I18N_LANGUAGES.map((lang: any, index: number) => (
                                          <option key={index} value={lang.code}>
                                            {lang.label || lang.name}
                                          </option>
                                        ))}
                                      </select>
                                    
                                      {formik.touched.language && formik.errors.language && (
                                        <div className='fv-plugins-message-container mt-2'>
                                          <div className='fv-help-block'>
                                            <span role='alert'>{formik.errors.language}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer flex-center">
                            <button
                                type="reset"
                                className="btn btn-light me-3"
                                onClick={handleCloseUserUpdateDialog}
                            >
                                <FormattedMessage id="BUTTON.DISCARD" /> 
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <span className="indicator-label"><FormattedMessage id="BUTTON.SUBMIT" /> </span>
                                {loading &&
                                    <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                }
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
    )
}