import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../../../pages/AppContext/AppContext';
import axios from 'axios';
import { Form } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl'


interface Step1Props {
  accountType: string;
  onAccountTypeChange: (value: string) => void;
  onOtherInputChange: (value: string) => void;
  currency: string;
  setCurrency: (value: string) => void;
}

const Step2: React.FC<Step1Props> = ({ accountType, onAccountTypeChange, currency, setCurrency }) => {
  const isSelected = (type: string) => accountType === type;
  const { appData } = useAppContext();
  const [ symbol, setSymbol ] = useState<any>({})
  const [ isChangeCurrency, setIsChangeCurrency ] = useState<boolean>(false)

  const intl = useIntl();
  const tooltipText = intl.formatMessage({ id: 'AUTH.REGISTER.BILLING' });

  useEffect(() => {
      const fetchUserCurrency = async () => {
          try {
              const response = await axios.get(`https://api.ipapi.com/api/check?access_key=${appData.locationAccessKey}`);
              const userCountry = response.data.country_name;

              // Find the currency for the user's country
              const countryCurrency = JSON.parse(appData.paymentCurrencies).find((item: any) => item.country === userCountry);
              
              const isValidCurrency = appData.activeCurrencies.includes(countryCurrency.currency)

              const findSymbol = JSON.parse(appData.paymentCurrencies).find((item: any) => item.currency === countryCurrency.currency)
              setSymbol(findSymbol)

              // Set the currency to the one found, or default to USD if not found
              if (isValidCurrency) {
                  setCurrency(countryCurrency.currency);
              } else {
                  setCurrency('USD');
              }
          } catch (error) {
              console.error("Error fetching user currency:", error);
          }
      };

      fetchUserCurrency();
  }, []);

  useEffect(() => {
    const findSymbol = JSON.parse(appData.paymentCurrencies).find((item: any) => item.currency === currency)
    setSymbol(findSymbol)
  }, [currency])

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value);
  };

  const handleToggleCurrency = () => {
    setIsChangeCurrency(prev => !prev);
  };
  const handleAccountTypeChange = (type: string) => () => {
    onAccountTypeChange(type);
  };

  return (
    <div>
      <h2 className='fw-bolder d-flex align-items-center text-dark mb-10'>
          <FormattedMessage id='AUTH.REGISTER.ACOUNT_TYPE' />
        <i
          className='fas fa-exclamation-circle ms-2 fs-7'
          data-bs-toggle='tooltip'
          title={tooltipText}
        ></i>
      </h2>
      <div className="row formcheck mb-4" style={{ paddingLeft: 0 }}>
        <div className="mb-6">
          <input
            type="radio"
            className="btn-check"
            name="accountType"
            value="solo"
            id="solo"
            checked={isSelected('solo')}
            onChange={handleAccountTypeChange('solo')}
          />
          <label className={`card border rounded ${isSelected('solo') ? 'bg-light-primary shadow' : 'border-dotted border-dark'}`} htmlFor="solo">
            <span className="card-body">
              <h5 className="card-title mb-2 fs-4 fw-bolder d-flex flex-wrap">
                <span><FormattedMessage id='AUTH.REGISTER.ACOUNT_TYPE.SOLO' />&nbsp;</span>
                <span>({symbol?.symbol}{symbol?.solo}&nbsp;</span>
                <small className="text-muted d-block"><FormattedMessage id='AUTH.REGISTER.BILLING.PER_MONTH' /></small>
                <span>)</span>
              </h5>
              <span className="card-text mb-2">
                {appData.appName ?? "AI Bot"} <FormattedMessage id='AUTH.REGISTER.ACOUNT_TYPE.SOLO.DESCRIPTION' />
              </span>
            </span>
          </label>
        </div>
        <div className="mb-6">
          <input
            type="radio"
            className="btn-check"
            name="accountType"
            value="team"
            id="team"
            checked={isSelected('team')}
            onChange={handleAccountTypeChange('team')}
          />
          <label className={`card border rounded ${isSelected('team') ? 'bg-light-primary shadow' : 'border-dotted border-dark'}`} htmlFor="team">
            <div className="card-body">
              <h5 className="card-title mb-2 fs-4 fw-bolder d-flex flex-wrap">
                <span>Team&nbsp;</span>
                <span>({symbol?.symbol}{symbol?.team}&nbsp;</span>
                <small className="text-muted d-block"><FormattedMessage id='AUTH.REGISTER.BILLING.PER_MONTH' /></small>
                <span>)</span>
              </h5>
              <span className="card-text mb-2 textcapitalize">
                {appData.appName ?? "AI Bot"} <FormattedMessage id='AUTH.REGISTER.ACOUNT_TYPE.TEAM.DESCRIPTION' />
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Toggle Button */}
      <div className='d-flex justify-content-between align-items-center'>
        <div className='col-lg-4 col-form-label text-dark fs-6'>
          <label htmlFor="toggleCurrency">
            <strong><FormattedMessage id='AUTH.REGISTER.OTHER_CURRENCIES' />:</strong>
          </label>
        </div>
        <div className='col-lg-4 col-form-label fw-bold fs-6'>
          <Form.Check
            type="switch"
            id="toggleCurrency"
            checked={isChangeCurrency}
            onChange={handleToggleCurrency}
          />
        </div>
      </div>


      {/* select currency  */}
      {
        isChangeCurrency && 
        <div className='fv-row mb-8'>
          <label className='form-label text-dark ' htmlFor='currency'>
            <strong>
              <FormattedMessage id='AUTH.REGISTER.SELECT_CURRENCIES' />:
            </strong>
          </label>
          <select
            className='form-select'
            id='currency'
            name='currency'
            value={currency}
            onChange={handleCurrencyChange}
          >
            <option value='' disabled><FormattedMessage id='AUTH.REGISTER.SELECT_CURRENCY' /></option>
            {JSON.parse(appData.activeCurrencies).map((val: any) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>
      }
    </div>
  );
};

export default Step2;

