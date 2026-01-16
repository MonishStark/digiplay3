import { useEffect, useState } from 'react'
import { Dialog } from '@mui/material';
import { DialogContent } from '@mui/material';
import { DialogTitle } from '@mui/material';
import * as Yup from 'yup'
import { useFormik } from 'formik'
import { toAbsoluteUrl } from '../../../../../app/theme/helpers';
import { FormattedMessage, useIntl } from 'react-intl';
import { Form } from 'react-bootstrap'
import { superAdminOrgUpdate } from '../../api';
import { Country, State } from 'country-state-city';
import PhoneInput, { CountryData } from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import { I18N_LANGUAGES } from '../../../../theme/i18n/config'
import { useThemeMode } from '../../../../theme/partials';

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
    mailingCountryName: Yup.string()
      .required('Country is required'),
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
    billingCountryName: Yup.string()
      .required('Country  is required'),
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
      .max(6, 'Maximum 6 numbers')
      .required('Zip code is required'),
    language: Yup.string()
      .min(2, 'Minimum 2 characters')
      .max(6, 'Maximum 5 characters')
      .required('Language is required'),
})

interface AdminOrgDetailModel {
    companyId: string,
    phoneNumberCountryCode: string,
    phoneNumber: string,
    avatarUrl: string,
    companyName: string,
    orgType: string,
    mailingStreetName: string,
    mailingCountryName: string,
    mailingCityName: string,
    mailingStateName: string,
    mailingZip: string,
    billingStreetName: string,
    billingCountryName: string,
    billingCityName: string,
    billingStateName: string,
    billingZip: string,
    companytwoFactorEnabled: string,
    userCloudIntegration: string,
    userCloudIntegrationMob: string,
    Dropbox: number
    Dropbox_M: number
    GoogleDrive: number
    GoogleDrive_M: number
    OneDrive: number
    OneDrive_M: number
    Slack: number
    Slack_M: number
    Wordpress: number
    Wordpress_M: number
    language: string
}

export const EditSuperOrg = (props: any) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [image, setImage] = useState<any>("")
    const [compPhoneNumb, setCompPhoneNumb] = useState<any>(props.orgDetail.phoneNumber)
    const isOtherOrgType = (type: string | undefined) => {
        if (!type) return false
        if (type == 'Company' || type == 'Non Profit') return false
        return true
    }
    
    const [isOtherSelected, setIsOtherSelected] = useState<boolean>(isOtherOrgType(props.orgDetail.orgType))
    const [orgType, setOrgType] = useState<string | undefined>(props.orgDetail.orgType)
    const [checkboxTick, setCheckboxTick] = useState<any>(false)
    const [company2FA, setCompany2FA] = useState<boolean>(props.orgDetail.companytwoFactorEnabled)
    const [userCloudIntegration, setuserCloudIntegration] = useState<boolean>(props.orgDetail.userCloudIntegration==1 ? true : false)
    const [userCloudIntegrationMob, setuserCloudIntegrationMob] = useState<boolean>(props.orgDetail.userCloudIntegrationMob==1 ? true : false)
    const [Dropbox, setDropbox] = useState<boolean>(props.orgDetail?.Dropbox==1 ? true : false)
    const [Dropbox_M, setDropbox_M] = useState<boolean>(props.orgDetail?.Dropbox_M==1 ? true : false)
    const [GoogleDrive, setGoogleDrive] = useState<boolean>(props.orgDetail?.GoogleDrive==1 ? true : false)
    const [GoogleDrive_M, setGoogleDrive_M] = useState<boolean>(props.orgDetail?.GoogleDrive_M==1 ? true : false)
    const [OneDrive, setOneDrive] = useState<boolean>(props.orgDetail?.OneDrive==1 ? true : false)
    const [OneDrive_M, setOneDrive_M] = useState<boolean>(props.orgDetail?.OneDrive_M==1 ? true : false)
    const [Slack, setSlack] = useState<boolean>(props.orgDetail?.Slack==1 ? true : false)
    const [Slack_M, setSlack_M] = useState<boolean>(props.orgDetail?.Slack_M==1 ? true : false)
    const [Wordpress, setWordpress] = useState<boolean>(props.orgDetail?.Wordpress==1 ? true : false)
    const [Wordpress_M, setWordpress_M] = useState<boolean>(props.orgDetail?.Wordpress_M==1 ? true : false)

    const [countries, setCountries] = useState<any[]>([]);
    const [mailingStates, setMailingStates] = useState<any[]>([]);
    const [billingStates, setBillingStates] = useState<any[]>([]);
    const intl = useIntl();
    const {mode} =useThemeMode();

    const initialValues: AdminOrgDetailModel = {
        companyId: props.orgDetail.companyId,
        phoneNumber: props.orgDetail.phoneNumber,
        phoneNumberCountryCode: props.orgDetail.phoneNumberCountryCode,
        avatarUrl: props.orgDetail.avatarUrl,
        companyName: props.orgDetail.companyName,
        orgType: props.orgDetail.orgType,
        mailingStreetName: props.orgDetail.mailingStreetName,
        mailingCountryName: props.orgDetail.mailingCountryName,
        mailingCityName: props.orgDetail.mailingCityName,
        mailingStateName: props.orgDetail.mailingStateName,
        mailingZip: props.orgDetail.mailingZip,
        billingStreetName: props.orgDetail.billingStreetName,
        billingCountryName: props.orgDetail.billingCountryName,
        billingCityName: props.orgDetail.billingCityName,
        billingStateName: props.orgDetail.billingStateName,
        billingZip: props.orgDetail.billingZip,
        companytwoFactorEnabled: props.orgDetailcompanytwoFactorEnabled,
        userCloudIntegration: props.orgDetail.userCloudIntegration,
        userCloudIntegrationMob: props.orgDetail.userCloudIntegrationMob,
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
        language: props.userDetail?.language
    }

    const handleImageChange = (e: any) => {
        setImage(e.target.files[0])
    };

    const formik = useFormik({
        initialValues,
        validationSchema: profileDetailsSchema,
        onSubmit: (values) => {
            setLoading(true)
            setTimeout(() => {
                const formData = new FormData()
                formData.append('companyName', values.companyName)
                formData.append('phoneNumberCountryCode', values.phoneNumberCountryCode)
                formData.append('phoneNumber', values.phoneNumber)
                formData.append('orgType', values.orgType)
                formData.append('mailingStreetName', values.mailingStreetName)
                formData.append('mailingCountryName', values.mailingCountryName)
                formData.append('mailingCityName', values.mailingCityName)
                formData.append('mailingStateName', values.mailingStateName)
                formData.append('mailingZip', values.mailingZip)
                formData.append('billingStreetName', values.billingStreetName)
                formData.append('billingCountryName', values.billingCountryName)
                formData.append('billingCityName', values.billingCityName)
                formData.append('billingStateName', values.billingStateName)
                formData.append('billingZip', values.billingZip)
                formData.append('companytwoFactorEnabled', company2FA ? "1" : "0")
                formData.append('userCloudIntegration', userCloudIntegration ? "1" : "0")
                formData.append('userCloudIntegrationMob', userCloudIntegrationMob ? "1" : "0")
                formData.append('Dropbox', Dropbox ? "1" : "0")
                formData.append('Dropbox_M', Dropbox_M ? "1" : "0")
                formData.append('GoogleDrive', GoogleDrive ? "1" : "0")
                formData.append('GoogleDrive_M', GoogleDrive_M ? "1" : "0")
                formData.append('OneDrive', OneDrive ? "1" : "0")
                formData.append('OneDrive_M', OneDrive_M ? "1" : "0")
                formData.append('Slack', Slack ? "1" : "0")
                formData.append('Slack_M', Slack_M ? "1" : "0")
                formData.append('Wordpress', Wordpress ? "1" : "0")
                formData.append('Wordpress_M', Wordpress_M ? "1" : "0")
                formData.append('userId', props.orgDetail.userId)
                formData.append('language', values.language)

                superAdminOrgUpdate(values.companyId,formData)
                    .then((response) => {
                        if (response.data.success) {
                            window.location.reload()
                            setLoading(false)
                        } else {
                            setLoading(false)
                        }
                    })
                    .then(() => {
                        props.setShowOrgUpdateDialog(false)
                    })
                    .catch((err) => {
                        console.log(err)
                        props.setShowOrgUpdateDialog(false)
                        setLoading(false)
                    })
            }, 1000)
        }
    })

    useEffect(() => {
        formik.setFieldValue('phoneNumber', compPhoneNumb)
    }, [compPhoneNumb])


    const handlePhoneNumberChange = (
        numbertype: 'Company' | 'Mobile',
        e: React.ChangeEvent<HTMLInputElement>
        ) => {
        if (numbertype == 'Company') {
            const formattedPhoneNumber = formatPhoneNumber(e.target.value);
            setCompPhoneNumb(formattedPhoneNumber)
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

    const autoFillBillingAddress = (event: any) => {
        if (event.target.checked) {
          const streetName = formik.getFieldMeta('billingStreetName')
          const countryName = formik.getFieldMeta('billingCountryName')
          const city = formik.getFieldMeta('billingCityName')
          const state = formik.getFieldMeta('billingStateName')
          const zipcode = formik.getFieldMeta('billingZip')
    
          if (streetName.value == '' || countryName.value == '' || city.value == '' || state.value == '' || zipcode.value == '') {
            return
          }
    
          formik.setFieldValue('mailingStreetName', streetName.value)
          formik.setFieldValue('mailingStreetName', countryName.value)
          formik.setFieldValue('mailingCityName', city.value)
          formik.setFieldValue('mailingStateName', state.value)
          formik.setFieldValue('mailingZip', zipcode.value)
          setCheckboxTick(true)
        } else {
          setCheckboxTick(false)
          formik.setFieldValue('mailingStreetName', '')
          formik.setFieldValue('mailingCountryName', '')
          formik.setFieldValue('mailingCityName', '')
          formik.setFieldValue('mailingStateName', '')
          formik.setFieldValue('mailingZip', '')
        }
    }
    
    const handleStreetNameChange = (
        addressType: 'mailing' | 'billing',
        event: React.ChangeEvent<HTMLInputElement>
        ) => {
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
    
    const handleCityNameChange = (
        addressType: 'mailing' | 'billing',
        event: React.ChangeEvent<HTMLInputElement>
        ) => {
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
    
    const handleStateNameChange = (
        addressType: 'mailing' | 'billing',
        event: React.ChangeEvent<HTMLSelectElement>
        ) => {
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
    
    const handleZipCodeChange = (
        addressType: 'mailing' | 'billing',
        event: React.ChangeEvent<HTMLInputElement>
        ) => {
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
        if (props.orgDetail.billingStreetName) {
            formik.setFieldValue('billingStreetName', props.orgDetail.billingStreetName)
            formik.setFieldValue('billingCountryName', props.orgDetail.billingCountryName)
            formik.setFieldValue('billingCityName', props.orgDetail.billingCityName)
            formik.setFieldValue('billingStateName', props.orgDetail.billingStateName)
            formik.setFieldValue('billingZip', props.orgDetail.billingZip)
        }
        if (props.orgDetail.mailingStreetName) {
            formik.setFieldValue('mailingStreetName', props.orgDetail.mailingStreetName)
            formik.setFieldValue('mailingCountryName', props.orgDetail.mailingCountryName)
            formik.setFieldValue('mailingCityName', props.orgDetail.mailingCityName)
            formik.setFieldValue('mailingStateName', props.orgDetail.mailingStateName)
            formik.setFieldValue('mailingZip', props.orgDetail.mailingZip)
        }
        
    }, [props.orgDetail])

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

    useEffect(() => {
        const countryList = Country.getAllCountries();
        setCountries(countryList);
    }, []);
    
    const handleCountryChange = (
        addressType: 'mailing' | 'billing',
        e: React.ChangeEvent<HTMLSelectElement>
        ) => {
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

    useEffect(() => {
    if (formik.values.billingCountryName) {
        const stateList = State.getStatesOfCountry(formik.values.billingCountryName);
        setBillingStates(stateList);
    
        if (!formik.values.billingStateName && stateList.length > 0) {
        formik.setFieldValue('billingStateName', stateList[0].name); // or isoCode
        }
    }
    if (formik.values.mailingCountryName) {
        const stateList = State.getStatesOfCountry(formik.values.mailingCountryName);
        setMailingStates(stateList);
    
        if (!formik.values.mailingStateName && stateList.length > 0) {
        formik.setFieldValue('mailingStateName', stateList[0].name); // or isoCode
        }
    }
    }, []);

    const handleWordpressChangeM = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWordpress_M(e.target.checked);
        formik.setFieldValue("Wordpress_M", e.target.checked ? 1 : 0);
    };

    const handleSlackChangeM = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlack_M(e.target.checked);
        formik.setFieldValue("Slack_M", e.target.checked ? 1 : 0);
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

    const handleCompany2FAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompany2FA(e.target.checked);
        formik.setFieldValue("companytwoFactorEnabled", e.target.checked ? 1 : 0);
    };

    const handlePhoneCountryChange = (_: string, countryData: CountryData) => {
        formik.setFieldValue('phoneNumberCountryCode', countryData.dialCode);
        formik.setFieldTouched('phoneNumberCountryCode', true, false);
    };

    const handleCloseOrgUpdateDialog = () => {
      props.setShowOrgUpdateDialog(false);
    };

    const handleMailingZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleZipCodeChange('mailing', e);
    };

    const handleMailingStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleStateNameChange('mailing', e);
    };

    const handleMailingCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleCityNameChange('mailing', e);
    };

    const handleMailingCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleCountryChange('mailing', e);
    };

    const handleMailingStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleStreetNameChange('mailing', e);
    };

    const handleBillingZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleZipCodeChange('billing', e);
    };

    const handleBillingStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleStateNameChange('billing', e);
    };

    const handleBillingCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleCountryChange('billing', e);
    };

    const handleBillingCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleCityNameChange('billing', e);
    };

    const handleBillingStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleStreetNameChange('billing', e);
    };

    const handleOtherOrgTypeChange = () => {
      updateOrgType('Other');
    };

    const handleNonProfitOrgTypeChange = () => {
      updateOrgType('Non Profit');
    };

    const handleCompanyOrgTypeChange = () => {
      updateOrgType('Company');
    };

    const handleCompanyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handlePhoneNumberChange('Company', e);
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
                open={props.showOrgUpdateDialog}
                onClose={handleCloseOrgUpdateDialog}
                aria-labelledby="form-dialog-title"
                PaperProps={{ className: 'bg-light text-dark' }}
            >
                <DialogTitle className='px-5 text-center fw-bolder text-muted' id="form-dialog-title">
                    <div className="modal-header" id="kt_modal_update_user_header">
                        <h2 className="fw-bolder">
                            <FormattedMessage id="SUPERADMIN.UPDATE_ORG" /> 
                        </h2>
                        <div className="btn btn-icon btn-sm btn-active-icon-primary" onClick={handleCloseOrgUpdateDialog}>
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
                                                <FormattedMessage id="COMPANY.PROFILE.LOGO" />
                                            </span>
                                            <i className="fas fa-exclamation-circle ms-1 fs-7" data-bs-toggle="tooltip" title={intl.formatMessage({ id: "INVITATION.ALLOWED" })}></i>
                                        </label>
                                        <div className="mt-5">
                                            <div className="image-input image-input-outline" data-kt-image-input="true" style={{ backgroundImage: `url(${toAbsoluteUrl('/media/avatars/blank.png')})`, marginLeft: '5px' }}>
                                                <div
                                                    className="image-input-wrapper w-125px h-125px"
                                                    style={{ backgroundImage: `url(${image === "" ? `${props.orgDetail?.avatarUrl}` : URL.createObjectURL(image)})` }}
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
                                            <FormattedMessage id="COMPANY.PROFILE.NAME" />
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control form-control-solid"
                                            placeholder={intl.formatMessage({ id: "COMPANY.PROFILE.NAME_1" })}
                                            {...formik.getFieldProps('companyName')}
                                        />
                                        {formik.touched.companyName && formik.errors.companyName && (
                                            <div className='fv-plugins-message-container'>
                                                <div className='fv-help-block'>{formik.errors.companyName}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                    <div className="fv-row mb-7">
                                                                              <div className="fv-row mb-7">

                                    <label className="required fs-6 fw-bold mb-2">
                                        <FormattedMessage id="COMPANY.PROFILE.PHONE" />
                                    </label>
                                    <div className="d-flex align-items-center gap-3">
                                    <div className='w-50'>
                                        <div className='col-lg-14 fv-row d-flex align-items-center'>
                                            <PhoneInput
                                            country={formik.values.phoneNumberCountryCode === '1' ? 'us' : undefined}
                                            value={formik.values.phoneNumberCountryCode}
                                            onChange={handlePhoneCountryChange}
                                            inputProps={{
                                                name: 'phoneNumberCountryCode',
                                                readOnly: true,
                                            }}
                                            inputStyle={{
                                                width: '110px',
                                                paddingLeft: '55px', // spacing between flag and code
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
                                                border: `1px solid ${isDarkMode ? '#3a3b45' : '#ced4da'}`
                                            }}
                                            />
                                        </div>
                                        </div>
                                    <div className='flex-grow-1'>
                                        <input
                                            type="text"
                                            className="form-control form-control-solid"
                                            placeholder={intl.formatMessage({ id: "COMPANY.PROFILE.PHONE" })}
                                            {...formik.getFieldProps('phoneNumber')}
                                            onChange={handleCompanyPhoneChange}
                                        />
                                        </div>
                                </div>
                                        {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                                            <div className='fv-plugins-message-container'>
                                                <div className='fv-help-block'>{formik.errors.phoneNumber}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* company type  */}
                                    <div className='fv-row mb-7 org-type'>
                                        <label className='form-label fw-bolder text-dark fs-6 required text-nowrap'><FormattedMessage id='COMPANY.PROFILE.TYPE' /></label>
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
                                                onChange={handleCompanyOrgTypeChange}
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
                                                onChange={handleNonProfitOrgTypeChange}
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
                                                onChange={handleOtherOrgTypeChange}
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
                                                    <div className='fv-plugins-message-container'>
                                                    <div className='fv-help-block'>
                                                        <span role='alert'><>{formik.errors.orgType}</></span>
                                                    </div>
                                                    </div>
                                                )}
                                                </>
                                            </>
                                            }

                                        </div>
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
                                          <FormattedMessage id='SELECT.LANGUAGE'  />
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


                                    {/* billing address  */}
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
                                                <div className='fv-plugins-message-container'>
                                                    <div className='fv-help-block'><>{formik.errors.billingStreetName}</></div>
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
                                                <div className='fv-plugins-message-container'>
                                                    <div className='fv-help-block'><>{formik.errors.billingCityName}</></div>
                                                </div>
                                                )}
                                            </div>
                                            </div>

                                            <div className="row mb-6">
                                                <label className="col-lg-4 col-form-label fw-bold fs-6">
                                                    <span className="required"><FormattedMessage id='TEAM.ADDRESS.COUNTRY' /></span>
                                                </label>
                                                        
                                                <div className='col-lg-8 fv-row'>
                                                    <select
                                                    name="billingCountryName"
                                                    className="form-control form-control-lg form-control-solid"
                                                    value={formik.values.billingCountryName}
                                                    onChange={handleBillingCountryChange}
                                                    onBlur={formik.handleBlur}
                                                    >
                                                    <option value=""><FormattedMessage id="AUTH.SELECT_COUNTRY" /></option>
                                                    {countries.map((country) => (
                                                        <option key={country.isoCode} value={country.isoCode}>
                                                        {country.name}
                                                        </option>
                                                    ))}
                                                    </select>
                                                
                                                    {formik.touched.billingCountryName && formik.errors.billingCountryName && (
                                                    <div className="fv-plugins-message-container">
                                                        <div className="fv-help-block">
                                                        {typeof formik.errors.billingCountryName === 'string' && (
                                                            <span>{formik.errors.billingCountryName}</span>
                                                        )}
                                                        </div>
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
                                                {billingStates.map((s) => (
                                                  <option key={s.isoCode} value={s.name}>
                                                    {s.name}
                                                  </option>
                                                ))}
                                                </select>
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
                                                <div className='fv-plugins-message-container'>
                                                    <div className='fv-help-block'><>{formik.errors.billingZip}</></div>
                                                </div>
                                                )}
                                            </div>
                                            </div>
                                        </span>
                                    </label>

                                    {/* mailing address  */}
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
                                                    <div className='fv-plugins-message-container'>
                                                        <div className='fv-help-block'><>{formik.errors.mailingStreetName}</></div>
                                                    </div>
                                                    )}
                                                </div>
                                                </div>

                                                <div className="row mb-6">
                                                  <label className="col-lg-4 col-form-label fw-bold fs-6">
                                                    <span className="required"><FormattedMessage id='TEAM.ADDRESS.COUNTRY' /></span>
                                                  </label>
                                
                                                   <div className='col-lg-8 fv-row'>
                                                    <select
                                                      name="mailingCountryName"
                                                      className="form-control form-control-lg form-control-solid"
                                                      value={formik.values.mailingCountryName}
                                                      onChange={handleMailingCountryChange}
                                                      onBlur={formik.handleBlur}
                                                    >
                                                      <option value=""><FormattedMessage id="AUTH.SELECT_COUNTRY" /></option>
                                                      {countries.map((country) => (
                                                        <option key={country.isoCode} value={country.isoCode}>
                                                          {country.name}
                                                        </option>
                                                      ))}
                                                    </select>
                                                    
                                                    {formik.touched.mailingCountryName && formik.errors.mailingCountryName && (
                                                      <div className="fv-plugins-message-container">
                                                        <div className="fv-help-block">
                                                          {typeof formik.errors.mailingCountryName === 'string' && (
                                                        <span>{formik.errors.mailingCountryName}</span>
                                                      )}
                                                        </div>
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
                                                    <div className='fv-plugins-message-container'>
                                                        <div className='fv-help-block'><>{formik.errors.mailingCityName}</></div>
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
                                                    <div className='fv-plugins-message-container'>
                                                        <div className='fv-help-block'><>{formik.errors.mailingZip}</></div>
                                                    </div>
                                                    )}
                                                </div>
                                                </div>
                                            </>
                                            }
                                        </span>
                                    </label>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <FormattedMessage id="COMPANY.PROFILE.2FA" />
                                        </label>
                                        <Form.Check
                                            type="switch"
                                            id="default2FA"
                                            className='col-lg-4 col-form-label fw-bold fs-6'
                                            checked={company2FA === true}
                                            onChange={handleCompany2FAChange}
                                        />
                                        {formik.touched.companytwoFactorEnabled && formik.errors.companytwoFactorEnabled && (
                                            <div className='fv-plugins-message-container'>
                                                <div className='fv-help-block'>{formik.errors.companytwoFactorEnabled}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="fv-row mb-7">
                                        <label className="required fs-6 fw-bold mb-2">
                                            <FormattedMessage id="COMPANY.PROFILE.CLOUD" /> 
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
                                            <div className='fv-plugins-message-container'>
                                                <div className='fv-help-block'>{formik.errors.userCloudIntegration}</div>
                                            </div>
                                        )}
                                        {formik.touched.userCloudIntegrationMob && formik.errors.userCloudIntegrationMob && (
                                            <div className='fv-plugins-message-container'>
                                                <div className='fv-help-block'>{formik.errors.userCloudIntegrationMob}</div>
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
                                onClick={handleCloseOrgUpdateDialog}
                            >
                                <FormattedMessage id="BUTTON.DISCARD" /> 
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <span className="indicator-label"><FormattedMessage id="BUTTON.SUBMIT" /></span>
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