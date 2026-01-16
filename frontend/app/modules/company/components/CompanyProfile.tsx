import React, { useEffect, useState } from 'react'
import { toAbsoluteUrl } from '../../../../app/theme/helpers'
import { updateCompanyAvatar, updateCompanyProfile } from '../../auth/core/_requests'
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { useAuth } from '../../auth/'
import clsx from 'clsx'
import { AlertSuccess, AlertDanger } from '../../alerts/Alerts'
import { Country, State } from 'country-state-city'
import PhoneInput, { CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { I18N_LANGUAGES } from '../../../theme/i18n/config'
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, useIntl } from 'react-intl'
import { useLanguage } from '../../../theme/providers/TranslationProvider'
import { useAppContext } from '../../../pages/AppContext/AppContext'
import { useThemeMode } from '../../../theme/partials'

const profileDetailsSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .min(10, 'Minimum 10 numbers')
    .max(14, 'Maximum 14 numbers')
    .required('Company phone number is required'),
  companyName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Company name is required'),
  orgType: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Organization type is required'),
  mailingStreetName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Street name/number is required'),
  mailingCountryName: Yup.string().required('Country is required'),
  mailingCityName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('City is required'),
  mailingStateName: Yup.string()
    .min(2, 'Minimum 2 characters')
    .max(50, 'Maximum 50 characters')
    .required('State is required'),
  mailingZip: Yup.string()
    .min(5, 'Minimum 5 numbers')
    .max(6, 'Maximum 6 numbers')
    .required('Zip code is required'),
  billingStreetName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Street name/number is required'),
  billingCountryName: Yup.string().required('Country is required'),
  billingCityName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('City is required'),
  billingStateName: Yup.string()
    .min(2, 'Minimum 2 characters')
    .max(50, 'Maximum 50 characters')
    .required('State is required'),
  billingZip: Yup.string()
    .min(5, 'Minimum 5 numbers')
    .max(6, 'Maximum 5 numbers')
    .required('Zip code is required'),
  language: Yup.string()
    .min(2, 'Minimum 2 characters')
    .max(6, 'Maximum 5 characters')
    .required('Language is required'),
})

const CompanyProfile: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const { currentUser, auth, setCurrentUser, saveAuth } = useAuth()
  const [image, setImage] = useState<any>("")
  const [companyId] = useState(currentUser?.companyId)
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [compPhoneNumb, setCompPhoneNumb] = useState<any>(currentUser?.phoneNumber)
  const [countries, setCountries] = useState<any[]>([])
  const [mailingStates, setMailingStates] = useState<any[]>([])
  const [billingStates, setBillingStates] = useState<any[]>([])

  const [checkboxTick, setCheckboxTick] = useState<any>(false)
  const intl = useIntl()
  const changeLanguage = useLanguage().changeLanguage;
  const { appData } = useAppContext();
  const { mode } = useThemeMode()

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
    setImage(e.target.files[0])
  }

  useEffect(() => {
    const countryList = Country.getAllCountries()
    setCountries(countryList)
  }, [])

  const handleCountryChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    addressType: 'mailing' | 'billing'
  ) => {
    const mobileCountryCode = e.target.value
    const stateList = State.getStatesOfCountry(mobileCountryCode)

    if (addressType === 'mailing') {
      formik.setFieldValue('mailingCountryName', mobileCountryCode)
      setMailingStates(stateList)
      formik.setFieldValue('mailingStateName', '') 
    } else {
      formik.setFieldValue('billingCountryName', mobileCountryCode)
      setBillingStates(stateList)
      if (checkboxTick) {
        formik.setFieldValue('mailingCountryName', mobileCountryCode)
      }
      formik.setFieldValue('billingStateName', '') 
    }
  }

  const isOtherOrgType = (type: string | undefined) => {
    if (!type) return false
    if (type == 'Company' || type == 'Non Profit') return false
    return true
  }
  const [isOtherSelected, setIsOtherSelected] = useState<boolean>(isOtherOrgType(currentUser?.orgType))
  const [orgType, setOrgType] = useState<string | undefined>(currentUser?.orgType)
  const initialValues: any = {
    phoneNumber: currentUser?.phoneNumber,
    phoneNumberCountryCode: currentUser?.phoneNumberCountryCode,
    companyName: currentUser?.companyName,
    orgType: currentUser?.orgType,
    mailingStreetName: currentUser?.mailingAddress?.addressLine,
    mailingCountryName: currentUser?.mailingAddress?.country,
    mailingCityName: currentUser?.mailingAddress?.city,
    mailingStateName: currentUser?.mailingAddress?.state,
    mailingZip: currentUser?.mailingAddress?.postCode,
    billingStreetName: currentUser?.billingAddress?.addressLine,
    billingCountryName: currentUser?.billingAddress?.country,
    billingCityName: currentUser?.billingAddress?.city,
    billingStateName: currentUser?.billingAddress?.state,
    billingZip: currentUser?.billingAddress?.postCode,
    language: auth?.company?.language,
  };

  function getChangedValues(values: any, initialValues: any) {
  const changed: any = {};

  Object.keys(values).forEach((key) => {
    const value = values[key];
    const initialValue = initialValues?.[key];

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const nestedChanges = getChangedValues(value, initialValue || {});
      if (Object.keys(nestedChanges).length > 0) {
        changed[key] = nestedChanges;
      }
    } else if (value !== initialValue) {
      changed[key] = value;
    }
  });

  return changed;
}
const buildPayload = (values: any) => ({
  companyId: companyId?.toString() || '',
  phoneNumber: values.phoneNumber,
  phoneNumberCountryCode: values.phoneNumberCountryCode,
  companyName: values.companyName,
  orgType: values.orgType,
  language: values.language,
  mailingAddress: {
    addressLine: values.mailingStreetName,
    country: values.mailingCountryName,
    city: values.mailingCityName,
    state: values.mailingStateName,
    postCode: values.mailingZip,
  },
  billingAddress: {
    addressLine: values.billingStreetName,
    country: values.billingCountryName,
    city: values.billingCityName,
    state: values.billingStateName,
    postCode: values.billingZip,
  },
});
const initialPayload = buildPayload(initialValues);



const formik = useFormik<any>({
  initialValues,
  validationSchema: profileDetailsSchema,

  onSubmit: (values) => {
    setLoading(true);

    const payload = buildPayload(values);

    // Only changed values
    const changedPayload = getChangedValues(payload, initialPayload);

    // Nothing changed & no image
    if (Object.keys(changedPayload).length === 0 && !image) {
      setLoading(false);
      return;
    }

    const handleResponse = (response: any) => {
      if (response.data.success) {
        if(response.data.companyLogo){
          setCurrentUser((user) => ({
          ...user,
          companyLogo:response.data?.companyLogo
        }))
        let temp = {...auth?.company,companyLogo:response.data.companyLogo}
        saveAuth({
          ...auth,
          company: {...auth.company,temp}
        });
        }
        else{
        setCurrentUser((user) => ({
          ...user,
          ...response.data.companyData,
          companyLanguage: response.data.companyData.language,
        }));
        let temp = {...auth?.company,companyLogo:response.data.companyData}

        saveAuth({
          ...auth,
          company: {...auth.company,temp}});
      }
      console.log(auth)
        setSuccessMessage(response.data.message);

        // if (!response.data.isUserLanguageSet) {
        //   changeLanguage(
        //     I18N_LANGUAGES.find((lang) => lang.code === values.language)
        //   );
        // }
      } else {
        setErrorMessage(response.data.message);
      }

      setLoading(false);
      setChecked(true);
      window.scrollTo(0, 0);
    };

    const handleError = () => {
      setErrorMessage('Failed to update profile details');
      setLoading(false);
      setChecked(true);
      window.scrollTo(0, 0);
    };

    if (image) {
      // ✅ Use updateCompanyAvatar API
      const fd = new FormData();
      fd.append('payload', JSON.stringify(changedPayload));
      fd.append('image', image);

      updateCompanyAvatar(companyId, fd)
        .then(handleResponse)
        .catch(handleError);
    } else {
      // ✅ Use updateCompanyProfile API
      updateCompanyProfile(companyId, changedPayload)
        .then(handleResponse)
        .catch(handleError);
    }
  },
});



  useEffect(() => {
    formik.setFieldValue('phoneNumber', compPhoneNumb)
  }, [compPhoneNumb])


  const handlePhoneNumberChange = (e: any, numbertype: 'Company' | 'Mobile') => {
    if (numbertype == 'Company') {
      const formattedPhoneNumber = formatPhoneNumber(e.target.value);
      setCompPhoneNumb(formattedPhoneNumber);
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

  const updateOrgType = (_type: string) => {
    if (_type == 'Other') {
      setOrgType(_type)
      formik.setFieldValue('orgType', '')
      setIsOtherSelected(true)
    } else {
      setIsOtherSelected(false)
      formik.setFieldValue('orgType', _type)
      setOrgType(_type)
    }
  }

  const autoFillBillingAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setCheckboxTick(isChecked);

    if (isChecked) {
      const {
        billingStreetName,
        billingCountryName,
        billingCityName,
        billingStateName,
        billingZip
      } = formik.values;

      formik.setValues({
        ...formik.values,
        mailingStreetName: billingStreetName,
        mailingCountryName: billingCountryName,
        mailingCityName: billingCityName,
        mailingStateName: billingStateName,
        mailingZip: billingZip
      });
    }
  };


  const handleStreetNameChange = (event: any, addressType: 'mailing' | 'billing') => {
    if (addressType == 'billing') {
      if (checkboxTick) {
        formik.setFieldValue('billingStreetName', event.target.value)
        formik.setFieldValue('mailingStreetName', event.target.value)
      } else {
        formik.setFieldValue('billingStreetName', event.target.value)
      }
    } else if (addressType == 'mailing') {
      formik.setFieldValue('mailingStreetName', event.target.value)
    }
  }
console.log(auth)

  const handleCityNameChange = (event: any, addressType: 'mailing' | 'billing') => {
    if (addressType == 'billing') {
      if (checkboxTick) {
        formik.setFieldValue('billingCityName', event.target.value)
        formik.setFieldValue('mailingCityName', event.target.value)
      } else {
        formik.setFieldValue('billingCityName', event.target.value)
      }
    } else if (addressType == 'mailing') {
      formik.setFieldValue('mailingCityName', event.target.value)
    }
  }

  const handleStateNameChange = (event: any, addressType: 'mailing' | 'billing') => {
    if (addressType == 'billing') {
      if (checkboxTick) {
        formik.setFieldValue('mailingStateName', event.target.value)
        formik.setFieldValue('billingStateName', event.target.value)
      } else {
        formik.setFieldValue('billingStateName', event.target.value)
      }
    } else if (addressType == 'mailing') {
      formik.setFieldValue('mailingStateName', event.target.value)
    }
  }

  useEffect(() => {
    if (formik.values.billingCountryName) {
      const stateList = State.getStatesOfCountry(formik.values.billingCountryName)
      setBillingStates(stateList)

      if (!formik.values.billingStateName && stateList.length > 0) {
        formik.setFieldValue('billingStateName', stateList[0].name) // or isoCode
      }
    }
    if (formik.values.mailingCountryName) {
      const stateList = State.getStatesOfCountry(formik.values.mailingCountryName)
      setMailingStates(stateList)

      if (!formik.values.mailingStateName && stateList.length > 0) {
        formik.setFieldValue('mailingStateName', stateList[0].name) // or isoCode
      }
    }
  }, [])

  const handleZipCodeChange = (event: any, addressType: 'mailing' | 'billing') => {
    if (addressType == 'billing') {
      if (checkboxTick) {
        formik.setFieldValue('mailingZip', event.target.value)
        formik.setFieldValue('billingZip', event.target.value)
      } else {
        formik.setFieldValue('billingZip', event.target.value)
      }
    } else if (addressType == 'mailing') {
      formik.setFieldValue('mailingZip', event.target.value)
    }
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

  const handleMailingZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleZipCodeChange(e, "mailing");
  };

  const handleMailingStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleStateNameChange(e, "mailing");
  };

  const handleMailingCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleCountryChange(e, "mailing");
  };

  const handleMailingCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleCityNameChange(e, "mailing");
  };

  const handleMailingStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStreetNameChange(e, "mailing");
  };

  const handleBillingZipChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingZip', value);
    if (checkboxTick) formik.setFieldValue('mailingZip', value);
  };


  const handleBillingStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingStateName', value);
    if (checkboxTick) formik.setFieldValue('mailingStateName', value);
  };

  const handleBillingCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingCityName', value);
    if (checkboxTick) formik.setFieldValue('mailingCityName', value);
  };


  const handleBillingCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    formik.setFieldValue('billingCountryName', countryCode);

    const stateList = State.getStatesOfCountry(countryCode);
    setBillingStates(stateList);

    if (checkboxTick) {
      formik.setFieldValue('mailingCountryName', countryCode);
      setMailingStates(stateList);
    }
  };


  const handleBillingStreetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingStreetName', value);
    if (checkboxTick) formik.setFieldValue('mailingStreetName', value);
  };

  const handleCompanyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhoneNumberChange(e, "Company");
  };

  const handlePhoneCodeChange = (_: string, countryData: CountryData) => {
    formik.setFieldValue('phoneNumberCountryCode', countryData.dialCode);
    formik.setFieldTouched('phoneNumberCountryCode', true, false);
  };

  const handleOrgTypeChange = (type: string) => () => {
    updateOrgType(type);
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
          <h3 className='fw-bolder m-0'><FormattedMessage id='COMPANY.PROFILE.TITLE' /></h3>
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
              <label className='col-lg-4 col-form-label fw-bold fs-6'><FormattedMessage id='COMPANY.PROFILE.LOGO' /></label>
              <div className='col-lg-8'>
                <div className="image-input image-input-outline" data-kt-image-input="true" style={{ backgroundImage: `url(${toAbsoluteUrl('/media/avatars/blank.png')})`, marginLeft: '5px' }}>
                  <div
                      className="image-input-wrapper w-200px h-200px"
                      style={{ backgroundImage: `url(${image === "" ? `${auth?.company?.companyLogo}` : URL.createObjectURL(image)})` }}
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
              <label className='col-lg-4 col-form-label required fw-bold fs-6'><FormattedMessage id='COMPANY.PROFILE.NAME' /></label>

              <div className='col-lg-8 fv-row'>
                <input
                  type='text'
                  className='form-control form-control-lg form-control-solid'
                  placeholder='Company name'
                  {...formik.getFieldProps('companyName')}
                />
                {formik.touched.companyName && formik.errors.companyName && (
                  <div className='fv-help-block text-danger mt-1'>
                    <>{formik.errors.companyName}</>
                  </div>
                )}
              </div>
            </div>

            <div className='row mb-6'>
              <label className='col-lg-4 col-form-label fw-bold fs-6'>
                <span className='required'>
                  <FormattedMessage id='COMPANY.PROFILE.PHONE' />
                </span>
              </label>
              <div className='col-lg-8 fv-row d-flex'>
                <div className='d-flex align-items-center gap-3'></div>

                {/* Country Code Input */}
                <div>
                  <div className='col-lg-14 fv-row d-flex align-items-center'>
                    <PhoneInput
                      country={formik.values.phoneNumberCountryCode === '1' ? 'us' :""}
                      value={formik.values.phoneNumberCountryCode}
                      onChange={handlePhoneCodeChange}
                      inputProps={{
                        name: 'phoneNumberCountryCode',
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
                
                {/* Phone Number Input */}
                <div className='flex-grow-1'>
                  <input
                    type='text'
                    className='form-control form-control-lg form-control-solid'
                    placeholder='Company phone number'
                    {...formik.getFieldProps('phoneNumber')}
                    onChange={handleCompanyPhoneChange}
                  />
                </div>
              </div>
                            
              {/* Error messages */}
              {formik.touched.phoneNumberCountryCode && formik.errors.phoneNumberCountryCode && (
                <div className='fv-help-block text-danger mt-1 small'>
                  {typeof formik.errors.phoneNumberCountryCode === 'string' && formik.errors.phoneNumberCountryCode}
                </div>
              )}

            {/*begin::Form Group */}
              {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                <div className='fv-help-block text-danger mt-1 small'>
                  {typeof formik.errors.phoneNumber === 'string' && formik.errors.phoneNumber}
                </div>
                )}
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
                      <option value=''>
                        {intl.formatMessage({ id: 'SELECT.LANGUAGE', defaultMessage: 'Select language' })}
                      </option>

                      {I18N_LANGUAGES.map((lang:any) => (
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

            {/*begin::Form Group */}
            <div className='fv-row mb-8 org-type'>
              <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id='COMPANY.PROFILE.TYPE' /></label>
              <div>
                {/*begin:Option */}
                <label className='d-flex align-items-center justify-content-between mb-6 cursor-pointer'>
                  <span className='d-flex align-items-center me-2'>
                    <span className='d-flex flex-column'>
                      <span className='fw-bold text-muted fs-6'><FormattedMessage id='AUTH.REGISTER.ORG_TYPE.TYPE1' /></span>
                    </span>
                  </span>

                  <span className='form-check form-check-custom form-check-solid'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='orgType'
                      value='Company'
                      checked={orgType === 'Company' && !isOtherSelected}
                      onChange={handleOrgTypeChange('Company')}
                    />
                  </span>
                </label>
                {/*end::Option */}

                {/*begin:Option */}
                <label className='d-flex align-items-center justify-content-between mb-6 cursor-pointer'>
                  <span className='d-flex align-items-center me-2'>
                    <span className='d-flex flex-column'>
                      <span className='fw-bold text-muted fs-6'><FormattedMessage id='AUTH.REGISTER.ORG_TYPE.TYPE2' /></span>
                    </span>
                  </span>

                  <span className='form-check form-check-custom form-check-solid'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='orgType'
                      value='Non Profit'
                      checked={orgType === 'Non Profit' && !isOtherSelected}
                      onChange={handleOrgTypeChange('Non Profit')}
                    />
                  </span>
                </label>
                {/*end::Option */}

                {/*begin:Option */}
                <label className='d-flex align-items-center justify-content-between mb-6 cursor-pointer'>
                  <span className='d-flex align-items-center me-2'>
                    <span className='d-flex flex-column'>
                      <span className='fw-bold text-muted fs-6'><FormattedMessage id='AUTH.REGISTER.ORG_TYPE.TYPE3' /></span>
                    </span>
                  </span>

                  <span className='form-check form-check-custom form-check-solid'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='appType'
                      value='Other'
                      checked={isOtherSelected}
                      onChange={handleOrgTypeChange('Other')}
                    />
                  </span>
                </label>
                {/*end::Option */}

                {isOtherSelected &&
                  <>
                    <input
                      type='text'
                      placeholder='Organization type'
                      autoComplete='off'
                      {...formik.getFieldProps('orgType')}
                      className="form-control form-control-lg form-control-solid"
                    />

                    <>
                      {formik.touched.orgType && formik.errors.orgType && (
                        <div className='fv-help-block text-danger fw-normal'>
                          <span role='alert'><>{formik.errors.orgType}</></span>
                        </div>
                      )}
                    </>
                  </>
                }

              </div>
            </div>
            {/*end::Form Group */}

            <label
              className='btn btn-outline btn-outline-dashed btn-outline-default p-7 d-flex align-items-center mb-10'
              htmlFor='kt_create_account_form_account_type_personal'
            >
              <span className='w-100 fw-bold text-start'>
                <span className='text-dark fw-bolder d-block fs-4 mb-2'><FormattedMessage id='AUTH.REGISTER.BILLING_ADDRESS' /></span>
                <div className='row mb-6'>
                  <label className='col-lg-4 col-form-label fw-bold fs-6'>
                    <span className='required'><FormattedMessage id='TEAM.ADDRESS.STREET' /></span>
                  </label>

                  <div className='col-lg-8 fv-row'>
                    <input
                      type='text'
                      className='form-control form-control-lg form-control-solid'
                      placeholder='Street Name'
                      {...formik.getFieldProps('billingStreetName')}
                      onChange={handleBillingStreetChange}
                    />

                    {formik.touched.billingStreetName && formik.errors.billingStreetName && (
                      <div className='fv-help-block text-danger mt-1 small fw-normal'>
                        <>{formik.errors.billingStreetName}</>
                      </div>
                    )}
                  </div>
                </div>

                <div className='row mb-6'>
                  <label className='col-lg-4 col-form-label fw-bold fs-6'>
                    <span className='required'>
                      <FormattedMessage id='TEAM.ADDRESS.COUNTRY' />
                    </span>
                  </label>

                  <div className='col-lg-8 fv-row'>
                    <select
                      name='billingCountryName'
                      className={clsx(
                        'form-control form-control-lg form-control-solid',
                        {
                          'is-invalid':
                            formik.touched.billingCountryName &&
                            formik.errors.billingCountryName,
                        },
                        {
                          'is-valid':
                            formik.touched.billingCountryName &&
                            !formik.errors.billingCountryName,
                        }
                      )}
                      value={formik.values.billingCountryName}
                      onChange={handleBillingCountryChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value=''><FormattedMessage id="AUTH.SELECT_COUNTRY" /></option>
                      {countries.map((country) => (
                        <option key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </option>
                      ))}
                    </select>

                    {formik.touched.billingCountryName &&
                      formik.errors.billingCountryName && (
                        <div className='fv-help-block text-danger mt-1 small fw-normal'>
                          {typeof formik.errors.billingCountryName === 'string' && (
                            <span>{formik.errors.billingCountryName}</span>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                <div className='row mb-6'>
                  <label className='col-lg-4 col-form-label fw-bold fs-6'>
                    <span className='required'><FormattedMessage id='TEAM.ADDRESS.CITY' /></span>
                  </label>

                  <div className='col-lg-8 fv-row'>
                    <input
                      type='text'
                      className='form-control form-control-lg form-control-solid'
                      placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.CITY" })}
                      {...formik.getFieldProps('billingCityName')}
                      onChange={handleBillingCityChange}
                    />

                    {formik.touched.billingCityName && formik.errors.billingCityName && (
                      <div className='fv-help-block text-danger mt-1 small fw-normal'>
                        <>{formik.errors.billingCityName}</>
                      </div>
                    )}
                  </div>
                </div>

                <div className='row mb-6'>
                  <label className='col-lg-4 col-form-label fw-bold fs-6'>
                    <span className='required'><FormattedMessage id='TEAM.ADDRESS.STATE' /></span>
                  </label>

                  <div className='col-lg-8 fv-row'>

                    <select
                      value={formik.getFieldMeta('billingStateName').value}
                      className='form-select form-select-lg form-select-solid'
                      name='states'
                      onChange={handleBillingStateChange}
                    >
                      <option value=""><FormattedMessage id='COMPANY.PROFILE.STATE' /></option>
                      {billingStates.map((s) => (
                        <option key={s.isoCode} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {formik.touched.billingStateName &&
                      formik.errors.billingStateName && (
                      <div className='fv-help-block text-danger mt-1 small fw-normal'>
                        {typeof formik.errors.billingStateName === 'string' && (
                          <span>{formik.errors.billingStateName}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className='row mb-6'>
                  <label className='col-lg-4 col-form-label fw-bold fs-6'>
                    <span className='required'><FormattedMessage id='TEAM.ADDRESS.ZIP' /></span>
                  </label>

                  <div className='col-lg-8 fv-row'>
                    <input
                      type='text'
                      className='form-control form-control-lg form-control-solid'
                      placeholder='Zipcode'
                      {...formik.getFieldProps('billingZip')}
                      onChange={handleBillingZipChange}
                    />

                    {formik.touched.billingZip && formik.errors.billingZip && (
                      <div className='fv-help-block text-danger mt-1 small fw-normal'>
                        <>{formik.errors.billingZip}</>
                      </div>
                    )}
                  </div>
                </div>
              </span>
            </label>

            <label
              className='btn btn-outline btn-outline-dashed btn-outline-default p-7 d-flex align-items-center mb-10'
              htmlFor='kt_create_account_form_account_type_personal'
            >
              <span className='w-100 fw-bold text-start'>
                <span className='text-dark fw-bolder d-block fs-4 mb-2'><FormattedMessage id='AUTH.REGISTER.MAILING_ADDRESS' /></span>

                <div className='fv-row'>
                  <input
                    className="form-check-input me-5"
                    onChange={autoFillBillingAddress}
                    type="checkbox"
                    checked={checkboxTick}
                  />
                  <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id='AUTH.REGISTER.ADDRESS.SAME' /></label>
                </div>

                {!checkboxTick &&
                  <>
                    <div className='row mb-6'>
                      <label className='col-lg-4 col-form-label fw-bold fs-6'>
                        <span className='required'><FormattedMessage id='TEAM.ADDRESS.STREET' /></span>
                      </label>

                      <div className='col-lg-8 fv-row'>
                        <input
                          type='text'
                          className='form-control form-control-lg form-control-solid'
                          placeholder='Street Name'
                          {...formik.getFieldProps('mailingStreetName')}
                          onChange={handleMailingStreetChange}
                        />

                        {formik.touched.mailingStreetName && formik.errors.mailingStreetName && (
                          <div className='fv-help-block text-danger mt-1 fw-normal'>
                            <>{formik.errors.mailingStreetName}</>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='row mb-6'>
                      <label className='col-lg-4 col-form-label fw-bold fs-6'>
                        <span className='required'><FormattedMessage id='TEAM.ADDRESS.CITY' /></span>
                      </label>

                      <div className='col-lg-8 fv-row'>
                        <input
                          type='text'
                          className='form-control form-control-lg form-control-solid'
                          placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.CITY" })}
                          {...formik.getFieldProps('mailingCityName')}
                          onChange={handleMailingCityChange}
                        />

                        {formik.touched.mailingCityName && formik.errors.mailingCityName && (
                          <div className='fv-help-block text-danger mt-1 fw-normal'>
                            <>{formik.errors.mailingCityName}</>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='row mb-6'>
                      <label className='col-lg-4 col-form-label fw-bold fs-6'>
                        <span className='required'><FormattedMessage id='TEAM.ADDRESS.COUNTRY' /></span>
                      </label>

                      <div className='col-lg-8 fv-row'>

                        <select
                          name='mailingCountryName'
                          className={clsx(
                            'form-control form-control-lg form-control-solid',
                            {
                              'is-invalid':
                                formik.touched.mailingCountryName &&
                                formik.errors.mailingCountryName,
                            },
                            {
                              'is-valid':
                                formik.touched.mailingCountryName &&
                                !formik.errors.mailingCountryName,
                            }
                          )}
                          value={formik.values.mailingCountryName}
                          onChange={handleMailingCountryChange}
                          onBlur={formik.handleBlur}
                        >
                          <option value=''><FormattedMessage id="AUTH.SELECT_COUNTRY" /></option>
                          {countries.map((country) => (
                            <option key={country.isoCode} value={country.isoCode}>
                              {country.name}
                            </option>
                          ))}
                        </select>

                        {formik.touched.mailingCountryName &&
                          formik.errors.mailingCountryName && (
                            <div className='fv-help-block text-danger mt-1 fw-normal'>
                              {typeof formik.errors.mailingCountryName === 'string' && (
                                <span>{formik.errors.mailingCountryName}</span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className='row mb-6'>
                      <label className='col-lg-4 col-form-label fw-bold fs-6'>
                        <span className='required'>
                          <FormattedMessage id='TEAM.ADDRESS.STATE' />
                        </span>
                      </label>

                      <div className='col-lg-8 fv-row'>

                        <select
                          value={formik.getFieldMeta('mailingStateName').value}
                          className='form-select form-select-lg form-select-solid'
                          name='states'
                          onChange={handleMailingStateChange}
                        >
                          <option value=""><FormattedMessage id='COMPANY.PROFILE.STATE' /></option>
                          {mailingStates.map((s) => (
                            <option key={s.isoCode} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {formik.touched.mailingStateName &&
                          formik.errors.mailingStateName && (
                          <div className='fv-help-block text-danger mt-1 fw-normal'>
                            {typeof formik.errors.mailingStateName === 'string' && (
                              <span>{formik.errors.mailingStateName}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='row mb-6'>
                      <label className='col-lg-4 col-form-label fw-bold fs-6'>
                        <span className='required'><FormattedMessage id='TEAM.ADDRESS.ZIP' /></span>
                      </label>

                      <div className='col-lg-8 fv-row'>
                        <input
                          type='text'
                          className='form-control form-control-lg form-control-solid'
                          placeholder='Zipcode'
                          {...formik.getFieldProps('mailingZip')}
                          onChange={handleMailingZipChange}
                        />

                        {formik.touched.mailingZip && formik.errors.mailingZip && (
                          <div className='fv-help-block text-danger mt-1 fw-normal'>
                            <>{formik.errors.mailingZip}</>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                }
              </span>
            </label>
          </div>

          <div className='card-footer d-flex justify-content-end py-6 px-9'>
            <button type='submit' className='btn btn-primary' disabled={loading}>
              {!loading && <FormattedMessage id='PROFILE.SAVE_CHANGES' />}
              {loading && (
                <span className='indicator-progress' style={{ display: 'block' }}>
                  <FormattedMessage id='PROFILE.PLEASE_WAIT' />...{' '}
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

export { CompanyProfile }
