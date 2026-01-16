import { FormattedMessage, useIntl } from 'react-intl'
import { KTCard, KTIcon, toAbsoluteUrl } from '../../../../../app/theme/helpers'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { getClients } from '../../api'
import { useNavigate } from 'react-router-dom'
import { EditSuperOrg } from './EditSuperOrg'
import { EditUser } from './EditUser'
import { SuperDeleteModal } from './SuperDeleteModal'
import { AlertDanger, AlertSuccess } from '../../../../modules/alerts/Alerts'
import { useAppContext } from '../../../AppContext/AppContext'

const Clients = () => {
  const navigate = useNavigate();
  const { appData } = useAppContext()
  const [clientList, setClientList] = useState<any>([])
  const [filteredClients, setFilteredClients] = useState<any>([]);
  const [searchString, setSearchString] = useState('');
  const [currentItems, setCurrentItems] = useState<any>([]);
  const [limit] = useState<number>(10);
  const [selectedPage, setSelectedPage] = useState<any>(1);
  const [currentPage, setCurrentPage] = useState<any>(1);
  const [totNumOfPage, setTotNumOfPage] = useState<any>(0);
  const [noOfRecords, setNoOfRecords] = useState<any>(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showOrgUpdateDialog, setShowOrgUpdateDialog] = useState(false)
  const [orgDetail, setOrgDetail] = useState<any>(null)
  const [userDetail, setUserDetail] = useState<any>(null)
  const [showUserUpdateDialog, setShowUserUpdateDialog] = useState(false)
  const [isDeleteUser, setIsDeleteUser] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteUserDetail, setDeleteUserDetail] = useState(null)
  const [checked, setChecked] = useState<boolean>(true)
  const [successResMessage, setSuccessResMessage] = useState<string>('')
  const [failureResMessage, setFailureResMessage] = useState<string>('')
  const intl = useIntl();;
  if (successResMessage) {
    setTimeout(() => {
      setChecked(false)
      setTimeout(() => {
        setSuccessResMessage("");
      }, 200);
    }, 5000);
  }

  if (failureResMessage) {
    setTimeout(() => {
      setChecked(false)
      setTimeout(() => {
        setFailureResMessage("");
      }, 200);
    }, 5000);
  }

  const handleClose = () => {
    setIsDeleteUser(false)
    setDeleteId(null)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data: any = await getClients();
        setClientList(data?.data?.clientDetails);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data: any = await getClients();
        setClientList(data?.data?.clientDetails);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    if(successResMessage !== undefined && successResMessage !== null && successResMessage !== "") {
      fetchData();
    }
  }, [successResMessage]);

  useEffect(() => {
    let filteredClientList = clientList?.filter((client: any) => client?.user?.role != 4);
    function addPaymentStatus(obj: any) {
      if (!obj[0] || !obj[0].hasOwnProperty('payment_status')) {
          obj[0] = { payment_status: 1 };
      }
      return obj;
    }
  
    filteredClientList = filteredClientList.map((obj: any) => addPaymentStatus(obj));
    const filteredClientListForTeamOrSolo = filteredClientList.filter((user: any) => user.user.accountType === 'solo' || user.user.accountType === 'team');
    const filteredByStatus = statusFilter
      ? filteredClientListForTeamOrSolo?.filter((client: any) => client[0]?.payment_status == parseInt(statusFilter))
      : filteredClientListForTeamOrSolo;
    setFilteredClients(filteredByStatus);
    const totalRecords = filteredByStatus?.length;
    const totalPages = Math.ceil(totalRecords / limit);
    setNoOfRecords(totalRecords);
    setTotNumOfPage(totalPages);
    const pageNo = localStorage.getItem('page-number-clients');
    if (pageNo) {
      setSelectedPage(pageNo);
      setCurrentPage(pageNo);
      const startIndex = (parseInt(pageNo) - 1) * limit;
      const endIndex = startIndex + limit;
      const currentItem = filteredByStatus?.slice(startIndex, endIndex);
      setCurrentItems(currentItem?.reverse());
    } else {
      const currentItem = filteredByStatus?.slice(0, limit);
      setCurrentItems(currentItem?.reverse());
    }
  }, [clientList, statusFilter]);

  const handleSearchBarChange = (e: any) => {
    const value = e.target.value;
    setSearchString(value);

    if (value.length >= 3) {
      filterClients(value);
    } else {
      setFilteredClients(filteredClients);
      const startIndex = (selectedPage - 1) * limit;
      const endIndex = startIndex + limit;
      const currentItem = filteredClients?.slice(startIndex, endIndex)
      setCurrentItems(currentItem?.reverse());
    }
  };

  const formatDateTime = (lastDate: any) => {
    const dateObject = lastDate ? new Date(lastDate) : new Date();

    const formattedDate = dateObject.toLocaleString('en-US', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });

    return formattedDate;
  }

  const filterClients = (searchValue: any) => {
    const searchValueLowerCase = searchValue.toLowerCase();
    const filteredClient = filteredClients?.filter((client: any) => {
      return `${client?.firstname} ${client?.lastname} ${client?.email} ${client?.companyName}`.toLowerCase().includes(searchValueLowerCase);
    });
    setCurrentItems(filteredClient?.reverse());
  };

  const fetchNextData = (page: any) => {
    setSelectedPage(page);
    setCurrentPage(page);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    localStorage.setItem('page-number-clients', page);
    const currentItems = filteredClients?.slice(startIndex, endIndex);
    setCurrentItems(currentItems?.reverse());
  };

  const handleChange = (event: any) => {
    let value = event.target.value;
    value = parseInt(value) > 0 ? parseInt(value) : 1;
    value = value > totNumOfPage ? totNumOfPage : value;
    setSelectedPage(value);
  };

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStatus = event.target.value;
    setStatusFilter(selectedStatus === 'all' ? null : selectedStatus);
    setSelectedPage(1);
  };

  const editOrg = (data: any) => {
    const orgDetail = {
      companyId: data.companyId,
      phoneNumber: data.phoneNumber,
      phoneNumberCountryCode: data.phoneNumberCountryCode,
      avatarUrl: data.companyLogo,
      companyName: data.companyName,
      orgType: data.orgType,
      mailingStreetName: data.mailingAddress.addressLine,
      mailingCountryName: data.mailingAddress.country,
      mailingCityName: data.mailingAddress.city,
      mailingStateName: data.mailingAddress.state,
      mailingZip: data.mailingAddress.postCode,
      billingStreetName: data.billingAddress.addressLine,
      billingCountryName: data.billingAddress.country,
      billingCityName: data.billingAddress.city,
      billingStateName: data.billingAddress.state,
      billingZip: data.billingAddress.postCode,
      isMailAndBillAddressSame: false,
      companytwoFactorEnabled: data.companytwoFactorEnabled,
      userCloudIntegration: data.userCloudIntegration,
      userCloudIntegrationMob: data.userCloudIntegrationMob,
      Dropbox: data.Dropbox,
      Dropbox_M: data.Dropbox_M,
      GoogleDrive: data.GoogleDrive,
      GoogleDrive_M: data.GoogleDrive_M,
      OneDrive: data.OneDrive,
      OneDrive_M: data.OneDrive_M,
      Slack: data.Slack,
      Slack_M: data.Slack_M,
      Wordpress: data.Wordpress,
      Wordpress_M: data.Wordpress_M,
      userId: data.id
    }
    setOrgDetail(orgDetail)
    setShowOrgUpdateDialog(true)
  }

  const editProfile = (data: any) => {
    const userDetail = {
      userId: data.id,
      mobileNumber: data.mobileNumber,
      avatarUrl: data.avatarUrl,
      companyId: data.company?.id || null,
      email: data.email,
      mobileCountryCode: data.mobileCountryCode,
      firstname: data.firstname,
      lastname: data.lastname,
      twoFactorEnabled: data.twoFactorEnabled,
      accountBlocked: data.accountBlocked,
      role: data.role,
      userCloudIntegration: data.userCloudIntegration,
      userCloudIntegrationMob: data.userCloudIntegrationMob,
      Dropbox: data.Dropbox,
      Dropbox_M: data.Dropbox_M,
      GoogleDrive: data.GoogleDrive,
      GoogleDrive_M: data.GoogleDrive_M,
      OneDrive: data.OneDrive,
      OneDrive_M: data.OneDrive_M,
      Slack: data.Slack,
      Slack_M: data.Slack_M,
      Wordpress: data.Wordpress,
      Wordpress_M: data.Wordpress_M,
    }
    setUserDetail(userDetail)
    setShowUserUpdateDialog(true)
  }

  const deleteUser = (data: any) => {
    setIsDeleteUser(true)
    setDeleteId(data.id)
    setDeleteUserDetail(data)
    setIsCompanyAccount(false)
  }

  const [isCompanyAccount, setIsCompanyAccount] = useState(false)

  const deleteTeamAccount = (data: any) => {
    setIsCompanyAccount(true)
    setIsDeleteUser(true)
    setDeleteId(data.companyId)
    setDeleteUserDetail(data)
  }

  const navigateToStatistics = (stateData: {
    companyId?: string;
    userId?: string;
    companyName?: string;
    userName?: string;
    data?: string;
  }) => {
    navigate('/admin/statistics', { state: stateData });
  };

  const navigateToUsers = (stateData: {
    companyId?: string;
    userId?: string;
    companyName?: string;
    data?: string;
  }) => {
    navigate('/admin/users', { state: stateData });
  };

  const createFetchNextDataHandler = (page: number) => {
    return () => fetchNextData(page);
  };

  interface AccountData {
    id: number;
    avatarUrl: string;
    firstname: string;
    lastname: string;
    email: string;
    companyId: number;
    companyLogo: string;
    companyName: string;
    accountType: string;
    roleDetails: string;
  }

  const createDeleteTeamAccountHandler = (teamData: AccountData) => {
    return () => deleteTeamAccount(teamData);
  };

  const createDeleteUserHandler = (userData: AccountData) => {
    return () => deleteUser(userData);
  };

  const createNavigateHandler = (info: {
    companyId?: string;
    userId?: string;
    companyName?: string;
    userName?: string;
    data?: string;
  }) => {
    return () => navigateToStatistics(info);
  };

  const createEditProfileHandler = (profileData: AccountData) => {
    return () => editProfile(profileData);
  };

  const createNavigateToUsersHandler = (info: {
    companyId?: string;
    userId?: string;
    companyName?: string;
    data?: string;
  }) => {
    return () => navigateToUsers(info);
  };

  const handleEditOrg = (org: AccountData) => () => {
    editOrg(org);
  };

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
      {!loading ? (
        <KTCard>
            {showOrgUpdateDialog && (
              <EditSuperOrg
                showOrgUpdateDialog={showOrgUpdateDialog}
                setShowOrgUpdateDialog={setShowOrgUpdateDialog}
                orgDetail={orgDetail}
                setOrgDetail={setOrgDetail}
              />
            )}
            {showUserUpdateDialog && (
              <EditUser
                showUserUpdateDialog={showUserUpdateDialog}
                setShowUserUpdateDialog={setShowUserUpdateDialog}
                userDetail={userDetail}
                setDeleteUserDetail={setDeleteUserDetail}
              />
            )}
            {isDeleteUser && (
              <>
              <SuperDeleteModal
                show={isDeleteUser}
                handleClose={handleClose}
                id={deleteId}
                deleteUserDetail={deleteUserDetail}
                setSuccessResMessage={setSuccessResMessage}
                setFailureResMessage={setFailureResMessage}
                successResMessage={successResMessage}
                failureResMessage={failureResMessage}
                checked={checked}
                setChecked={setChecked}
                isCompanyAccount={isCompanyAccount}
              />
              </>
            )}
          <div className='card-header border-0 pt-6'>
            <div className='card-title'>
              <div className='user-manager-header'>
                <div className='d-flex align-items-center position-relative my-1'>
                  <KTIcon iconName='magnifier' className='fs-1 position-absolute ms-6' />
                  <input
                    type='text'
                    data-kt-user-table-filter='search'
                    className='form-control form-control-solid w-250px ps-14'
                    placeholder={intl.formatMessage({ id: "SUPERADMIN.SEARCH_CLIENTS" })} 
                    value={searchString}
                    onChange={handleSearchBarChange}
                  />
                </div>
              </div>
            </div>
            <div className='card-title d-flex justify-content-end align-items-center'>
              <select
                className='form-control form-control-lg form-control-solid'
                style={{ appearance: 'auto' }}
                onChange={handleStatusFilterChange}
              >
                <option value='all'><FormattedMessage id="SUPERADMIN.ALL" /></option>
                <option value='1'><FormattedMessage id="SUPERADMIN.ACTIVE" /></option>
                <option value='0'><FormattedMessage id="SUPERADMIN.INACTIVE" /></option>
              </select>
            </div>
          </div>

          <div id="clients-table" className="card" style={{ overflowX: 'auto' }}>
            <div className="card-body">
              <table className="table mb-10 align-middle table-row-dashed fs-6 gy-5 px-3" id="kt_table_users">
                <thead className="pe-5">
                  <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">

                    <th className="min-w-50px"><FormattedMessage id="DOCUMENT.TABLE.NAME" /></th>
                    <th className="min-w-50px"><FormattedMessage id="SUPERADMIN.PLAN" /></th>
                    <th className="min-w-50px"><FormattedMessage id="TEAM.STATUS" /></th>
                    <th className="text-start min-w-50px"><FormattedMessage id="SUPERADMIN.JOIN_DATE" /></th>
                    <th className="text-start min-w-50px"><FormattedMessage id="SUPERADMIN.DEACTIVATED_DATE" /></th>
                    <th className='min-w-100px text-end'><FormattedMessage id='TEAM.ACTIONS' /></th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 fw-bold">
                    {currentItems?.map((data: any) => (
                        <tr key={data?.user.id}>
                          <td className="text-gray-800 text-start">
                            {data?.user?.accountType == 'solo' ? (
                              <div className='d-flex align-items-center'>
                                <div className='symbol symbol-circle symbol-50px overflow-hidden me-3'>
                                  <span>
                                    {data?.user?.avatarUrl ? (
                                      <div className='symbol-label'>
                                        <img src={data?.user?.avatarUrl} alt={data?.user?.firstname} className='w-100' />
                                      </div>
                                    ) : (
                                      <div
                                        className={clsx(
                                          'symbol-label fs-3',
                                          'bg-light-red text-dark'
                                        )}
                                      >
                                        {data?.user?.firstname[0]}
                                      </div>
                                    )}
                                  </span>
                                </div>
                                <div className='d-flex flex-column'>
                                  <span className='text-gray-800 text-hoverprimary mb-1'>
                                    {data?.user?.firstname}{" "}{data?.user?.lastname}
                                  </span>
                                  <span>{data?.user?.email}</span>
                                </div>
                              </div>
                            ) : (
                              <div className='d-flex align-items-center'>
                                <div className='symbol symbol-circle symbol-50px overflow-hidden me-3'>
                                  <span>
                                    {data?.user?.company?.companyLogo ? (
                                      <div className='symbol-label'>
                                        <img src={data?.user?.companyLogo} alt={data?.user?.companyName} className='w-100' />
                                      </div>
                                    ) : (
                                      <div
                                        className={clsx(
                                          'symbol-label fs-3',
                                          'bg-light-red text-dark'
                                        )}
                                      >
                                        {data?.company?.companyName[0]}
                                      </div>
                                    )}
                                  </span>
                                </div>
                                <div className='d-flex flex-column'>
                                  <span className='text-gray-800 text-hoverprimary mb-1'>
                                    {data?.company?.companyName}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="text-gray-800 text-start text-capitalize">
                            {data?.user?.accountType}
                          </td>
                          <td className="text-gray-800 text-start text-capitalize">
                            {data[0].payment_status == 1 ? 'Active' : 'Inactive'}
                          </td>
                          <td className="text-gray-800 text-start">{`${formatDateTime(data?.user?.created)}`}</td>
                          <td className="text-gray-800 text-start">
                            {data[0]?.user?.deactivated ? ( formatDateTime(data[0]?.user?.deactivated) == "Invalid Date" ? "-" : formatDateTime(data[0]?.user?.deactivated) ) : "-"}
                          </td>
                          <td>
                            <div className='d-flex justify-content-end flex-shrink-0'>
                              {data?.user?.accountType == 'team' && (
                                <>
                                <span
                                 className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1'
                                 onClick={handleEditOrg(data?.company)}
                                 data-bs-toggle="tooltip"
                                 title="Edit"
                                >
                                 <KTIcon iconName='pencil' className='fs-3 text-dark' />
                                </span>
                                <span
                                  className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1'
                                  onClick={createNavigateToUsersHandler({
                                    companyId: data?.company?.companyId,
                                    userId: data?.user?.id,
                                    companyName: data?.company?.companyName,
                                    data: data?.company?.orgType,
                                  })}
                                  data-bs-toggle="tooltip"
                                  title="Users"
                                >
                                  <KTIcon iconName='profile-user' className='fs-3 text-dark' />
                                </span>
                                
                                </>
                              )}
                              {data?.user?.accountType == 'solo' && (
                                <>
                                <span
                                 className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1'
                                 onClick={createEditProfileHandler(data?.user)}
                                 data-bs-toggle="tooltip"
                                 title="Edit"
                                >
                                 <KTIcon iconName='pencil' className='fs-3 text-dark' />
                                </span>
                                </>
                              )}
                              <span
                                className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                                onClick={createNavigateHandler({
                                  companyId: data?.company?.companyId,
                                  userId: data?.user?.id,
                                  companyName: data?.company?.companyName,
                                  userName: data?.user.firstname,
                                  data: data?.user?.accountType,
                                })}
                                data-bs-toggle="tooltip"
                                title="Statistics"
                              >
                                <KTIcon iconName='chart-simple-3' className='fs-3 text-dark' />
                              </span>
                              {data?.user?.accountType == 'solo' && appData.isDeleteAccount && (
                                <>
                                <span
                                 className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1'
                                 onClick={createDeleteUserHandler(data?.user)}
                                 data-bs-toggle="tooltip"
                                 title="Delete"
                                >
                                 <KTIcon iconName='trash' className='fs-3 text-dark' />
                                </span>
                                </>
                              )}
                              {data?.user?.accountType == 'team' && appData.isDeleteAccount && (
                                <>
                                <span
                                 className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1'
                                 onClick={createDeleteTeamAccountHandler(data?.user)}
                                 data-bs-toggle="tooltip"
                                 title="Delete team account"
                                >
                                 <KTIcon iconName='trash' className='fs-3 text-dark' />
                                </span>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {noOfRecords > 0 &&
            <div className='px-15 user-pagination mt-5 mb-5'>
              <div className='row user-numb'>
                <div className='d-flex'>
                  <span className='fs-6'>{currentItems.length == 0 ? "0" : ((selectedPage - 1) * limit) + 1 }</span>
                  <span className='fs-6'>{'-'}</span>
                  <span className='fs-6'>{currentItems.length}</span>
                  <span className='fs-6 ms-2'>of</span>
                  <span className='fs-6 ms-2'>{noOfRecords}</span>
                  <span className='fs-6 ms-1'>clients</span>
                </div>
              </div>

              {totNumOfPage > 1 &&
                <div className='row'>
                  <div className='d-flex'>
                    {currentPage > 1 &&
                      <button
                        style={{
                          border: '#0000',
                          background: '#009ef7',
                          borderRadius: '5px',
                          color: '#fff',
                          height: '30px',
                          fontSize: '15px'
                        }}
                        onClick={createFetchNextDataHandler(parseInt(selectedPage) - 1)}
                        disabled={selectedPage === 1}
                      >
                        Prev
                      </button>
                    }
                    <div className='d-flex my-auto'>
                      <div className='ms-4 d-flex flex-column'>
                        <input
                          type="text"
                          style={{ width: '40px', height: '28px', borderColor: '#0000', textAlign: 'center' }}
                          placeholder={selectedPage}
                          onChange={handleChange}
                          disabled={noOfRecords <= 1}
                        />
                      </div>

                      <span style={{ marginTop: '5px' }} className='ms-2 me-3'>Of</span>
                      <span style={{ marginTop: '5px' }} className='ms-1 me-4'>{totNumOfPage}</span>
                    </div>
                    {currentPage < noOfRecords &&
                      <button
                        style={{
                          border: '#0000',
                          background: '#009ef7',
                          borderRadius: '5px',
                          color: '#fff',
                          height: '30px',
                          fontSize: '15px'
                        }}
                        onClick={createFetchNextDataHandler(parseInt(selectedPage) + 1)}
                        disabled={selectedPage === totNumOfPage}
                      >
                        Next
                      </button>
                    }

                    {noOfRecords > 1 &&
                      <button
                        className='ms-4'
                        style={{
                          border: '#0000',
                          background: '#009ef7',
                          borderRadius: '5px',
                          color: '#fff',
                          height: '30px',
                          fontSize: '15px'
                        }}
                        onClick={createFetchNextDataHandler(selectedPage)}
                      >
                        Go to
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </KTCard>
      ) : (
        <div className='d-flex justify-content-center mx-auto my-auto'>
          <div className='w-50px h-50px'>
            <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
          </div>
        </div>
      )}
    </>
  )
}

export { Clients }