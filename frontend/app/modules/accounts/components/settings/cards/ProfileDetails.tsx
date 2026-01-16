import React, { useEffect, useState } from 'react'
import { toAbsoluteUrl } from '../../../../../theme/helpers'
import { updateUserProfile, updateUserProfileAvatar } from '../../../../auth/core/_requests'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { useAuth, UserModel } from '../../../../auth/'
import { AlertSuccess, AlertDanger } from '../../../../alerts/Alerts'
import { FormattedMessage, useIntl } from 'react-intl'
import PhoneInput, { CountryData } from 'react-phone-input-2';
import { I18N_LANGUAGES } from '../../../../../theme/i18n/config'
import 'react-phone-input-2/lib/bootstrap.css';
import { useLanguage } from '../../../../../theme/providers/TranslationProvider'
import { useAppContext } from '../../../../../pages/AppContext/AppContext'
import { useThemeMode } from '../../../../../theme/partials'


const ProfileDetails: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser, auth, setCurrentUser, saveAuth } = useAuth()
  const [image, setImage] = useState<any>("")
  const [userId] = useState(currentUser?.id)
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [userMobNumb, setUserMobNumb] = useState<any>(currentUser?.mobileNumber)
  const intl = useIntl()
  const changeLanguage = useLanguage().changeLanguage;
  const { appData } = useAppContext();
  const { mode } = useThemeMode();
  

  const profileDetailsSchema = Yup.object().shape({
    firstname: Yup.string()
      .min(3, intl.formatMessage({ id: "PROFILE.MIN3CHAR" }))
      .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
      .required(intl.formatMessage({ id: "PROFILE.FIRSTNAME.REQUIRED" })),
    lastname: Yup.string()
      .min(3, intl.formatMessage({ id: "PROFILE.MIN3CHAR" }))
      .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
      .required(intl.formatMessage({ id: "PROFILE.LASTNAME.REQUIRED" })),
    // mobileCountryCode: Yup.string()
    //   .required(intl.formatMessage({ id: "PROFILE.mobileCountryCode" }))
    //   .test('not-only-plus',intl.formatMessage({ id: "PROFILE.INVALIDmobileCountryCode" }), 
    //   (value) => !!value && /^\+\d+$/.test(value)),
    mobileNumber: Yup.string()
      .min(10, intl.formatMessage({ id: "PROFILE.MIN10NUM" }))
      .max(14, intl.formatMessage({ id: "PROFILE.MAX10NUM" }))
      .required(intl.formatMessage({ id: "PROFILE.MOBILE.REQUIRED" })),
      language: Yup.string()
      .min(2, intl.formatMessage({ id: "PROFILE.MIN3CHAR" }))
      .max(50, intl.formatMessage({ id: "PROFILE.MAX50CHAR" }))
  })

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

  const handleImageChange = (e: any) => {
    if(e.target.files[0]){
      setImage(e.target.files[0])
    }else{
      setImage("")
    }
  }

  const initialValues: any = {
    firstname: currentUser?.firstname,
    lastname: currentUser?.lastname,
    mobileNumber: currentUser?.mobileNumber,
    mobileCountryCode:currentUser?.mobileCountryCode,
    language: currentUser?.language || 'en',
  }

  const formik = useFormik<any>({
    initialValues,
    validationSchema: profileDetailsSchema,
    onSubmit: async (values) => {
     setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let updatedUser = { ...currentUser };
      let changes: any = {};

      // ---- Build changes object dynamically ----
      const fieldsToCheck: (keyof UserModel)[] = [
        "firstname",
        "lastname",
        "mobileNumber",
        "mobileCountryCode",
        "language"
      ];

      fieldsToCheck.forEach(field => {
        if (values[field] && values[field] !== currentUser?.[field]) {
          changes[field] = values[field];
        }
      });

      // ---- 1. Upload image if provided ----
      if (image) {
        try {
          const formData = new FormData();
          formData.append("image", image);

          const uploadRes = await updateUserProfileAvatar(formData);

          if (uploadRes.data.success) {
            updatedUser = { ...updatedUser, avatarUrl:uploadRes.data.avatarUrl };
          } else {
            setErrorMessage(uploadRes.data.message || "Image upload failed");
          }
        } catch (err) {
          console.error(err);
          setErrorMessage("Failed to upload profile picture");
        }
      }

      // ---- 2. Update the rest of profile (only if any field changed) ----
      let profileResponse = null;
      if (Object.keys(changes).length > 0) {
        profileResponse = await updateUserProfile(changes);

        if (!profileResponse.data.success) {
          setErrorMessage(profileResponse.data.message);
        } else {
          updatedUser = { ...updatedUser, ...profileResponse.data.user };
        }
      }

      // ---- 3. Apply language change (UI) ----
      if (values.language) {
        const lang = I18N_LANGUAGES.find(l => l.code === values.language);
        if (lang) changeLanguage(lang);
      }

      // ---- 4. Save updated user only if something changed ----
         if (Object.keys(changes).length > 0 || image) {
          setCurrentUser(updatedUser as UserModel);
           saveAuth({
             user: updatedUser as UserModel,
             api_token: auth?.api_token ?? "",
             refresh_token:auth?.refresh_token ?? "",
             company: auth?.company ?? null,
           });
         }
       
         // ---- 5. Success message ----
         const successMessage =
           profileResponse?.data?.message ||
           "Profile updated successfully";
       
         setSuccessMessage(successMessage);
       
       } catch (error) {
         console.error(error);
         setErrorMessage("Failed to update user profile details");
       } finally {
         setLoading(false);
         window.scrollTo(0, 0);
       }
      }
    })

  useEffect(() => {
    formik.setFieldValue('mobileNumber', userMobNumb)
  }, [userMobNumb])


  const handlePhoneNumberChange = (e: any, numbertype: 'Company' | 'Mobile') => {
    if (numbertype !== 'Company') {
      // this is where we'll call our future formatPhoneNumber function that we haven't written yet.
      const formattedPhoneNumber = formatPhoneNumber(e.target.value);
      // we'll set the input value using our setInputValue
      setUserMobNumb(formattedPhoneNumber);
    }
  }

  const formatPhoneNumber = (value: string) => {
    // if input value is falsy eg if the user deletes the input, then just return
    if (!value) return value;

    // clean the input for any non-digit values.
    const phoneNumber = value.replace(/[^\d]/g, '');

    // phoneNumberLength is used to know when to apply our formatting for the phone number
    const phoneNumberLength = phoneNumber.length;

    // we need to return the value with no formatting if its less then four digits
    // this is to avoid weird behavior that occurs if you  format the area code to early

    if (phoneNumberLength < 4) return phoneNumber;

    // if phoneNumberLength is greater than 4 and less the 7 we start to return
    // the formatted number
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }

    // finally, if the phoneNumberLength is greater then seven, we add the last
    // bit of formatting and return it.
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
      3,
      6
    )}-${phoneNumber.slice(6, 10)}`;
  }

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

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhoneNumberChange(e, "Mobile");
  };

  const handlemobileCountryCodeChange = (_: string, countryData: CountryData) => {
    formik.setFieldValue('mobileCountryCode', countryData.dialCode);
    formik.setFieldTouched('mobileCountryCode', true, false);
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
    <div className='card mb-5 mb-xl-10'>
      <div
        className='card-header border-0 cursor-pointer'
        role='button'
        data-bs-toggle='collapse'
        data-bs-target='#kt_account_profile_details'
        aria-expanded='true'
        aria-controls='kt_account_profile_details'
      >
        <div className='card-title m-0'>
          <h3 className='fw-bolder m-0'><FormattedMessage id='PROFILE.USER_PROFILE_HEADER' /></h3>
        </div>
      </div>

      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      <div id='kt_account_profile_details' className='collapse show'>
        <form onSubmit={formik.handleSubmit} noValidate className='form'>
          <div className='card-body border-top p-9'>
            <div className='row mb-6'>
              <label className='col-lg-4 col-form-label fw-bold fs-6'><FormattedMessage id='PROFILE.AVATAR' /></label>
              <div className='col-lg-8'>
                <div className="image-input image-input-outline" data-kt-image-input="true" style={{ backgroundImage: `url(${toAbsoluteUrl('/media/avatars/blank.png')})`, marginLeft: '5px' }}>
                  <div
                      className="image-input-wrapper w-200px h-200px"
                      style={{ backgroundImage: `url(${image === "" ? `${auth?.user?.avatarUrl}` : URL.createObjectURL(image)})` }}
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

            <div className='row mb-6'>
              <label className='col-lg-4 col-form-label required fw-bold fs-6'><FormattedMessage id='PROFILE.FULLNAME' /></label>

              <div className='col-lg-8'>
                <div className='row'>
                  <div className='col-lg-6 fv-row'>
                    <input
                      type='text'
                      className='form-control form-control-lg form-control-solid mb-lg-0'
                      placeholder={intl.formatMessage({ id: "PROFILE.FIRSTNAME" })}
                      {...formik.getFieldProps('firstname')}
                    />
                    {formik.touched.firstname && formik.errors.firstname && (
                      <div className='fv-help-block text-danger'><>{formik.errors.firstname}</></div>
                    )}
                  </div>

                  <div className='col-lg-6 fv-row'>
                    <input
                      type='text'
                      className='form-control form-control-lg form-control-solid'
                      placeholder={intl.formatMessage({ id: "PROFILE.LASTNAME" })}
                      {...formik.getFieldProps('lastname')}
                    />
                    {formik.touched.lastname && formik.errors.lastname && (
                      <div className='fv-help-block text-danger'><>{formik.errors.lastname}</></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className='row mb-6'>
              <label className='col-lg-4 col-form-label fw-bold fs-6'>
                <span className='required'><FormattedMessage id="PROFILE.MOBILENUM" /></span>
              </label>

              <div className='col-lg-8 fv-row'>
                <div className='d-flex align-items-center gap-3'>

                  {/* Country Code Display */}
                  <div className='row'>
                    <div className='col-lg-12 fv-row d-flex align-items-center'>
                      <PhoneInput
                        country="us"
                        value={formik.values.mobileCountryCode}
                        onChange={handlemobileCountryCodeChange}
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
                        }}
                        dropdownStyle={{
                          backgroundColor: isDarkMode ? '#2a2a3b' : '#fff',
                          color: isDarkMode ? '#f1f1f1' : '#212529',
                          border: `1px solid ${isDarkMode ? '#3a3b45' : '#ced4da'}`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Mobile Number Input */}
                  <div className='flex-grow-1'>
                    <input
                      type='text'
                      className='form-control form-control-lg form-control-solid'
                      placeholder={intl.formatMessage({ id: "PROFILE.MOBILENUM" })}
                      {...formik.getFieldProps('mobileNumber')}
                      onChange={handleMobileNumberChange}
                    />
                  </div>
                </div>
                  
                {/* Error messages */}
                {formik.touched.mobileCountryCode && formik.errors.mobileCountryCode && (
                  <div className='fv-help-block text-danger mt-1 small'>
                    {typeof formik.errors.mobileCountryCode === 'string' && formik.errors.mobileCountryCode}
                  </div>
                )}
                {formik.touched.mobileNumber && formik.errors.mobileNumber && (
                  <div className='fv-help-block text-danger mt-1 small'>
                    {typeof formik.errors.mobileNumber === 'string' && formik.errors.mobileNumber}
                  </div>
                )}
            </div>
          </div>
          {appData?.multilanguage &&
          <div className='row mb-6'>
              <label className='col-lg-4 col-form-label required fw-bold fs-6'><FormattedMessage id='PROFILE.LANGUAGE' /></label>

              <div className='col-lg-8'>
                <div className='row'>

                  <div className='col-lg-6 fv-row'>
                    <select
          className='form-select form-select-lg form-select-solid'
          {...formik.getFieldProps('language')}
        >
          {I18N_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
                    {formik.touched.language && formik.errors.language && (
                      <div className='fv-help-block text-danger'><>{formik.errors.language}</></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            }
        </div>
                  
          <div className='card-footer d-flex justify-content-end py-6 px-9'>
            <button type='submit' className='btn btn-primary' disabled={loading}>
              {!loading && intl.formatMessage({ id: "PROFILE.SAVE_CHANGES" })}
              {loading && (
                <span className='indicator-progress' style={{ display: 'block' }}>
                  {intl.formatMessage({ id: "PROFILE.PLEASE_WAIT" })}...{' '}
                  <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { ProfileDetails }
