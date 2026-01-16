import { useEffect, useState } from 'react'
import { Dialog } from '@mui/material';
import { DialogContent } from '@mui/material';
import { DialogTitle } from '@mui/material';
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { toAbsoluteUrl } from '../../../../../app/theme/helpers';
import { superAdminSoloUserUpdate } from '../../api';
import { Form } from 'react-bootstrap';
import PhoneInput, { CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { I18N_LANGUAGES } from '../../../../theme/i18n/config'
import { FormattedMessage,useIntl } from 'react-intl';
import { useThemeMode } from '../../../../theme/partials';


const UserDetailsSchema = Yup.object().shape({
    firstname: Yup.string().required('First Name is required'),
    lastname: Yup.string().required('Last Name is required'),
    email: Yup.string()
        .email('Wrong email format')
        .min(3, 'Minimum 3 symbols')
        .max(50, 'Maximum 50 symbols')
        .required('Email is required'),
    mobileNumber: Yup.string()
        .min(14, 'Minimum 10 numbers')
        .max(14, 'Maximum 10 numbers')
        .required('Mobile number is required'),
    password: Yup.string()
        .min(8, 'At least 8 characters'),
    language: Yup.string()
        .min(2, 'Minimum 2 characters')
        .max(6, 'Maximum 5 characters')
        .required('Language is required'),
})

interface UserDetailModel {
    firstname: string
    lastname: string
    email: string
    mobileCountryCode: string
    mobileNumber: string
    userId: string
    companyId: string
    twoFactorEnabled: string
    accountBlocked: string
    password: string
    userCloudIntegration: number
    userCloudIntegrationMob: number
    Dropbox: number
    Dropbox_M: number
    GoogleDrive: number
    GoogleDrive_M: number
    OneDrive: number
    OneDrive_M: number
    Slack: number
    Slack_M: number
    Wordpress: number
    Wordpress_M: number,
    language:string
}

export const EditUser = (props: any) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [image, setImage] = useState<any>("")
    const [userMobNumb, setUserMobNumb] = useState<any>('')
    const [user2FA, setUser2FA] = useState<boolean>(props.userDetail.twoFactorEnabled ? true : false)
    const [userCloudIntegration, setuserCloudIntegration] = useState<boolean>(props.userDetail.userCloudIntegration==1 ? true : false)
    const [userCloudIntegrationMob, setuserCloudIntegrationMob] = useState<boolean>(props.userDetail.userCloudIntegrationMob==1 ? true : false)
    const [Dropbox, setDropbox] = useState<boolean>(props.userDetail?.Dropbox==1 ? true : false)
    const [Dropbox_M, setDropbox_M] = useState<boolean>(props.userDetail?.Dropbox_M==1 ? true : false)
    const [GoogleDrive, setGoogleDrive] = useState<boolean>(props.userDetail?.GoogleDrive==1 ? true : false)
    const [GoogleDrive_M, setGoogleDrive_M] = useState<boolean>(props.userDetail?.GoogleDrive_M==1 ? true : false)
    const [OneDrive, setOneDrive] = useState<boolean>(props.userDetail?.OneDrive==1 ? true : false)
    const [OneDrive_M, setOneDrive_M] = useState<boolean>(props.userDetail?.OneDrive_M==1 ? true : false)
    const [Slack, setSlack] = useState<boolean>(props.userDetail?.Slack==1 ? true : false)
    const [Slack_M, setSlack_M] = useState<boolean>(props.userDetail?.Slack_M==1 ? true : false)
    const [Wordpress, setWordpress] = useState<boolean>(props.userDetail?.Wordpress==1 ? true : false)
    const [Wordpress_M, setWordpress_M] = useState<boolean>(props.userDetail?.Wordpress_M==1 ? true : false)
    const initialValues: UserDetailModel = {
        userId: props.userDetail.userId,
        mobileCountryCode: props.userDetail.mobileCountryCode,
        mobileNumber: props.userDetail.mobileNumber,
        companyId: props.userDetail.companyId,
        email: props.userDetail.email,
        firstname: props.userDetail.firstname,
        lastname: props.userDetail.lastname,
        twoFactorEnabled: props.userDetail.twoFactorEnabled,
        accountBlocked: props.userDetail.accountBlocked,
        password: '********',
        userCloudIntegration: props.userDetail.userCloudIntegration,
        userCloudIntegrationMob: props.userDetail.userCloudIntegrationMob,
        Dropbox: props.userDetail?.Dropbox ?? 0,
        Dropbox_M: props.userDetail?.Dropbox_M ?? 0,
        GoogleDrive: props.userDetail?.GoogleDrive ?? 0,
        GoogleDrive_M: props.userDetail?.GoogleDrive_M ?? 0,
        OneDrive: props.userDetail?.OneDrive ?? 0,
        OneDrive_M: props.userDetail?.OneDrive_M ?? 0,
        Slack: props.userDetail?.Slack ?? 0,
        Slack_M: props.userDetail?.Slack_M ?? 0,
        Wordpress: props.userDetail?.Wordpress ?? 0,
        Wordpress_M: props.userDetail?.Wordpress_M ?? 0,
        language: props.userDetail?.language ?? '',
    }
    const intl = useIntl();
    const {mode} =useThemeMode();

    const handleImageChange = (e: any) => {
        setImage(e.target.files[0])
    };
    console.log("props",props)
   const formik = useFormik({
      initialValues,
      validationSchema: UserDetailsSchema,
      onSubmit: (values) => {
        setLoading(true);
        setTimeout(() => {
          const formData = new FormData();
          const formData2 = new FormData();

          // Always required fields
        //   formData.append("role", props.userDetail.role);
        //   formData.append("companyId", props.userDetail.companyId);

          // Compare changed fields dynamically
        const changedFields: Record<string, any> = {};

          // 1️⃣ Compare basic user fields
          const fieldsToCompare: (keyof UserDetailModel)[] = 
          [
            "firstname",
            "lastname",
            "email",
            "mobileCountryCode",
            "mobileNumber",
            "language"
          ];

          fieldsToCompare.forEach((key) => {
            const newValue = values[key];
            const oldValue = props.userDetail[key];

            if (newValue !== oldValue && newValue !== undefined && newValue !== null) {
              changedFields[key] = newValue;
            }
          });

          // 2️⃣ Compare toggle / boolean fields
          const toggleFields = [
            ["twoFactorAuth", user2FA ? "1" : "0"]
          ];
          const toggleFields2 = [
            ["userCloudIntegration", userCloudIntegration ? "1" : "0"],
            ["userCloudIntegrationMob", userCloudIntegrationMob ? "1" : "0"],
            ["Dropbox", Dropbox ? "1" : "0"],
            ["Dropbox_M", Dropbox_M ? "1" : "0"],
            ["GoogleDrive", GoogleDrive ? "1" : "0"],
            ["GoogleDrive_M", GoogleDrive_M ? "1" : "0"],
            ["OneDrive", OneDrive ? "1" : "0"],
            ["OneDrive_M", OneDrive_M ? "1" : "0"],
            ["Slack", Slack ? "1" : "0"],
            ["Slack_M", Slack_M ? "1" : "0"],
            ["Wordpress", Wordpress ? "1" : "0"],
            ["Wordpress_M", Wordpress_M ? "1" : "0"],
          ];

          toggleFields.forEach(([key, newValue]) => {
            const oldValue = props.userDetail[key];
            if (newValue !== oldValue && newValue !== undefined && newValue !== null) {
              changedFields[key] = newValue;
            }
          });

          // 3️⃣ Password (only if changed)
          if (values.password && values.password !== "********" && !values.password.includes("*")) {
            changedFields["password"] = values.password;
          }

          // 4️⃣ Profile image (only if changed)
          if (image && image !== "") {
            changedFields["image"] = image;
          }

          // 5️⃣ Append changed fields to formData
          Object.entries(changedFields).forEach(([key, value]) => {
            formData.append(key, value);
          });

          // 🔍 Debug what’s being sent
          console.log("Changed fields:", Object.keys(changedFields));

          // Send API only if something changed
          if (Object.keys(changedFields).length === 0) {
            console.log("No fields changed — skipping update");
            setLoading(false);
            props.setShowUserUpdateDialog(false);
            return;
          }

          superAdminSoloUserUpdate(props.userDetail.userId,formData)
            .then((response) => {
              if (response.data.success) {
                setLoading(false);
                window.location.reload()
              } else {
                setLoading(false);
              }
            })
            .then(() => {
              props.setShowUserUpdateDialog(false);
            })
            .catch((err) => {
              console.log(err);
              props.setShowUserUpdateDialog(false);
              setLoading(false);
            });
        }, 1000);
      },
    });


    useEffect(() => {
        formik.setFieldValue('mobileNumber', userMobNumb)
    }, [userMobNumb])


    const handlePhoneNumberChange = (e: any, numbertype: 'Company' | 'Mobile') => {
        if (numbertype !== 'Company') {
            const formattedPhoneNumber = formatPhoneNumber(e.target.value);
            setUserMobNumb(formattedPhoneNumber);
        }
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

    const handleWordpressChangeM = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setWordpress_M(checked);
        formik.setFieldValue("Wordpress_M", checked ? 1 : 0);
    };

    const handleSlackChangeM = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setSlack_M(checked);
        formik.setFieldValue("Slack_M", checked ? 1 : 0);
    };

    const handleDropboxChangeM = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDropbox_M(e.target.checked);
        formik.setFieldValue("Dropbox_M", e.target.checked ? 1 : 0);
    };

    const handleOneDriveChangeM = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOneDrive_M(e.target.checked);
        formik.setFieldValue("OneDrive_M", e.target.checked ? 1 : 0);
    };

    const handleGoogleDriveChangeM = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGoogleDrive_M(e.target.checked);
        formik.setFieldValue("GoogleDrive_M", e.target.checked ? 1 : 0);
    };

    const handleUserCloudIntegrationMobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setuserCloudIntegrationMob(e.target.checked);
        formik.setFieldValue("userCloudIntegrationMob", e.target.checked ? 1 : 0);
    };

    const handleWordpressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWordpress(e.target.checked);
        formik.setFieldValue("Wordpress", e.target.checked ? 1 : 0);
    };

    const handleSlackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlack(e.target.checked);
        formik.setFieldValue("Slack", e.target.checked ? 1 : 0);
    };

    const handleDropboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDropbox(e.target.checked);
        formik.setFieldValue("Dropbox", e.target.checked ? 1 : 0);
    };

    const handleOneDriveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOneDrive(e.target.checked);
        formik.setFieldValue("OneDrive", e.target.checked ? 1 : 0);
    };

    const handleGoogleDriveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGoogleDrive(e.target.checked);
        formik.setFieldValue("GoogleDrive", e.target.checked ? 1 : 0);
    };

    const handleUserCloudIntegrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setuserCloudIntegration(e.target.checked);
        formik.setFieldValue("userCloudIntegration", e.target.checked ? 1 : 0);
    };

    const handleUser2FAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUser2FA(e.target.checked);
        formik.setFieldValue("twoFactorEnabled", e.target.checked ? 1 : 0);
    };

    const handleCountryCodeChange = (_: string, countryData: CountryData) => {
        formik.setFieldValue("mobileCountryCode", countryData.dialCode);
        formik.setFieldTouched("mobileCountryCode", true, false);
    };

    const handleCloseUserUpdateDialog = () => {
        props.setShowUserUpdateDialog(false);
    };

    const handleMobilePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handlePhoneNumberChange(e, "Mobile");
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
                onClose={() => props.setShowUserUpdateDialog(false)}
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
                                                        paddingLeft: '55px', // space between flag and dial code
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
                                                        border: `1px solid ${isDarkMode ? '#3a3b45' : '#ced4da'}`                                                    }}
                                                    />
                                                </div>
                                                </div>
                                            <div className='flex-grow-1'>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-solid"
                                                    placeholder={intl.formatMessage({ id: "PROFILE.MOBILENUM" })}
                                                    {...formik.getFieldProps('mobileNumber')}
                                                    onChange={handleMobilePhoneChange}
                                                />
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
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <span><FormattedMessage id="AUTH.EMAIL" /></span>
                                            <i className="fas fa-exclamation-circle ms-1 fs-7" data-bs-toggle="tooltip" title={intl.formatMessage({ id: "INVITATION.EMAIL" })}></i>
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control form-control-solid"
                                            placeholder={intl.formatMessage({ id: 'AUTH.EMAIL' })}
                                            {...formik.getFieldProps('email')}
                                        />
                                        {formik.touched.email && formik.errors.email && (
                                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.email}
                                            </div>
                                        )}
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <FormattedMessage id="PROFILE.PASSWORD" />
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control form-control-solid"
                                            placeholder={intl.formatMessage({ id: 'PROFILE.PASSWORD' })}
                                            {...formik.getFieldProps('password')}
                                        />
                                        {formik.touched.password && formik.errors.password && (
                                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.password}
                                            </div>
                                        )}
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <FormattedMessage id="COMPANY.PROFILE.2FA" />
                                        </label>
                                        <Form.Check
                                            type="switch"
                                            id="default2FA"
                                            className='col-lg-4 col-form-label fw-bold fs-6'
                                            checked={user2FA === true}
                                            onChange={handleUser2FAChange}
                                        />
                                        {formik.touched.twoFactorEnabled && formik.errors.twoFactorEnabled && (
                                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.twoFactorEnabled}
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

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <FormattedMessage id='COMPANY.PROFILE.CLOUD' />
                                        </label>
                                        <div className='d-flex flex-row align-items-center justify-content-between'>
                                            {/* Web Toggle */}
                                            <div className='d-flex flex-column'>
                                                <div className='d-flex flex-row align-items-center'>
                                                    <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={userCloudIntegration === true}
                                                        onChange={handleUserCloudIntegrationChange}
                                                    />
                                                    <label className="col-lg-2 fs-6 fw-bold">Web</label>
                                                </div>
                                                {
                                                <div style={{  display: !userCloudIntegrationMob && !userCloudIntegration ? 'none' : undefined, 
                                                visibility: userCloudIntegration ? 'visible' : 'hidden' }}>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={GoogleDrive === true}
                                                        onChange={handleGoogleDriveChange}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">Google Drive</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={OneDrive === true}
                                                        onChange={handleOneDriveChange}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">OneDrive</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={Dropbox === true}
                                                        onChange={handleDropboxChange}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">Dropbox</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={Slack === true}
                                                         onChange={handleSlackChange}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">Slack</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={Wordpress === true}
                                                        onChange={handleWordpressChange}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">WordPress</label>
                                                </div>
                                                </div>
                                                }
                                            </div>

                                            {/* Mobile Toggle */}
                                            <div className='d-flex flex-column'>
                                                <div className='d-flex flex-row align-items-center'>
                                                    <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={userCloudIntegrationMob === true}
                                                        onChange={handleUserCloudIntegrationMobChange}
                                                    />
                                                    <label className="col-lg-2 fs-6 fw-bold">Mobile</label>
                                                </div>
                                                {
                                                <div style={{  display: !userCloudIntegrationMob && !userCloudIntegration ? 'none' : undefined, 
                                                visibility: userCloudIntegrationMob ? 'visible' : 'hidden' }}>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={GoogleDrive_M === true}
                                                        onChange={handleGoogleDriveChangeM}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">Google Drive</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={OneDrive_M === true}
                                                        onChange={handleOneDriveChangeM}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">OneDrive</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={Dropbox_M === true}
                                                        onChange={handleDropboxChangeM}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">Dropbox</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={Slack_M === true}
                                                        onChange={handleSlackChangeM}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">Slack</label>
                                                </div>
                                                <div className='d-flex flex-row align-items-center'>
                                                <Form.Check
                                                        type="switch"
                                                        className='col-lg-2 col-form-label fw-bold fs-6'
                                                        checked={Wordpress_M === true}
                                                        onChange={handleWordpressChangeM}
                                                    />
                                                <label className="col-lg-2 fs-6 fw-bold">WordPress</label>
                                                </div>
                                                </div>
                                                }
                                            </div>
                                        </div>

                                        
                                        {formik.touched.userCloudIntegration && formik.errors.userCloudIntegration && (
                                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.userCloudIntegration}
                                            </div>
                                        )}
                                        {formik.touched.userCloudIntegrationMob && formik.errors.userCloudIntegrationMob && (
                                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                                                {formik.errors.userCloudIntegrationMob}
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