import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik'
import * as Yup from 'yup'
import clsx from 'clsx';
import { Country, State } from 'country-state-city';
import PhoneInput, { CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { FormattedMessage, useIntl } from 'react-intl';

interface Step3Props {
  companyDetails: {
    companyName?: string;
    phoneNumberCountryCode: string;
    phoneNumber?: string;
    orgType?: string;
    mailingStreetName?: string;
    mailingCountryName?: string;
    mailingCityName?: string;
    mailingStateName?: string;
    mailingZip?: string;
    billingStreetName?: string;
    billingCountryName?: string;
    billingCityName?: string;
    billingStateName?: string;
    billingZip?: string;
  };
  onCompanyDetailsChange: (details: { [key: string]: string }) => void;
  checkboxTick: any;
  setCheckboxTick: any;
}

const initialValues = {
  companyName: '',
  phoneNumberCountryCode: '+1',
  phoneNumber: '',
  orgType: '',
  mailingStreetName: '',
  mailingCountryName: '',
  mailingCityName: '',
  mailingStateName: '',
  mailingZip: '',
  billingStreetName: '',
  billingCountryName: '',
  billingCityName: '',
  billingStateName: '',
  billingZip: '',
}

const registrationSchema = Yup.object().shape({
  phoneNumber: Yup.string()
    .min(10, 'Minimum 10 numbers')
    .max(15, 'Maximum 15 numbers')
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
  mailingCountryName: Yup.string()
    .required('Country is required'),
  mailingCityName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('City is required'),
  mailingStateName: Yup.string()
    .required('State is required'),
  mailingZip: Yup.string()
    .min(5, 'Minimum 5 numbers')
    .max(6, 'Maximum 6 numbers')
    .required('Zip code is required'),
  billingStreetName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('Street name/number is required'),
  billingCountryName: Yup.string()
    .required('Country is required'),
  billingCityName: Yup.string()
    .min(3, 'Minimum 3 characters')
    .max(50, 'Maximum 50 characters')
    .required('City is required'),
  billingStateName: Yup.string()
    .required('State is required'),
  billingZip: Yup.string()
    .min(5, 'Minimum 5 numbers')
    .max(6, 'Maximum 6 numbers')
    .required('Zip code is required'),
})

const Step3: React.FC<Step3Props> = ({ companyDetails, onCompanyDetailsChange, checkboxTick, setCheckboxTick }) => {
  const [compPhoneNumb, setCompPhoneNumb] = useState<any>('')
  const [orgType, setOrgType] = useState<string>('')
  const [isOtherSelected, setIsOtherSelected] = useState<boolean>(false)
  const [countries, setCountries] = useState<any[]>([]);
  const [mailingStates, setMailingStates] = useState<any[]>([]);
  const [billingStates, setBillingStates] = useState<any[]>([]);
  const intl = useIntl();

  useEffect(() => {
    const countryList = Country.getAllCountries();
    setCountries(countryList);
  }, []);

  useEffect(() => {
    if (companyDetails.mailingCountryName) {
      setMailingStates(State.getStatesOfCountry(companyDetails.mailingCountryName));
    }
    if (companyDetails.billingCountryName) {
      setBillingStates(State.getStatesOfCountry(companyDetails.billingCountryName));
    }
  }, [companyDetails.mailingCountryName, companyDetails.billingCountryName]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>, addressType: 'mailing' | 'billing') => {
    const mobileCountryCode = e.target.value;
    const stateList = State.getStatesOfCountry(mobileCountryCode);

    if (addressType === 'mailing') {
      formik.setFieldValue('mailingCountryName', mobileCountryCode);
      setMailingStates(stateList);
      formik.setFieldValue('mailingStateName', ''); // Reset state when country change
    } else {
      formik.setFieldValue('billingCountryName', mobileCountryCode);
      setBillingStates(stateList);
      if(checkboxTick){
        formik.setFieldValue('mailingCountryName', mobileCountryCode)
      }
      formik.setFieldValue('billingStateName', ''); // Reset state when country changes
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: registrationSchema,
    onSubmit: () => {
      // onCompanyDetailsChange(values)
    },
  });

  const handlePhoneNumberChange = (e: any, numbertype: 'Company') => {
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
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }

  useEffect(() => {
    formik.setFieldValue('phoneNumber', compPhoneNumb)
  }, [compPhoneNumb])

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

  useEffect(() => {
    if (formik.isValid) {
      onCompanyDetailsChange(formik.values)
    }
  }, [formik.values, formik.isValid]);

  useEffect(() => {
    window.scrollTo(0, 0)
  }, []);

  useEffect(() => {
    if (companyDetails) {
      formik.setFieldValue('companyName', companyDetails.companyName)
      formik.setFieldValue('phoneNumberCountryCode', companyDetails.phoneNumberCountryCode)
      formik.setFieldValue('phoneNumber', companyDetails.phoneNumber)
      formik.setFieldValue('orgType', companyDetails.orgType)
      updateOrgType(companyDetails.orgType ?? "")
      formik.setFieldValue('mailingStreetName', companyDetails.mailingStreetName)
      formik.setFieldValue('mailingCityName', companyDetails.mailingCityName)
      formik.setFieldValue('mailingStateName', companyDetails.mailingStateName)
      formik.setFieldValue('mailingZip', companyDetails.mailingZip)
      formik.setFieldValue('billingStreetName', companyDetails.billingStreetName)
      formik.setFieldValue('billingCityName', companyDetails.billingCityName)
      formik.setFieldValue('billingStateName', companyDetails.billingStateName)
      formik.setFieldValue('billingZip', companyDetails.billingZip)
    }
  }, [])

  const handleMailingZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleZipCodeChange(e, 'mailing');
  };

  const handleMailingStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleStateNameChange(e, 'mailing');
  };
  
  const handleMailingCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleCityNameChange(e, 'mailing');
  };

  const handleMailingCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleCountryChange(e, 'mailing');
  };

  const handleMailingStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStreetNameChange(e, 'mailing');
  };

  const handleBillingZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingZip', value);
    if (checkboxTick) formik.setFieldValue('mailingAddress.postCode', value);
  };


  const handleBillingStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingStateName', value);
    if (checkboxTick) formik.setFieldValue('mailingAddress.state', value);
  };


  const handleBillingCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingCityName', value);
    if (checkboxTick) formik.setFieldValue('mailingCityName', value);
  };


  const handleBillingCountryChange = (e) => {
    const countryCode = e.target.value;
    formik.setFieldValue('billingCountryName', countryCode);
    
    const stateList = State.getStatesOfCountry(countryCode);
    setBillingStates(stateList);
    
    if (checkboxTick) {
      formik.setFieldValue('mailingCountryName', countryCode);
      setMailingStates(stateList);
    }
  };


  const handleBillingStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    formik.setFieldValue('billingStreetName', value);
    if (checkboxTick) formik.setFieldValue('mailingStreetName', value);
  };


  const handleCompanyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhoneNumberChange(e, 'Company');
  };

  const handlePhoneCodeChange = (_: string, countryData: CountryData) => {
    formik.setFieldValue('phoneNumberCountryCode', countryData.dialCode);
    formik.setFieldTouched('phoneNumberCountryCode', true, false);
  };

  const handleOrgTypeChange = (type: string) => () => {
    updateOrgType(type);
  };

  return (
      <div>
        <h2 className='fw-bolder d-flex align-items-center text-dark mb-10'>
          <FormattedMessage id='COMPANY.DETAILS' />
          <i
            className='fas fa-exclamation-circle ms-2 fs-7'
            data-bs-toggle='tooltip'
            title={intl.formatMessage({ id:"AUTH.REGISTER.BILLING" })}
          ></i>
        </h2>
        <label
          className={`btn btn-outline btn-outline-default mb-10 p-7 d-flex align-items-center ${formik.isValid ? 'btn-outline-success' : 'btn-outline-dashed'}`}
          htmlFor='kt_create_account_form_account_type_personal'
        >
          <span className='w-100 fw-bold text-start'>
            {/* begin::Form group Company Name */}
            <div className='fv-row mb-8'>
              <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="AUTH.REGISTER.COMP_NAME" /></label>
              <input
                placeholder={intl.formatMessage({ id:"COMPANY.NAME" })}
                type='text'
                autoComplete='off'
                {...formik.getFieldProps('companyName')}
                className={clsx(
                  'form-control bg-transparent',
                  { 'is-invalid': formik.touched.companyName && formik.errors.companyName, },
                  { 'is-valid': formik.touched.companyName && !formik.errors.companyName, }
                )}
              />
              {formik.touched.companyName && formik.errors.companyName && (
                <div className='fv-help-block text-danger fw-normal'>
                  <span role='alert'>{formik.errors.companyName}</span>
                </div>
              )}
            </div>
            {/* end::Form group */}

            {/* begin::Form group Phone number */}
            <div className='mb-8'>
              <label className='form-label fw-bolder text-dark fs-6 mb-2'><FormattedMessage id="COMPANY.PROFILE.PHONE" /></label>
              <div className='d-flex gap-3'>

                {/* Display selected country code */}
                <div className='w-50'>
                  <div className='col-lg-14 fv-row d-flex align-items-center'>
                    <PhoneInput
                      country={'us'}
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

                {/* Phone number input */}
                <div className='flex-grow-1 position-relative'>
                  <input
                    placeholder={intl.formatMessage({ id:"COMPANY.PROFILE.PHONE" })}
                    type='text'
                    value={formik.values.phoneNumber}
                    onChange={handleCompanyPhoneChange}

                    onBlur={formik.handleBlur}
                    name='phoneNumber'
                    className={clsx(
                      'form-control bg-transparent',
                      { 'is-invalid': formik.touched.phoneNumber && formik.errors.phoneNumber },
                      { 'is-valid': formik.touched.phoneNumber && !formik.errors.phoneNumber }
                    )}
                  />
                </div>
              </div>
              {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                <div className='fv-help-block text-danger fw-normal'>
                  <span role='alert'>{formik.errors.phoneNumber}</span>
                </div>
              )}
            </div>
            {/* end::Form group */}

            {/*begin::Form Group */}
            <div className='fv-row mb-8 mt-3'>
              <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="AUTH.REGISTER.ORG_TYPE" /></label>
              <div>
                {/*begin:Option */}
                <label className='d-flex align-items-center justify-content-between mb-6 cursor-pointer'>
                  <span className='d-flex align-items-center me-2'>
                    <span className='d-flex flex-column'>
                      <span className='fw-bold text-muted fs-6'>Company</span>
                    </span>
                  </span>

                  <span className='form-check form-check-custom form-check-solid'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='orgType'
                      value='Company'
                      checked={orgType === 'Company'}
                      onChange={handleOrgTypeChange('Company')}
                    />
                  </span>
                </label>
                {/*end::Option */}

                {/*begin:Option */}
                <label className='d-flex align-items-center justify-content-between mb-6 cursor-pointer'>
                  <span className='d-flex align-items-center me-2'>
                    <span className='d-flex flex-column'>
                      <span className='fw-bold text-muted fs-6'>Non Profit</span>
                    </span>
                  </span>

                  <span className='form-check form-check-custom form-check-solid'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='orgType'
                      value='Non Profit'
                      checked={orgType === 'Non Profit'}
                      onChange={handleOrgTypeChange('Non Profit')}
                    />
                  </span>
                </label>
                {/*end::Option */}

                {/*begin:Option */}
                <label className='d-flex align-items-center justify-content-between mb-6 cursor-pointer'>
                  <span className='d-flex align-items-center me-2'>
                    <span className='d-flex flex-column'>
                      <span className='fw-bold text-muted fs-6'>Other</span>
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
                      className={clsx(
                        'mt-2 form-control bg-transparent',
                        { 'is-invalid': formik.touched.orgType && formik.errors.orgType, },
                        { 'is-valid': formik.touched.orgType && !formik.errors.orgType, }
                      )}
                    />
                    <>
                      {formik.touched.orgType && formik.errors.orgType && (
                        <div className='fv-plugins-message-container'>
                          <div className='fv-help-block'>
                            <span role='alert'>{formik.errors.orgType}</span>
                          </div>
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
                <span className='text-dark fw-bolder d-block fs-4 mb-5'><FormattedMessage id="AUTH.REGISTER.BILLING_ADDRESS" /> </span>
                {/* begin::Form group Street Name */}
                <div className='fv-row mb-8'>
                  <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.STREET" /></label>
                  <input
                    placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.STREET" })}
                    type='text'
                    autoComplete='off'
                    {...formik.getFieldProps('billingStreetName')}
                    onChange={handleBillingStreetChange}
                    className={clsx(
                      'form-control bg-transparent',
                      { 'is-invalid': formik.touched.billingStreetName && formik.errors.billingStreetName, },
                      { 'is-valid': formik.touched.billingStreetName && !formik.errors.billingStreetName, }
                    )}
                  />
                  {formik.touched.billingStreetName && formik.errors.billingStreetName && (
                    <div className='fv-help-block text-danger fw-normal'>
                      <span role='alert'>{formik.errors.billingStreetName}</span>
                      </div>
                  )}
                </div>
                {/* end::Form group */}
                {/* begin::Form group Country */}
                <div className='fv-row mb-8'>
                  <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="AUTH.COUNTRY" /></label>
                  <select
                    name="billingCountryName"
                    className={clsx(
                      'form-select form-select-lg form-select-solid mb-6',
                      { 'is-invalid': formik.touched.billingCountryName && formik.errors.billingCountryName, },
                      { 'is-valid': formik.touched.billingCountryName && !formik.errors.billingCountryName, }
                    )}
                    value={formik.values.billingCountryName}
                    onChange={handleBillingCountryChange}
                    onBlur={formik.handleBlur}
                  >
                    <option value=""><FormattedMessage id="AUTH.SELECT_COUNTRY" /></option>
                    {countries.map((c) => (
                      <option key={c.isoCode} value={c.isoCode}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {formik.touched.billingCountryName && formik.errors.billingCountryName && (
                    <div className='fv-help-block text-danger fw-normal'>
                      <span role='alert'>{formik.errors.billingCountryName}</span>
                    </div>
                  )}
                </div>
                {/* end::Form group */}
                {/* begin::Form group Street Name */}
                <div className='fv-row mb-8'>
                  <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.CITY" /></label>
                  <input
                    placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.CITY" })}
                    type='text'
                    autoComplete='off'
                    {...formik.getFieldProps('billingCityName')}
                    onChange={handleBillingCityChange}
                    className={clsx(
                      'form-control bg-transparent',
                      { 'is-invalid': formik.touched.billingCityName && formik.errors.billingCityName, },
                      { 'is-valid': formik.touched.billingCityName && !formik.errors.billingCityName, }
                    )}
                  />
                  {formik.touched.billingCityName && formik.errors.billingCityName && (
                    <div className='fv-help-block text-danger fw-normal'>
                      <span role='alert'>{formik.errors.billingCityName}</span>
                    </div>
                  )}
                </div>
                {/* end::Form group */}
                {/* begin::Form group Street Name */}
                <div className='fv-row mb-8'>
                  <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.STATE" /> </label>
                  <select
                    value={formik.getFieldMeta('billingStateName').value}
                    className='form-select form-select-lg form-select-solid'
                    name='states'
                    onChange={handleBillingStateChange}
                  >
                    {billingStates.map((s) => (
                      <option key={s.isoCode} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* end::Form group */}
                {/* begin::Form group Street Name */}
                <div className='fv-row mb-8'>
                  <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.ZIP" /></label>
                  <input
                    placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.ZIP" })}
                    type='text'
                    autoComplete='off'
                    {...formik.getFieldProps('billingZip')}
                    onChange={handleBillingZipChange}
                    className={clsx(
                      'form-control bg-transparent',
                      { 'is-invalid': formik.touched.billingZip && formik.errors.billingZip, },
                      { 'is-valid': formik.touched.billingZip && !formik.errors.billingZip, }
                    )}
                  />
                  {formik.touched.billingZip && formik.errors.billingZip && (
                    <div className='fv-help-block text-danger fw-normal'>
                      <span role='alert'>{formik.errors.billingZip}</span>
                    </div>
                  )}
                </div>
                {/* end::Form group */}
              </span>
            </label>

            <label
              className='btn btn-outline btn-outline-dashed btn-outline-default p-7 d-flex align-items-center mb-10'
              htmlFor='kt_create_account_form_account_type_personal'
            >
              <span className='w-100 fw-bold text-start'>
                <span className='text-dark fw-bolder d-block fs-4 mb-5'> <FormattedMessage id="AUTH.REGISTER.MAILING_ADDRESS" /></span>

                <div className='fv-row mb-8'>
                  <input
                    className="form-check-input me-5"
                    onChange={autoFillBillingAddress}
                    type="checkbox"
                    checked={checkboxTick}
                  />
                  <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="AUTH.REGISTER.ADDRESS.SAME" /></label>
                </div>

                {!checkboxTick &&
                  <>
                    {/* begin::Form group Street Name */}
                    <div className='fv-row mb-8'>
                      <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.STREET" /></label>
                      <input
                        placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.STREET" })}
                        type='text'
                        autoComplete='off'
                        {...formik.getFieldProps('mailingStreetName')}
                        onChange={handleMailingStreetChange}
                        className={clsx(
                          'form-control bg-transparent',
                          { 'is-invalid': formik.touched.mailingStreetName && formik.errors.mailingStreetName, },
                          { 'is-valid': formik.touched.mailingStreetName && !formik.errors.mailingStreetName, }
                        )}
                      />
                      {formik.touched.mailingStreetName && formik.errors.mailingStreetName && (
                        <div className='fv-help-block text-danger fw-normal'>
                            <span role='alert'>{formik.errors.mailingStreetName}</span>
                        </div>
                      )}
                    </div>
                    {/* end::Form group */}
                    {/* begin::Form group Country */}
                    <div className='fv-row mb-8'>
                      <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="AUTH.COUNTRY" /></label>
                      <select
                        name="mailingCountryName"
                        className={clsx(
                          'form-select form-select-lg form-select-solid mb-6',
                          { 'is-invalid': formik.touched.mailingCountryName && formik.errors.mailingCountryName, },
                          { 'is-valid': formik.touched.mailingCountryName && !formik.errors.mailingCountryName, }
                        )}
                        value={formik.values.mailingCountryName}
                        onChange={handleMailingCountryChange}
                        onBlur={formik.handleBlur}
                      >
                        <option value=""><FormattedMessage id="AUTH.SELECT_COUNTRY" /></option>
                        {countries.map((c) => (
                          <option key={c.isoCode} value={c.isoCode}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {formik.touched.mailingCountryName && formik.errors.mailingCountryName && (
                        <div className='fv-help-block text-danger fw-normal'>
                          <span role='alert'>{formik.errors.mailingCountryName}</span>
                        </div>
                      )}
                    </div>
                    {/* end::Form group */}
                    {/* begin::Form group Street Name */}
                    <div className='fv-row mb-8'>
                      <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.CITY" /></label>
                      <input
                        placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.CITY" })}
                        type='text'
                        autoComplete='off'
                        {...formik.getFieldProps('mailingCityName')}
                        onChange={handleMailingCityChange}
                        className={clsx(
                          'form-control bg-transparent',
                          { 'is-invalid': formik.touched.mailingCityName && formik.errors.mailingCityName, },
                          { 'is-valid': formik.touched.mailingCityName && !formik.errors.mailingCityName, }
                        )}
                      />
                      {formik.touched.mailingCityName && formik.errors.mailingCityName && (
                        <div className='fv-plugins-message-container'>
                          <div className='fv-help-block'>
                            <span role='alert'>{formik.errors.mailingCityName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* end::Form group */}
                    {/* begin::Form group Street Name */}
                    <div className='fv-row mb-8'>
                      <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.STATE" /></label>
                      <select
                        value={formik.getFieldMeta('mailingStateName').value}
                        className='form-select form-select-lg form-select-solid'
                        name='states'
                        onChange={handleMailingStateChange}
                      >
                        {mailingStates.map((s) => (
                          <option key={s.isoCode} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* end::Form group */}
                    {/* begin::Form group Street Name */}
                    <div className='fv-row mb-8'>
                      <label className='form-label fw-bolder text-dark fs-6'><FormattedMessage id="TEAM.ADDRESS.ZIP" /></label>
                      <input
                        placeholder={intl.formatMessage({ id:"TEAM.ADDRESS.ZIP" })}
                        type='text'
                        autoComplete='off'
                        {...formik.getFieldProps('mailingZip')}
                        onChange={handleMailingZipChange}
                        className={clsx(
                          'form-control bg-transparent',
                          { 'is-invalid': formik.touched.mailingZip && formik.errors.mailingZip, },
                          { 'is-valid': formik.touched.mailingZip && !formik.errors.mailingZip, }
                        )}
                      />
                      {formik.touched.mailingZip && formik.errors.mailingZip && (
                        <div className='fv-help-block text-danger fw-normal'>
                          <span role='alert'>{formik.errors.mailingZip}</span>
                        </div>
                      )}
                    </div>
                    {/* end::Form group */}
                  </>
                }
              </span>
            </label>
          </span>
        </label>
      </div>
  );
};

export default Step3;
