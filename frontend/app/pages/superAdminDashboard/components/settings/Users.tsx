import { KTCard, KTIcon } from '../../../../../app/theme/helpers'
import { toAbsoluteUrl } from '../../../../theme/helpers'
import { useEffect, useState } from 'react'
import { getClientUsers, removeUser } from '../../api'
import { useLocation, useNavigate } from 'react-router-dom'
import { FormattedMessage, useIntl } from 'react-intl'
import clsx from 'clsx'
import { UserUpdate } from './UserUpdate'
import { AlertDanger, AlertSuccess } from '../../../../modules/alerts/Alerts'

const roleToIdMap: any = {
  '1': 'Administrator',
  '2': 'Standard',
  '3': 'View Only'
}

const Users = () => {
  const { state }: any = useLocation()
  const navigate = useNavigate()
  const [clientList, setClientList] = useState<any>([])
  const [filteredClients, setFilteredClients] = useState<any>([]);
  const [showUserUpdateDialog, setShowUserUpdateDialog] = useState(false)
  const [userDetail, setUserDetail] = useState<any>(null)
  const [userId, setUserId] = useState<any>(null)
  const [searchString, setSearchString] = useState('');
  const [currentItems, setCurrentItems] = useState([]);
  const [limit] = useState<number>(10);
  const [selectedPage, setSelectedPage] = useState<any>(1);
  const [currentPage, setCurrentPage] = useState<any>(1);
  const [totNumOfPage, setTotNumOfPage] = useState<any>(0);
  const [noOfRecords, setNoOfRecords] = useState<any>(0);
  const [processing, setProcessing] = useState(false);
  const [userID, setUserID] = useState<any>(null);
  const [userRole, setUserRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [checked, setChecked] = useState<boolean>(false)
  const [companyId, setCompanyId] = useState<string>('')
  const intl = useIntl();

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCompanyId(state?.companyId)
        const data: any = await getClientUsers(state?.companyId);
        setClientList(data?.data?.userDetails);
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filteredClientList = clientList?.filter((client: any) => client?.roleDetails?.role != 4);
    setFilteredClients(filteredClientList);
    const totalRecords = filteredClientList?.length;
    const totalPages = Math.ceil(totalRecords / limit);
    setNoOfRecords(totalRecords);
    setTotNumOfPage(totalPages);
    const pageNo = localStorage.getItem('page-number-users');
    if (pageNo) {
      setSelectedPage(pageNo);
      setCurrentPage(pageNo);
      const startIndex = (parseInt(pageNo) - 1) * limit;
      const endIndex = startIndex + limit;
      setCurrentItems(filteredClientList?.slice(startIndex, endIndex));
    } else {
      setCurrentItems(filteredClientList?.slice(0, limit));
    }
  }, [clientList]);

  const handleSearchBarChange = (e: any) => {
    const value = e.target.value;
    setSearchString(value);

    if (value.length >= 3) {
      filterClients(value);
    } else {
      setFilteredClients(filteredClients);
      const startIndex = (selectedPage - 1) * limit;
      const endIndex = startIndex + limit;
      setCurrentItems(filteredClients?.slice(startIndex, endIndex));
    }
  };

  const filterClients = (searchValue: any) => {
    const searchValueLowerCase = searchValue.toLowerCase();
    const filteredClient = filteredClients?.filter((client: any) => {
      return `${client?.firstname} ${client?.lastname} ${client?.email}`.toLowerCase().includes(searchValueLowerCase);
    });
    setCurrentItems(filteredClient);
  };

  const fetchNextData = (page: any) => {
    setSelectedPage(page);
    setCurrentPage(page);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    localStorage.setItem('page-number-users', page);
    const currentItems = filteredClients?.slice(startIndex, endIndex);
    setCurrentItems(currentItems);
  };

  const handleChange = (event: any) => {
    let value = event.target.value;
    value = parseInt(value) > 0 ? parseInt(value) : 1;
    value = value > totNumOfPage ? totNumOfPage : value;
    setSelectedPage(value);
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

  const editUser = (data: any) => {
    setUserId(data?.id);
    setUserDetail(data)
    setShowUserUpdateDialog(true)
  }

  const openDialogForUserDeletion = (id: string) => {
    const element: HTMLElement = document.getElementById(id)!
    element.style.display = 'block'
  }

  const closeDialogForUserDeletion = (id: string) => {
    const element: HTMLElement = document.getElementById(id)!
    element.style.display = 'none'
  }

  const handleDelete = (id: any) => {
    setUserID(id?.id)
    setUserRole(id?.userRole)
    openDialogForUserDeletion(`delete-user-permanent-${userID}`)
  }

  const deleteUser = () => {
    setProcessing(true)
    removeUser(
      userID
    )
      .then((response) => {
        if (response.data.success) {
          setSuccessMessage(response.data.message)
          setChecked(true)
          window.location.reload()
        } else {
          setErrorMessage(response.data.message)
          setChecked(true)
        }
      })
      .catch(() => {
        setErrorMessage('Failed to delete User.')
        setChecked(true)
      })
      .finally(() => {
        window.location.reload()
        closeDialogForUserDeletion(`delete-user-permanent-${userID}`)
        setProcessing(false)
      })
  }

  const handleCloseClick = (id: string) => () => {
    closeDialogForUserDeletion(id);
  };

  const handleFetchNextData = () => {
    fetchNextData(selectedPage);
  };

  const handleNextPageClick = () => {
    fetchNextData(parseInt(selectedPage) + 1);
  };

  const handlePrevPageClick = () => {
    fetchNextData(selectedPage - 1);
  };

  type UserDeletePayload = {
    id: string | number;
    userRole: string;
  };

  const createDeleteClickHandler = (item: UserDeletePayload) => () => {
    handleDelete(item);
  };

  const createDeleteKeyDownHandler = (item: UserDeletePayload) =>
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleDelete(item);
      }
  };

  const createEditClickHandler = (user: { id: string | number }) => () => {
    editUser(user);
  };

  const createEditKeyDownHandler = (user: { id: string | number }) =>
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        editUser(user);
      }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleBackKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      navigate(-1);
    }
  };

  return (
    <>
      {successMessage !== "" ? (
        <AlertSuccess message={successMessage} checked={checked} />
      ) : null}

      {errorMessage !== "" ? (
        <AlertDanger message={errorMessage} checked={checked} />
      ) : null}

      {!loading ? (
        <KTCard>
          <div className='card-header d-flex justify-content-between align-items-center'>
            <div className='card-title'>
              <div className='fw-bolder fs-1'>
                {state?.companyName}'s Users
              </div>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="card-title cursor-pointer"
              onClick={handleBackClick}
              onKeyDown={handleBackKeyDown}
              data-bs-toggle="tooltip"
              title="Close"
            >
              <KTIcon iconName="cross" className="fs-1" />
            </div>
          </div>

          <div className='card-header border-0'>
            <div className='card-title'>
              <div className='user-manager-header'>
                <div className='d-flex align-items-center position-relative my-1'>
                  <KTIcon iconName='magnifier' className='fs-1 position-absolute ms-6' />
                  <input
                    type="text"
                    data-kt-user-table-filter="search"
                    className="form-control form-control-solid w-250px ps-14"
                    placeholder={intl.formatMessage({ id: 'COMPANY.SEARCH_USERS' })}
                    value={searchString}
                    onChange={handleSearchBarChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {currentItems?.length > 0 ? (
            <div id="clients-table" className="card" style={{ overflowX: 'auto' }}>
              <div className="card-body">
                <table className="table mb-10 align-middle table-row-dashed fs-6 gy-5 px-3" id="kt_table_users">
                  <thead className="pe-5">
                    <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">

                      <th className="min-w-50px">Name</th>
                      <th className="min-w-50px">Role</th>
                      <th className="text-start min-w-50px">Joined Date</th>
                      <th className='min-w-100px text-end'><FormattedMessage id='TEAM.ACTIONS' /></th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 fw-bold">
                      {currentItems?.map((data: any) => (
                          <tr key={data?.id}>
                            <td className="text-gray-800 text-start">
                              <div className='d-flex align-items-center'>
                                <div className='symbol symbol-circle symbol-50px overflow-hidden me-3'>
                                  <span>
                                    {data?.avatarUrl ? (
                                      <div className='symbol-label'>
                                        <img src={data?.avatarUrl} alt={data?.firstname} className='w-100' />
                                      </div>
                                    ) : (
                                      <div
                                        className={clsx(
                                          'symbol-label fs-3',
                                          'bg-light-red text-dark'
                                        )}
                                      >
                                        {data?.firstname[0]}
                                      </div>
                                    )}
                                  </span>
                                </div>
                                <div className='d-flex flex-column'>
                                  <span className='text-gray-800 text-hoverprimary mb-1'>
                                    {data?.firstname}{" "}{data?.lastname}
                                  </span>
                                  <span>{data?.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="text-gray-800 text-start text-capitalize">
                              {roleToIdMap[data?.userRole?.toString()]}
                            </td>
                            <td className="text-gray-800 text-start">{`${formatDateTime(data?.created)}`}</td>
                            <td>
                              <div className='d-flex justify-content-end flex-shrink-0'>
                              <span
                                role="button"
                                tabIndex={0}
                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1"
                                onClick={createEditClickHandler(data)}
                                onKeyDown={createEditKeyDownHandler(data)}
                                data-bs-toggle="tooltip"
                                title="Edit"
                              >
                                <KTIcon iconName="pencil" className="fs-3 text-dark" />
                              </span>

                                {filteredClients?.length !== 1 && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className="btn btn-icon btn-bg-light btn-active-color-danger btn-sm me-1"
                                    onClick={createDeleteClickHandler(data)}
                                    onKeyDown={createDeleteKeyDownHandler(data)}
                                    data-bs-toggle="tooltip"
                                    title="Delete"
                                  >
                                    <KTIcon iconName="trash" className="fs-3 text-dark" />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div id="clients-table" className="card" style={{ overflowX: 'auto' }}>
              <div className="card-body">
                <span className="text-gray-800 text-start">No Users</span>
              </div>
            </div>
          )}

          {noOfRecords > 0 &&
            <div className='px-15 user-pagination mt-5 mb-5'>
              <div className='row user-numb'>
                <div className='d-flex'>
                  <span className='fs-6'>{currentItems.length == 0 ? "0" : ((selectedPage - 1) * limit) + 1 }</span>
                  <span className='fs-6'>{'-'}</span>
                  <span className='fs-6'>{currentItems.length}</span>
                  <span className='fs-6 ms-2'>of</span>
                  <span className='fs-6 ms-2'>{noOfRecords}</span>
                  <span className='fs-6 ms-1'>users</span>
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
                        onClick={handlePrevPageClick}
                        disabled={selectedPage === 1}
                      >
                        Prev
                      </button>
                    }
                    <div className='d-flex my-auto'>
                      <div className='ms-4 d-flex flex-column'>
                        <input
                          type="text"
                          style={{
                            width: '40px',
                            height: '28px',
                            borderColor: '#0000',
                            textAlign: 'center'
                          }}
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
                        onClick={handleNextPageClick}
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
                        onClick={handleFetchNextData}
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

      <div id={`delete-user-permanent-${userID}`} style={{ display: 'none' }} className="modal">
        <button
          type="button"
          className="close"
          aria-label="Close"
           onClick={handleCloseClick(`delete-user-permanent-${userID}`)}
        >
          <span aria-hidden="true">&times;</span>
        </button>
        <form className="modal-content">
          <div className="px-7 py-7">
            <h3>
              <FormattedMessage id="INVITATION.DELETE.ACCOUNT" />
            </h3>
            <p className='font-size-15'>
              <FormattedMessage id="INVITATION.DELETE.ACCOUNT_CONFIRM" /> 
            </p>

            <div className="d-flex">
              <button onClick={() => closeDialogForUserDeletion(`delete-user-permanent-${userID}`)} type="button" className="btn btn-primary">
                <FormattedMessage id="BUTTON.CANCEL" /> 
              </button>
              <button
                onClick={deleteUser}
                type="button"
                className="btn btn-danger ms-3"
              >
                <FormattedMessage id="BUTTON.DELETE" />   
                {processing && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showUserUpdateDialog && (
        <UserUpdate
          userID={userId}
          showUserUpdateDialog={showUserUpdateDialog}
          setShowUserUpdateDialog={setShowUserUpdateDialog}
          userDetail={userDetail}
          setUserDetail={setUserDetail}
          companyId={companyId}
        />
      )}
    </>
  )
}

export { Users }