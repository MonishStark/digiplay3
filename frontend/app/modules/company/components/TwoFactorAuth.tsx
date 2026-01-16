/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState } from 'react'
import { KTIcon } from '../../../../app/theme/helpers'
import { enableCompany2FA, disableCompany2FA, updateCompany2FA } from '../../auth/core/_requests'
import { useAuth } from '../../auth'
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts'
import { FormattedMessage } from 'react-intl'


const TwoFactorAuthentication: React.FC = () => {
  const { currentUser, setCurrentUser, saveAuth, auth } = useAuth()
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

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

  const enableCompanyTwoFactorAuth = () => {
    updateCompany2FA(currentUser?.companyId, true)
      .then((response) => {
        if (response.data.success) {
          setCurrentUser((user) => {
            const updatedUser = user
            if (updatedUser) {
              updatedUser.twoFactorEnabled = true
              updatedUser.companytwoFactorEnabled = true
            }

            let newAuth = auth
            if (newAuth && newAuth.user) {
              newAuth.user = updatedUser
            }
            saveAuth(newAuth)

            return updatedUser
          })
          setChecked(true)
          setSuccessMessage(response.data.message)
        } else {
          setChecked(true)
          setErrorMessage(response.data.message)
        }
      })
  }

  const disableCompanyTwoFactorAuth = () => {
    updateCompany2FA(currentUser?.companyId,false)
      .then((response) => {
        if (response.data.success) {
          setCurrentUser((user) => {
            const updatedUser = user
            if (updatedUser) {
              updatedUser.twoFactorEnabled = false
              updatedUser.companytwoFactorEnabled = false
            }
            let newAuth = auth
            if (newAuth && newAuth.user) {
              newAuth.user = updatedUser
            }
            saveAuth(newAuth)

            return updatedUser
          })
          setChecked(true)
          setSuccessMessage(response.data.message)
        } else {
          setChecked(true)
          setErrorMessage(response.data.message)
        }
      })
  }

  const [showTooltip, setShowTooltip] = useState(false);

  const handleTooltipToggle = () => {
    if (!currentUser?.companytwoFactorEnabled) {
      setShowTooltip(!showTooltip);
    }
  };

  return (
    <div className='card mb-5 mb-xl-10'>
      <div
        className='card-header border-0 cursor-pointer'
        role='button'
        data-bs-toggle='collapse'
        data-bs-target='#kt_account_signin_method'
      >
        <div className='card-title m-0'>
          <h3 className='fw-bolder m-0'><FormattedMessage id='COMPANY.PROFILE.2FA' /></h3>
        </div>
      </div>

      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      <div id='kt_account_signin_method' className='collapse show'>
        <div className='card-body border-top p-9'>
          <div className='notice d-flex bg-light-primary rounded border-primary border border-dashed p-6'
          title={currentUser?.companytwoFactorEnabled ? "" : "Please verify your account before enabling Two-factor authentication."}
          onClick={handleTooltipToggle}
          >
            {!currentUser?.companytwoFactorEnabled && showTooltip && (
              <div className="position-absolute top-80 start-50 translate-middle-x bg-dark text-white p-2 rounded mt-2 text-center d-md-none" style={{ zIndex: 10, maxWidth: '250px' }}>
                Please verify your account before enabling Two-factor authentication.
              </div>
            )}
            <KTIcon iconName='shield-tick' className='fs-2tx text-primary me-4' />
            <div className='d-flex flex-stack flex-grow-1 flex-wrap flex-md-nowrap'>
              <div className='mb-3 mb-md-0 fw-bold'>
                <h4 className='text-gray-800 fw-bolder'><FormattedMessage id='COMPANY.PROFILE.2FA.TITLE' /></h4>
                <div className='fs-6 text-gray-600 pe-7'>
                  <FormattedMessage id='COMPANY.PROFILE.2FA.MESSAGE' />
                </div>
              </div>
              {currentUser?.companytwoFactorEnabled &&
                <button
                  onClick={disableCompanyTwoFactorAuth}
                  className='btn btn-light btn-active-light-primary'
                  disabled={!currentUser?.accountStatus}
                >
                  <FormattedMessage id='PROFILE.DISABLE' />
                </button>
              }
              {!currentUser?.companytwoFactorEnabled &&
                <button
                  className='btn btn-primary me-2 px-6'
                  onClick={enableCompanyTwoFactorAuth}
                  disabled={!currentUser?.accountStatus}
                >
                  <FormattedMessage id='PROFILE.ENABLE' />
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { TwoFactorAuthentication }
