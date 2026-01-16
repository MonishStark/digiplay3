import React, {useState} from 'react'
import {IEmailPreferences, emailPreferences} from '../SettingsModel'
import { FormattedMessage } from 'react-intl'

const EmailPreferences: React.FC = () => {
  const [data, setData] = useState<IEmailPreferences>(emailPreferences)

  const updateData = (fieldsToUpdate: Partial<IEmailPreferences>) => {
    const updatedData = {...data, ...fieldsToUpdate}
    setData(updatedData)
  }

  const [loading, setLoading] = useState(false)

  const click = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  const handleWebhookChange = () => {
    updateData({
      webhookAPIEndpoints: !data.webhookAPIEndpoints,
    });
  };

  const handleInvoicePaymentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({
      invoicePayments: e.target.checked,
    });
  };

  const handleRefundAlertChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({
      refundAlert: e.target.checked,
    });
  };

  const handleCustomerPaymentDisputeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateData({
      customerPaymentDispute: e.target.checked,
    });
  };

  const handleFreeTeamsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    updateData({
      freeTeams: e.target.checked,
    });
  };

  const handlePayoutsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({
      payouts: e.target.checked,
    });
  };

  const handleSuccessfulPaymentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({
      successfulPayments: e.target.checked,
    });
  };

  return (
    <div className='card mb-5 mb-xl-10'>
      <div
        className='card-header border-0 cursor-pointer'
        role='button'
        data-bs-toggle='collapse'
        data-bs-target='#kt_account_email_preferences'
        aria-expanded='true'
        aria-controls='kt_account_email_preferences'
      >
        <div className='card-title m-0'>
          <h3 className='fw-bolder m-0'>Email Preferences</h3>
        </div>
      </div>

      <div id='kt_account_email_preferences' className='collapse show'>
        <form className='form'>
          <div className='card-body border-top px-9 py-9'>
            <label className='form-check form-check-custom form-check-solid align-items-start'>
              <input
                className='form-check-input me-3'
                type='checkbox'
                name='email-preferences[]'
                defaultChecked={data.successfulPayments}
                onChange={handleSuccessfulPaymentsChange}
              />

              <span className='form-check-label d-flex flex-column align-items-start'>
                <span className='fw-bolder fs-5 mb-0'>Successful Payments</span>
                <span className='text-muted fs-6'>
                  Receive a notification for every successful payment.
                </span>
              </span>
            </label>

            <div className='separator separator-dashed my-6'></div>

            <label className='form-check form-check-custom form-check-solid align-items-start'>
              <input
                className='form-check-input me-3'
                type='checkbox'
                name='email-preferences[]'
                defaultChecked={data.payouts}
                onChange={handlePayoutsChange}
              />

              <span className='form-check-label d-flex flex-column align-items-start'>
                <span className='fw-bolder fs-5 mb-0'>Payouts</span>
                <span className='text-muted fs-6'>
                  Receive a notification for every initiated payout.
                </span>
              </span>
            </label>

            <div className='separator separator-dashed my-6'></div>

            <label className='form-check form-check-custom form-check-solid align-items-start'>
              <input
                className='form-check-input me-3'
                type='checkbox'
                name='email-preferences[]'
                defaultChecked={data.freeTeams}
                onChange={handleFreeTeamsChange}
              />

              <span className='form-check-label d-flex flex-column align-items-start'>
                <span className='fw-bolder fs-5 mb-0'>Fee Team</span>
                <span className='text-muted fs-6'>
                  Receive a notification each time you collect a fee from sales
                </span>
              </span>
            </label>

            <div className='separator separator-dashed my-6'></div>

            <label className='form-check form-check-custom form-check-solid align-items-start'>
              <input
                className='form-check-input me-3'
                type='checkbox'
                name='email-preferences[]'
                defaultChecked={data.customerPaymentDispute}
                onChange={handleCustomerPaymentDisputeChange}
              />

              <span className='form-check-label d-flex flex-column align-items-start'>
                <span className='fw-bolder fs-5 mb-0'>Customer Payment Dispute</span>
                <span className='text-muted fs-6'>
                  Receive a notification if a payment is disputed by a customer and for dispute
                  purposes.
                </span>
              </span>
            </label>

            <div className='separator separator-dashed my-6'></div>

            <label className='form-check form-check-custom form-check-solid align-items-start'>
              <input
                className='form-check-input me-3'
                type='checkbox'
                name='email-preferences[]'
                defaultChecked={data.refundAlert}
                onChange={handleRefundAlertChange}
              />

              <span className='form-check-label d-flex flex-column align-items-start'>
                <span className='fw-bolder fs-5 mb-0'>Refund Alerts</span>
                <span className='text-muted fs-6'>
                  Receive a notification if a payment is stated as risk by the Finance Department.
                </span>
              </span>
            </label>

            <div className='separator separator-dashed my-6'></div>

            <label className='form-check form-check-custom form-check-solid align-items-start'>
              <input
                className='form-check-input me-3'
                type='checkbox'
                name='email-preferences[]'
                defaultChecked={data.invoicePayments}
                onChange={handleInvoicePaymentsChange}
              />

              <span className='form-check-label d-flex flex-column align-items-start'>
                <span className='fw-bolder fs-5 mb-0'>Invoice Payments</span>
                <span className='text-muted fs-6'>
                  Receive a notification if a customer sends an incorrect amount to pay their
                  invoice.
                </span>
              </span>
            </label>

            <div className='separator separator-dashed my-6'></div>

            <label className='form-check form-check-custom form-check-solid align-items-start'>
              <input
                className='form-check-input me-3'
                type='checkbox'
                name='email-preferences[]'
                defaultChecked={data.webhookAPIEndpoints}
                onChange={handleWebhookChange}
              />

              <span className='form-check-label d-flex flex-column align-items-start'>
                <span className='fw-bolder fs-5 mb-0'>Webhook API Endpoints</span>
                <span className='text-muted fs-6'>
                  Receive notifications for consistently failing webhook API endpoints.
                </span>
              </span>
            </label>
          </div>

          <div className='card-footer d-flex justify-content-end py-6 px-9'>
            <button className='btn btn-lightbtn-active-light-primary me-2'><FormattedMessage id="BUTTON.DISCARD" /> </button>
            <button type='button' onClick={click} className='btn btn-primary'>
              {!loading && 'Save Changes'}
              {loading && (
                <span className='indicator-progress' style={{display: 'block'}}>
                  <FormattedMessage id="BUTTON.WAIT" />{' '}
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

export {EmailPreferences}
