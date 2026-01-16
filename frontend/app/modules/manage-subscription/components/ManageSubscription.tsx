import React, { useEffect, useState } from 'react'
import { useAuth } from '../../auth';
import { deleteSubscription, getSubscriptionDetail } from '../../document-management/api';
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts';
import { useAppContext } from '../../../pages/AppContext/AppContext';
import { FormattedMessage } from 'react-intl';

const ManageSubscription = () => {
  const [cancelSubscription, setCancelSubscription] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>()
  const [successResMessage, setSuccessResMessage] = useState<string>('')
  const [failureResMessage, setFailureResMessage] = useState<string>('')
  const [checked, setChecked] = useState<boolean>(true)
  const { auth, logout } = useAuth()
  const { appData } = useAppContext();
  const [ symbol, setSymbol ] = useState('')

  const closeDialogForFolderOrFileDeletion = (id: string) => {
    const element: HTMLElement = document.getElementById(id)!
    element.style.display = 'none'
  }

  const handleCancelSubscription = () => {
    setDeleting(true)
    deleteSubscription(auth?.user?.id)
      .then((response) => {
        if (response.data.success) {
          setDeleting(false)
          setSuccessResMessage(response.data.message)
          setChecked(true)
        } else {
          setDeleting(false)
          setFailureResMessage(response.data.message)
          setChecked(true)
        }
      })
      .catch(() => {
        setDeleting(false)
        setFailureResMessage('Failed to cancel subscription.')
        setChecked(true)
      })
      .finally(() => {
        logout();
      })
  }

  useEffect(() => {
    getSubscriptionDetail()
      .then((response) => {
        if (response.data.subscriptionData.length !== 0) {
          const findSymbol = JSON.parse(appData.paymentCurrencies).find((item: any) => item.currency === response.data.subscriptionData.currency)
          setSymbol(findSymbol.symbol)
          setSubscriptionData(response.data.subscriptionData);
        } else {
          setCancelSubscription(true);
        }
      })
      .catch(() => {
        console.log('Failed to fetch subscription details')
      })
  }, [auth?.user?.id])

  const formatDateTime = (lastDate: any) => {
    const dateObject = lastDate ? new Date(lastDate) : new Date();

    const formattedDate = dateObject.toLocaleString('en-US', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });

    return formattedDate;
  }

  const createCloseHandler = (id: string) => () =>
  closeDialogForFolderOrFileDeletion(id);

  return (
    <>
      <div id="main">
        {successResMessage !== undefined && successResMessage !== null && successResMessage !== "" ? (
          <AlertSuccess message={successResMessage} checked={checked} />
        ) : null}

        {failureResMessage !== undefined && failureResMessage !== null && failureResMessage !== "" ? (
          <AlertDanger message={failureResMessage} checked={checked} />
        ) : null}
      </div>

      <div className='card mb-5 mb-xl-10'>
        <div className='card-body card border-top p-4 bg-lightprimary shado'>
          {auth?.user?.accountType == 'solo' ? (
            <span className='card-body bg-light-primary rounded'>
              <h5 className="card-title mb-2 fs-4 fw-bolder d-flex flex-wrap">
                <span><u>Your Active Plan</u>: Solo&nbsp;</span>
                <span>({symbol}{subscriptionData?.subscription_amount}&nbsp;</span>
                <small className="text-muted d-block"><FormattedMessage id='AUTH.REGISTER.BILLING.PER_MONTH' /></small>
                <span>)</span>
              </h5>
              <span className="card-text mb-2">
              {appData.appName ?? "AI Bot"} plan that is perfect for students and individuals. No limit to the number of Teams (AI assistants) you can build. Single user plan.
              </span>
            </span>
          ) : (
            <span className='card-body bg-light-primary rounded'>
              <h5 className="card-title mb-2 fs-4 fw-bolder d-flex flex-wrap">
                <span>Your Active Plan: Team&nbsp;</span>
                <span>({symbol}{subscriptionData?.subscription_amount}&nbsp;</span>
                <small className="text-muted d-block"><FormattedMessage id='AUTH.REGISTER.BILLING.PER_MONTH' /></small>
                <span>)</span>
              </h5>
              <span className="card-text mb-2 textcapitalize">
              {appData.appName ?? "AI Bot"} plan that includes up to ten (10) users. Perfect for teams, organizations, and companies that want to build and share as many Teams (AI assistants) as they want.
              </span>
            </span>
          )}
        </div>

        <div className='card-footer d-flex justify-content-end py-6 px-9'>
          <button type='button' className={`btn ${cancelSubscription ? 'btn-light' : 'btn-danger'}`} disabled={cancelSubscription} onClick={createCloseHandler('cancel-subscription')}>
            Cancel Subscription
          </button>
        </div>
      </div>

      <div
        id={`cancel-subscription`}
        style={{ display: 'none' }}
        className='modal'
      >
        <span
          onClick={createCloseHandler('cancel-subscription')}
          className='close'
          title='Close Modal'
        >
          &times;
        </span>
        <form className='modal-content bg-light'>
          <div className='px-7 py-7'>
            <h3>Cancel Subscription</h3>
            <p className='font-size-15'>
              This action cannot be undone, are you sure that you want to cancel the Subscription?
            </p>

            <div className='d-flex'>
              <button
                onClick={createCloseHandler('cancel-subscription')}
                type='button'
                className='btn btn-primary'
              >
                No
              </button>
              <button
                onClick={handleCancelSubscription}
                type='button'
                className='btn btn-danger ms-3'
              >
                Yes
                {deleting && (
                  <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className='card'>
        <div className='card-header border-0'>
          <div className='card-title m-0'>
            <h3 className='fw-bolder m-0'>Subscription Details</h3>
          </div>
        </div>

        <div className='card-body border-top'>
          <table className="table align-middle table-row-dashed fs-6 gy-5 px-3">
            <thead className="pe-5">
              <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                <th className="min-w-50px">
                  Plan Name
                </th>
                <th className="min-w-50px">
                  Plan Price
                </th>
                <th className="min-w-50px">
                  Payment Status
                </th>
                <th className='min-w-100px text-end'>
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-600 fw-bold">
              <tr className="text-start gs-0">
                <td className="min-w-50px">
                  {!cancelSubscription ? subscriptionData?.subscription_type : auth?.user?.accountType == 'solo' ? 'Solo' : 'Team'}
                </td>
                <td className="min-w-50px">
                  {symbol}{!cancelSubscription ? subscriptionData?.subscription_amount : auth?.user?.accountType == 'solo' ? '9' : '79'}
                </td>
                <td className="min-w-50px">
                  {!cancelSubscription ? subscriptionData?.payment_status == 'active' ? "Active" : "Inactive" : 'Unpaid'}
                </td>
                <td className='min-w-100px text-end'>
                  {`${formatDateTime(subscriptionData?.created)}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export { ManageSubscription }