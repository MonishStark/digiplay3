import React, { useEffect, useState } from 'react'
import { getUserCloudIntegration } from '../../../../auth/core/_requests'
import { useAuth } from '../../../../auth/'
import { AlertSuccess, AlertDanger } from '../../../../alerts/Alerts'
import { updateUserIntegration } from '../../../../document-management/api'
import { Modal } from 'react-bootstrap'
import { FormattedMessage } from 'react-intl'

const Integrations: React.FC = () => {
  const { currentUser } = useAuth()
  const [checked, setChecked] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [removeAccountModal, setRemoveAccountModal] = useState(false)
  const [removeAccount, setRemoveAccount] = useState<any>(null)

  const [CloudIntegration, setCloudIntegration] = useState<any>(null)

    useEffect(() => {
        const fetchCloudIntegration = async () => {
        const userId: number = currentUser?.id || 0;
        try {
        const res = await getUserCloudIntegration();
        const data = res.data.integrations;
        console.log(res)
        setCloudIntegration(data);
        } catch (error) {
        console.error('Failed to fetch cloud integration:', error);
        }
    };

    fetchCloudIntegration();
    }, []);

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

  const handleIntegrationLogout = async (id: any) => {
        try {
            const updates = {
                accessToken: '',
                refreshToken: '',
                account: '',
                source: '',
                login: 0,
            }
            const res = await updateUserIntegration(currentUser?.id, id, updates)
            if(res.data.success){
              setChecked(true)
              setSuccessMessage(res.data.message)
              setCloudIntegration((prev:any) => 
                prev.map((integration:any) =>
                  integration.id === id
                    ? {
                        ...integration,
                        accessToken: '',
                        refreshToken: '',
                        account: '',
                        source: '',
                        login: 0,
                      }
                    : integration
                )
              );
            } else {
              setChecked(true)
              setErrorMessage(res.data.data.message)
            }
        } catch (error) {
            setChecked(true)
            setErrorMessage("Something went wrong")
        }
    }

  const handleIntegrationLogin = (id: any) => {
    if (id == "integration_1" && CloudIntegration?.find((service: any) => service.name === "GoogleDrive")?.active) {
      const googleSignInWindow = window.open(
        `${import.meta.env.VITE_APP_BACKEND_URL}/auth/providers/google?userId=${currentUser?.id}&flow=integration&platform=web`,
        'googleSignInWindow',
        'width=500,height=600'
      ) ?? window;
    
      window.addEventListener('message', (event: any) => {
        if (event.origin === import.meta.env.VITE_APP_BACKEND_ORIGIN_URL) {
          if (event.data.stautsRes) {
            const googleData = event.data;
            console.log(googleData)
            setChecked(true)
            setSuccessMessage("User Cloud Integration data updated successfully")
            setCloudIntegration((prev:any) => 
              prev.map((integration:any) =>
                integration.id === id
                  ? {
                      ...integration,
                      accessToken: googleData.accessToken,
                      refreshToken: googleData.refreshToken,
                      account: googleData.profile.email,
                      source: googleData.source,
                      login: 1,
                    }
                  : integration
              )
            );
          }
        }
      }
      )

    }
    else if(id == "integration_3" && CloudIntegration?.find((service: any) => service.name === "OneDrive")?.active) {
      const microsoftSignInWindow = window.open(
        `${import.meta.env.VITE_APP_BACKEND_URL}/auth/onedrive?userId=${currentUser?.id}`,
        'microsoftSignInWindow',
        'width=500,height=600'
      ) ?? window;
  
      window.addEventListener('message', (event: any) => {
        if (event.origin === import.meta.env.VITE_APP_BACKEND_ORIGIN_URL) {
          if (event.data.stautsRes) {
            const microsoftData = event?.data;
            setChecked(true)
            setSuccessMessage("User Cloud Integration data updated successfully")
            setCloudIntegration((prev:any) => 
              prev.map((integration:any) =>
                integration.id === id
                  ? {
                      ...integration,
                      accessToken: microsoftData.accessToken,
                      refreshToken: microsoftData.refreshToken,
                      account: microsoftData.profile.preferred_username,
                      source: microsoftData.source,
                      login: 1,
                    }
                  : integration
              )
            );
          }
        }
      });
    } else if (id == "integration_2" && CloudIntegration?.find((service: any) => service.name === "Dropbox")?.active) {
      const width = 600;
      const height = 600;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
  
      const popup = window.open(
        `${import.meta.env.VITE_APP_BACKEND_URL}/dropbox/auth?userId=${currentUser?.id}`,
        'Dropbox Login',
        `width=${width},height=${height},top=${top},left=${left}`
      );
  
      // Polling for the popup to close
      const pollTimer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(pollTimer);
          // Handle post-login actions, like refreshing user data
        }
      }, 1000);
    } else if (id == "integration_5" && CloudIntegration?.find((service: any) => service.name === "WordPress")?.active) {
      const width = 600;
      const height = 600;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
  
      const popup = window.open(
        `${import.meta.env.VITE_APP_BACKEND_URL}/wordpress/auth?userId=${currentUser?.id}`,
        'Wordpress Login',
        `width=${width},height=${height},top=${top},left=${left}`
      );
  
      // Polling for the popup to close
      const pollTimer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(pollTimer);
          // Handle post-login actions, like refreshing user data
        }
      }, 1000);
    } else if (id == "integration_4" && CloudIntegration?.find((service: any) => service.name === "Slack")?.active) {
      const width = 600;
      const height = 600;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;
  
      const popup = window.open(
        `${import.meta.env.VITE_APP_BACKEND_URL}/slack/auth?userId=${currentUser?.id}`, // Change to your backend URL
        'Slack Login',
        `width=${width},height=${height},top=${top},left=${left}`
      );
  
      // Polling for the popup to close
      const pollTimer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(pollTimer);
          // Handle post-login actions, like refreshing user data
        }
      }, 1000);
    }
  }

  useEffect(() => {
    const handleMessage = (event: any) => {
      const { statusRes, accessToken, refreshToken, profile, statusMessage, source, wordpress, dropbox, slack } = event.data;

      if (statusRes) {
        // Fetch files using the access token
        if(wordpress){
          setChecked(true)
          setSuccessMessage("User Cloud Integration data updated successfully")
          setCloudIntegration((prev:any) => 
            prev.map((integration:any) =>
              integration.id === "integration_5"
                ? {
                    ...integration,
                    accessToken: accessToken,
                    refreshToken: "",
                    account: profile,
                    source: source,
                    login: 1,
                  }
                : integration
            )
          );
        }
        else if (dropbox) {
          setChecked(true)
          setSuccessMessage("User Cloud Integration data updated successfully")
          setCloudIntegration((prev:any) => 
            prev.map((integration:any) =>
              integration.id === "integration_2"
                ? {
                    ...integration,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    account: profile.email,
                    source: source,
                    login: 1,
                  }
                : integration
            )
          );
        }
        else if (slack) {
          setChecked(true)
          setSuccessMessage("User Cloud Integration data updated successfully")
          setCloudIntegration((prev:any) => 
            prev.map((integration:any) =>
              integration.id === "integration_4"
                ? {
                    ...integration,
                    accessToken: accessToken,
                    refreshToken: "",
                    account: profile,
                    source: source,
                    login: 1,
                  }
                : integration
            )
          );
        }
      } else {
        // Handle the authentication failure
        console.error(statusMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  async function handleRemoveClick() {
    setRemoveAccountModal(false);
    await handleIntegrationLogout(removeAccount.id);
    setRemoveAccount(null);
  }

  function handleCancelRemove() {
    setRemoveAccount(null);
    setRemoveAccountModal(false);
  }

  interface Integration {
    id: number;
    active: boolean;
    login?: boolean;
    name: string;
    source: string;
  }

  function handleIntegrationClick(integration: Integration) {
    if (integration.active && !integration.login) {
      handleIntegrationLogin(integration.id);
    }
  }

  function handleRemoveAccountClick(integration: Integration) {
    if (integration.active && integration.login) {
      setRemoveAccountModal(true);
      setRemoveAccount(integration);
    }
  }

  const handleCloseRemoveAccount = () => {
    setRemoveAccountModal(false);
  };

  const handleIntegrationClickWrapper = (integration: Integration) => () => {
    handleIntegrationClick(integration);
  };

  const handleRemoveAccountClickWrapper = (integration: Integration) => () => {
    handleRemoveAccountClick(integration);
  };
console.log(CloudIntegration)
  return (
    <div className='card mb-5 mb-xl-10'>
       <div className='m-10'>
        <h2 className='d-flex align-items-center'>
          <span><FormattedMessage id="TOPBAR.INTEGRATIONS" /> </span>
        </h2>
       </div>

      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      <div id='kt_account_profile_details' className='collapse show'>
        <span>
          <div className='card-body border-top p-9'>
            <div className='d-flex flex-stack my-5'>
              <div className='w-25 d-flex flex-column align-items-start'>
              <p  className='fs-4 text-primary fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                  <FormattedMessage id="INTEGRATIONS.SERVICE" />
              </p>
              </div>
              <div className='w-25 d-flex flex-column align-items-start'>
              <p  className='fs-4 text-primary fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                  <FormattedMessage id="INTEGRATIONS.LOGIN" />
              </p>
              </div>
              {/* <div className='w-25 d-flex flex-column align-items-start'>
              <p  className='fs-4 text-primary fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                  <FormattedMessage id="INTEGRATIONS.ACCOUNT" />
              </p>
              </div> */}
              {/* <div className='w-25 d-flex flex-column align-items-start'>
              <p  className='fs-4 text-primary fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                  <FormattedMessage id="INTEGRATIONS.SOURCE" />
              </p>
              </div> */}
              <div className='w-25 d-flex flex-column align-items-start'>
              <p  className='fs-4 text-primary fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                  <FormattedMessage id="INTEGRATIONS.ACTION" />
              </p>
              </div>
            </div>
            {
                CloudIntegration?.length > 0 &&
                CloudIntegration.map((integration: any, i: number) => {
                        {/* google drive */}
                        console.log(integration.active)
                        return <div key={i} className='d-flex flex-stack my-5'>
                                <div className='w-25 d-flex flex-column align-items-start'>
                                <p  className='fs-6 text-gray-800  fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                                    {
                                      integration.name == "GoogleDrive" ?
                                      <i className='fs-1 me-2 text-body fab fa-google-drive'></i>
                                      :
                                      integration.name == "OneDrive" ?
                                      <i className='fs-1 me-2 text-body bi bi-cloudy-fill'></i>
                                      :
                                      integration.name == "Dropbox" ?
                                      <i className='fs-1 me-2 text-body fab fa-dropbox'></i>
                                      :
                                      integration.name == "Slack" ?
                                      <i className='fs-1 me-2 text-body bi bi-slack'></i>
                                      :
                                      integration.name == "WordPress" &&
                                      <i className='fs-1 me-2 text-body bi bi-wordpress'></i>
                                    }
                                    {integration.name}
                                </p>
                                </div>
                                <div className='w-25 d-flex flex-column align-items-start'>
                                <p  className='fs-6 text-gray-800  fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                                    {integration.active ? "True" : "False"}
                                </p>
                                </div>
                                {/* <div className='w-25 d-flex flex-column align-items-start'>
                                <p  className='fs-6 text-gray-800  fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                                    {integration.active ? "true" : "false"}
                                </p>
                                </div> */}
                                {/* <div className='w-25 d-flex flex-column align-items-start'>
                                <p  className='fs-6 text-gray-800  fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                                    {integration.source ? integration.source : "---"}
                                </p>
                                </div> */}
                                <div className='w-25 d-flex flex-column align-items-start'>
                                <p  className='fs-6 text-gray-800  fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                                    {integration.active ? 
                                    <span
                                      className={`menu-title d-flex align-items-center ${
                                        integration.active ? 'text-danger cursor-pointer' : 'text-muted cursor-not-allowed'
                                      }`}
                                      onClick={handleRemoveAccountClickWrapper(integration)}
                                    >
                                      <i
                                        className={`fs-1 bi bi-box-arrow-right me-2 ${
                                          integration.active ? 'text-danger' : 'text-muted'
                                        }`}
                                      ></i>
                                      <FormattedMessage id="TOPBAR.LOGOUT" />
                                    </span>

                                    :
                                    <span
                                      className={`menu-title d-flex align-items-center ${
                                        integration.active ? 'text-success cursor-pointer' : 'text-muted cursor-not-allowed'
                                      }`}
                                      onClick={handleIntegrationClickWrapper(integration)}
                                    >
                                      <i
                                        className={`fs-1 bi bi-box-arrow-left me-2 ${
                                          integration.active ? 'text-success' : 'text-muted'
                                        }`}
                                      ></i>
                                      <FormattedMessage id="AUTH.LOGIN" />  
                                    </span>
                                    }
                                </p>
                                </div>
                        </div>
                })
            }
                
          </div>
        </span>
      </div>
      {
        removeAccountModal &&
        <Modal
          id='select_file_modal'
          tabIndex={-1}
          aria-hidden='true'
          dialogClassName='modal-dialog modal-dialog-centered mw-900px'
          show={removeAccountModal}
          onHide={handleCloseRemoveAccount}
          backdrop={true}
        >
          <div className='modal-header'>
            <h2>
              <FormattedMessage id="INTEGRATIONS.REMOVE" /> {" " +removeAccount.name} ({removeAccount.account}) account?
            </h2>
          </div>
          <div className='modal-body '>

            <div className="position-absolute" style={{ bottom: 5 }}>
              <button className="btn btn-primary me-2" 
              onClick={handleCancelRemove}>
                <FormattedMessage id="BUTTON.CANCEL" /> 
              </button>
              <button className="btn btn-danger" 
              onClick={handleRemoveClick}>
                <FormattedMessage id="BUTTON.REMOVE" /> 
              </button>
            </div>
          </div>
        </Modal>
      }
    </div>
  )
}

export { Integrations }
