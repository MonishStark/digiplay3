import React, { useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

interface Step4Props {
  accountType: string;
  signUpMethod: string;
  userDetails: {
    firstname?: string;
    lastname?: string;
    email?: string;
    mobileNumber?: string;
    password?: string;
  };
  companyDetails: {
    companyName?: string;
    phoneNumber?: string;
    orgType?: string;
    mailingStreetName?: string;
    mailingCityName?: string;
    mailingStateName?: string;
    mailingZip?: string;
    billingStreetName?: string;
    billingCityName?: string;
    billingStateName?: string;
    billingZip?: string;
  };
}

const Step4: React.FC<Step4Props> = ({ accountType, userDetails, companyDetails }) => {
const intl = useIntl();
  const data = {
  [intl.formatMessage({ id: 'ACCOUNT.TYPE' })]: accountType === 'solo'
    ? intl.formatMessage({ id: 'ACCOUNT.TYPE.SOLO' })
    : intl.formatMessage({ id: 'ACCOUNT.TYPE.TEAM' }),

  [intl.formatMessage({ id: 'PROFILE.FIRSTNAME' })]: userDetails.firstname ?? 'NA',
  [intl.formatMessage({ id: 'PROFILE.LASTNAME' })]: userDetails.lastname ?? 'NA',
  [intl.formatMessage({ id: 'AUTH.EMAIL' })]: userDetails.email ?? 'NA',
  [intl.formatMessage({ id: 'PROFILE.MOBILENUM' })]: userDetails.mobileNumber ?? 'NA',

  [intl.formatMessage({ id: 'COMPANY.NAME' })]: companyDetails.companyName ?? 'NA',
  [intl.formatMessage({ id: 'COMPANY.PHONE' })]: companyDetails.phoneNumber ?? 'NA',
  [intl.formatMessage({ id: 'COMPANY.ORGTYPE' })]: companyDetails.orgType ?? 'NA',

  [intl.formatMessage({ id: 'ADDRESS.MAILING_STREET' })]: companyDetails.mailingStreetName ?? 'NA',
  [intl.formatMessage({ id: 'ADDRESS.MAILING_CITY' })]: companyDetails.mailingCityName ?? 'NA',
  [intl.formatMessage({ id: 'ADDRESS.MAILING_STATE' })]: companyDetails.mailingStateName ?? 'NA',
  [intl.formatMessage({ id: 'ADDRESS.MAILING_ZIP' })]: companyDetails.mailingZip ?? 'NA',

  [intl.formatMessage({ id: 'ADDRESS.BILLING_STREET' })]: companyDetails.billingStreetName ?? 'NA',
  [intl.formatMessage({ id: 'ADDRESS.BILLING_CITY' })]: companyDetails.billingCityName ?? 'NA',
  [intl.formatMessage({ id: 'ADDRESS.BILLING_STATE' })]: companyDetails.billingStateName ?? 'NA',
  [intl.formatMessage({ id: 'ADDRESS.BILLING_ZIP' })]: companyDetails.billingZip ?? 'NA',
};


  useEffect(() => {
    window.scrollTo(0, 0)
  }, []);

  return (
    <div>
      <h2 className='fw-bolder d-flex align-items-center text-dark mb-10'>
        <FormattedMessage id="AUTH.REGISTER.PREVIEW" />
        {/* <p>Verify Details and Submit the form</p> */}
        <i
          className='fas fa-exclamation-circle ms-2 fs-7'
          data-bs-toggle='tooltip'
          title={intl.formatMessage({ id:"AUTH.REGISTER.BILLING"})} 
        ></i>
      </h2>

      <div>
        {Object.entries(data).map(([key, value]) => {
          if (value && !key.toLowerCase().includes('password')) {
            return (
              <div key={key} className='mb-2'>
                <h6 className='d-flex align-items-center text-dark justify-content-between mb-10 textuppercase textcapitalize'>
                  <strong className='capitalize'>{key}:</strong> {value}
                </h6>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default Step4;
